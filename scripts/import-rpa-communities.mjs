/**
 * Import the Québec RPA public registry (data/rpa/quebec-residences.json,
 * 1328 residences, extracted 2025-12-31) as real `communities` rows —
 * unclaimed, not yet HavenApply clients, `status='pending_review'` so they
 * stay out of public find-senior-living/compare results (which only show
 * 'verified'), findable server-side via `external_ref` (the registry's own
 * "rpa-XXXX" id). All rows are attached to one generic "unclaimed" organization,
 * created idempotently by slug on first run.
 *
 * Only real registry fields are mapped (name, address, city, postal code,
 * phone, "QC" as state — every row is a Québec residence, not a guess).
 * No price, no photos, no description, no rating: not in the source data,
 * not invented, left null — same rule already applied in
 * src/lib/admissions/public-registry.ts.
 *
 * Idempotent: upserts on `external_ref`, safe to re-run.
 *
 * Requires migration 0012_communities_external_ref.sql applied first
 * (adds `communities.external_ref`).
 *
 * Usage:
 *   node scripts/import-rpa-communities.mjs --limit=10   # test subset
 *   node scripts/import-rpa-communities.mjs              # full 1328
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function loadEnv() {
  const raw = readFileSync(join(repoRoot, ".env.local"), "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      }),
  );
}

const UNCLAIMED_ORG_SLUG = "rpa-unclaimed";
const UNCLAIMED_ORG_NAME = "Résidences non réclamées (registre RPA)";
const BATCH_SIZE = 200;

async function ensureUnclaimedOrganization(admin) {
  const { data: existing, error: findErr } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", UNCLAIMED_ORG_SLUG)
    .maybeSingle();
  if (findErr) throw new Error(`lookup unclaimed org failed: ${findErr.message}`);
  if (existing) return existing.id;

  const { data: created, error: createErr } = await admin
    .from("organizations")
    .insert({ name: UNCLAIMED_ORG_NAME, slug: UNCLAIMED_ORG_SLUG, status: "draft" })
    .select("id")
    .single();
  if (createErr) throw new Error(`create unclaimed org failed: ${createErr.message}`);
  return created.id;
}

function mapRow(row, organizationId) {
  return {
    organization_id: organizationId,
    external_ref: row.id,
    name: row.name,
    slug: row.id,
    address: row.address || null,
    city: row.city || null,
    state: "QC",
    zip: row.postal || null,
    phone: row.phone || null,
    latitude: row.lat ?? null,
    longitude: row.lng ?? null,
    status: "pending_review",
    verified: false,
  };
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: schemaCheck } = await admin.from("communities").select("external_ref").limit(1);
  if (schemaCheck) {
    console.error(
      "communities.external_ref is missing — apply supabase/migrations/0012_communities_external_ref.sql first.",
    );
    console.error(schemaCheck.message);
    process.exit(1);
  }

  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

  const catalog = JSON.parse(readFileSync(join(repoRoot, "data/rpa/quebec-residences.json"), "utf8"));
  let rows = catalog.residences;
  if (limit) rows = rows.slice(0, limit);

  console.log(`Source: ${catalog.residences.length} residences (extracted ${catalog.extractedOn}).`);
  console.log(`Importing ${rows.length} row(s)${limit ? " (limited subset)" : ""}.`);

  const orgId = await ensureUnclaimedOrganization(admin);
  console.log("Unclaimed organization id:", orgId);

  const payloads = rows.map((r) => mapRow(r, orgId));

  let imported = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { data, error } = await admin
      .from("communities")
      .upsert(batch, { onConflict: "external_ref" })
      .select("id");
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      process.exit(1);
    }
    imported += data.length;
    console.log(`  upserted ${imported}/${payloads.length}`);
  }

  // Integrity checks. PostgREST caps an unpaginated select() at ~1000 rows
  // by default — count(head:true) and explicit .range() paging avoid that
  // trap instead of silently under-reporting past 1000 imported rows.
  const { count: totalUnderOrg, error: countErr } = await admin
    .from("communities")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (countErr) throw new Error(countErr.message);

  const refs = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("communities")
      .select("external_ref")
      .eq("organization_id", orgId)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    refs.push(...data.map((r) => r.external_ref));
    if (data.length < 1000) break;
  }
  const uniqueRefs = new Set(refs);

  console.log("\n--- Integrity ---");
  console.log("rows under unclaimed org (exact count):", totalUnderOrg);
  console.log("unique external_ref:", uniqueRefs.size, "(duplicates:", refs.length - uniqueRefs.size, ")");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
