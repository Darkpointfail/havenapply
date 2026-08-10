/**
 * Build slim CMS nursing-home catalog from Provider Information CSV.
 * Usage: node scripts/build-cms-nursing-homes.mjs
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "data/cms/NH_ProviderInfo_Jul2026.csv");
const outPath = join(root, "data/cms/nursing-homes.json");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function yes(v) {
  return String(v || "").trim().toUpperCase() === "Y";
}

function slugId(ccn) {
  return `cms-${String(ccn).trim()}`;
}

const rl = createInterface({
  input: createReadStream(csvPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let headers = null;
const rows = [];

for await (const line of rl) {
  if (!line.trim()) continue;
  const cols = parseCsvLine(line);
  if (!headers) {
    headers = cols;
    continue;
  }
  const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
  const ccn = String(row["CMS Certification Number (CCN)"] || "").trim();
  if (!ccn) continue;

  const lat = num(row.Latitude);
  const lng = num(row.Longitude);
  const rating = num(row["Overall Rating"]);
  const beds = num(row["Number of Certified Beds"]);
  const providerType = String(row["Provider Type"] || "").trim();

  rows.push({
    id: slugId(ccn),
    ccn,
    name: String(row["Provider Name"] || "").trim(),
    address: String(row["Provider Address"] || "").trim(),
    city: String(row["City/Town"] || "").trim(),
    state: String(row.State || "").trim(),
    zip: String(row["ZIP Code"] || "").trim(),
    phone: String(row["Telephone Number"] || "").trim(),
    county: String(row["County/Parish"] || "").trim(),
    ownership: String(row["Ownership Type"] || "").trim(),
    providerType,
    legalName: String(row["Legal Business Name"] || "").trim(),
    chainName: String(row["Chain Name"] || "").trim(),
    beds,
    avgResidents: num(row["Average Number of Residents per Day"]),
    lat,
    lng,
    overallRating: rating,
    healthRating: num(row["Health Inspection Rating"]),
    qmRating: num(row["QM Rating"]),
    staffingRating: num(row["Staffing Rating"]),
    ccrc: yes(row["Continuing Care Retirement Community"]),
    specialFocus: String(row["Special Focus Status"] || "").trim(),
    abuseIcon: yes(row["Abuse Icon"]),
    sprinklers: String(row["Automatic Sprinkler Systems in All Required Areas"] || "").trim(),
    fines: num(row["Number of Fines"]) || 0,
    fineAmount: num(row["Total Amount of Fines in Dollars"]) || 0,
    certifiedSince: String(
      row["Date First Approved to Provide Medicare and Medicaid Services"] || "",
    ).trim(),
  });
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
console.log(`Wrote ${rows.length} facilities → ${outPath}`);
