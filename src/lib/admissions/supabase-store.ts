/**
 * Supabase-backed admissions store.
 *
 * Reads/writes `applications`, `application_status_history` (0004) and
 * `admissions_audit_log`, `site_admissions_settings` (0010). RLS is defence in
 * depth: every query here is also tenant-filtered explicitly so a policy gap
 * cannot silently widen access.
 *
 * NOTE: this adapter is not exercised by CI — no Supabase instance runs in the
 * test environment. The local store implements the same contract and is what
 * the tests and E2E cover. See docs/architecture/ADMISSIONS_SERVER_FLOW.md.
 */

import { createClient } from "@/lib/supabase/server";
import {
  listMembershipsByUser as listStaffMembershipsByUser,
  listMembershipsBySite,
} from "@/lib/security/supabase-store";
import { internalUnclaimedApplicationEmail, sendEmail } from "@/lib/email/mailer";
import type {
  AdmissionApplicationRecord,
  AdmissionDetail,
  AdmissionResult,
  AdmissionStatus,
  AdmissionSubmitInput,
  InternalNoteRecord,
  ResidenceSite,
  StaffMembership,
} from "@/lib/admissions/types";

type Row = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function payloadOf(row: Row): Row {
  const raw = row.admissions_payload;
  return raw && typeof raw === "object" ? (raw as Row) : {};
}

function rowToRecord(row: Row): AdmissionApplicationRecord {
  const payload = payloadOf(row);
  const senior = (payload.senior as Row) ?? {};
  const contact = (payload.familyContact as Row) ?? {};
  return {
    id: str(row.id),
    familyUserId: str(row.family_id),
    familyEmail: str(payload.familyEmail),
    siteId: str(row.community_id),
    siteName: str(payload.siteName),
    clientRequestId: str(row.client_request_id),
    publicRef: (payload.publicRef as string | null) ?? null,
    personRef: (payload.personRef as string | null) ?? null,
    dossierRef: (payload.dossierRef as string | null) ?? null,
    status: str(row.status, "draft") as AdmissionStatus,
    senior: {
      name: str(senior.name),
      age: typeof senior.age === "number" ? senior.age : null,
      relationship: str(senior.relationship),
      photoUrl: (senior.photoUrl as string | null) ?? null,
    },
    summary: str(payload.summary),
    careNeeds: strList(payload.careNeeds),
    medicalHighlights: strList(payload.medicalHighlights),
    documents: Array.isArray(payload.documents)
      ? (payload.documents as AdmissionApplicationRecord["documents"])
      : [],
    familyContact: {
      name: str(contact.name),
      email: str(contact.email),
      phone: str(contact.phone),
      relationship: str(contact.relationship),
    },
    dossierSnapshot: (payload.dossierSnapshot as AdmissionApplicationRecord["dossierSnapshot"]) ?? null,
    dossier: (payload.dossier as Record<string, unknown> | null) ?? null,
    desiredMoveIn: (row.desired_move_in as string | null) ?? null,
    waitlistPosition:
      typeof payload.waitlistPosition === "number" ? payload.waitlistPosition : null,
    decision: (payload.decision as AdmissionApplicationRecord["decision"]) ?? null,
    isSeed: Boolean(row.is_seed),
    createdAt: str(row.created_at),
    submittedAt: (row.submitted_at as string | null) ?? null,
    updatedAt: str(row.updated_at),
  };
}

function payloadFromInput(input: AdmissionSubmitInput, familyEmail: string, siteName: string) {
  return {
    familyEmail: familyEmail.toLowerCase(),
    siteName,
    publicRef: input.publicRef ?? null,
    personRef: input.personRef ?? null,
    dossierRef: input.dossierRef ?? null,
    senior: {
      name: input.senior?.name ?? "",
      age: input.senior?.age ?? null,
      relationship: input.senior?.relationship ?? "",
      photoUrl: input.senior?.photoUrl ?? null,
    },
    summary: input.summary ?? "",
    careNeeds: input.careNeeds ?? [],
    medicalHighlights: input.medicalHighlights ?? [],
    documents: input.documents ?? [],
    familyContact: {
      name: input.familyContact?.name ?? "",
      email: (input.familyContact?.email ?? familyEmail).toLowerCase(),
      phone: input.familyContact?.phone ?? "",
      relationship: input.familyContact?.relationship ?? "",
    },
    dossierSnapshot: input.dossierSnapshot ?? null,
    dossier: input.dossier ?? null,
    waitlistPosition: null,
    decision: null,
  };
}

async function sb() {
  return createClient();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every real communities.id is a Postgres-generated UUID; an id from an
 * outside registry (e.g. the Québec RPA "rpa-1428") never is. Used to pick
 * which column getSite() resolves against, so an existing client site keeps
 * resolving by id exactly as before.
 */
function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getSite(siteId: string): Promise<ResidenceSite | null> {
  const client = await sb();
  const lookupColumn = looksLikeUuid(siteId) ? "id" : "external_ref";
  const { data } = await client
    .from("communities")
    .select("id, name, status, deleted_at, organization_id, external_ref")
    .eq(lookupColumn, siteId)
    .maybeSingle();
  if (!data) return null;

  const row = data as Row;

  const { data: settings } = await client
    .from("site_admissions_settings")
    .select("is_active")
    .eq("community_id", str(row.id))
    .maybeSingle();

  // "verified" is the deployed community_status value meaning the listing is
  // real/published (there is no "active" value on this enum — see
  // claude/audit-etat-supabase-phase-b-2026-09-10.md for the drift this fixes).
  // A "pending_review" community that also carries an external_ref is an
  // unclaimed residence imported from an outside registry (migration 0019 +
  // scripts/import-rpa-communities.mjs) — not a verified HavenApply client,
  // so it stays out of public search results, but the whole point of
  // importing it is that it can still receive a dossier.
  const isImportedUnclaimed = row.status === "pending_review" && Boolean(row.external_ref);
  const active =
    (row.status === "verified" || isImportedUnclaimed) &&
    !row.deleted_at &&
    (settings?.is_active ?? true) !== false;
  return {
    id: str(row.id),
    name: str(row.name),
    isActive: Boolean(active),
    organizationId: str(row.organization_id) || undefined,
  };
}

export async function listMembershipsForUser(userId: string): Promise<StaffMembership[]> {
  // staff_memberships (migration 0011) is the source of truth for staff
  // access, not community_team_members (0003): its roles (admin / manager /
  // coordinator / readonly) match StaffMembershipRole exactly. The query
  // itself lives in security/supabase-store.ts, shared with
  // security/guards.ts#requireStaff() so there is exactly one place that
  // reads it. community_team_members remains readable (RLS helpers OR both
  // together) but should not gain new writers.
  const memberships = await listStaffMembershipsByUser(userId);
  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.email,
    siteId: m.siteId,
    role: m.role as StaffMembership["role"],
    status: m.status,
  }));
}

async function familyIdFor(userId: string): Promise<string | null> {
  const client = await sb();
  const { data } = await client
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? str((data as Row).family_id) : null;
}

export async function submitApplication(args: {
  familyUserId: string;
  familyEmail: string;
  input: AdmissionSubmitInput;
}): Promise<AdmissionResult<{ record: AdmissionApplicationRecord; created: boolean }>> {
  const site = await getSite(args.input.siteId);
  if (!site) return { ok: false, status: 409, error: "Unknown residence." };
  if (!site.isActive) {
    return { ok: false, status: 409, error: "This residence is not accepting applications." };
  }

  const familyId = await familyIdFor(args.familyUserId);
  if (!familyId) return { ok: false, status: 403, error: "No family record for this account." };

  // `applications.senior_id` is a required FK (also the arbiter of the
  // one-active-application-per-senior-per-community rule). The family side
  // already resolves this when building the submission.
  if (!args.input.seniorId) {
    return { ok: false, status: 400, error: "Missing senior profile." };
  }
  if (!site.organizationId) {
    return { ok: false, status: 500, error: "Residence is missing its organization." };
  }

  const client = await sb();

  // Idempotency: unique index (family_id, client_request_id).
  const { data: existing } = await client
    .from("applications")
    .select("*")
    .eq("family_id", familyId)
    .eq("client_request_id", args.input.clientRequestId)
    .maybeSingle();

  if (existing && str((existing as Row).status) !== "draft") {
    return { ok: true, data: { record: rowToRecord(existing as Row), created: false } };
  }

  const payload = payloadFromInput(args.input, args.familyEmail, site.name);
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("applications")
    .upsert(
      {
        ...(existing ? { id: (existing as Row).id } : {}),
        family_id: familyId,
        senior_id: args.input.seniorId,
        community_id: site.id,
        organization_id: site.organizationId,
        client_request_id: args.input.clientRequestId,
        status: "submitted",
        submitted_at: now,
        desired_move_in: args.input.desiredMoveIn ?? null,
        admissions_payload: payload,
        updated_at: now,
      },
      { onConflict: "family_id,client_request_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, error: error?.message || "Unable to submit application." };
  }

  const record = rowToRecord(data as Row);

  // `on_application_status_change` (0007) writes application_status_history.
  await client.from("admissions_audit_log").insert({
    application_id: record.id,
    actor_type: "family",
    actor_id: args.familyUserId,
    actor_label: args.familyEmail,
    action: "application.submitted",
    metadata: { siteId: record.siteId },
  });

  await notifyIfUnclaimed(client, record);

  return { ok: true, data: { record, created: true } };
}

/**
 * Alert HavenApply (not the residence — there's no one there to receive it
 * yet, and no staff account to send a secure link to) when a dossier lands
 * on a community with no active staff_memberships row — the RPA-imported,
 * unclaimed residences (migration 0019) are the common case today. Reuses
 * listMembershipsBySite() (security/supabase-store.ts), the same
 * per-site membership check requireStaff() uses, rather than duplicating it.
 * Best-effort: never blocks or fails the submission that already succeeded.
 */
async function notifyIfUnclaimed(
  client: Awaited<ReturnType<typeof sb>>,
  record: AdmissionApplicationRecord,
): Promise<void> {
  try {
    const staffed = await listMembershipsBySite(record.siteId);
    if (staffed.length > 0) return;

    const { data } = await client
      .from("communities")
      .select("address, city, state, zip")
      .eq("id", record.siteId)
      .maybeSingle();
    const row = (data ?? {}) as Row;
    const address = [str(row.address), str(row.city), str(row.state), str(row.zip)]
      .filter(Boolean)
      .join(", ");

    await sendEmail(
      internalUnclaimedApplicationEmail({
        residenceName: record.siteName,
        residenceAddress: address,
        familyName: record.familyContact.name,
        familyPhone: record.familyContact.phone,
        familyEmail: record.familyEmail,
        seniorName: record.senior.name,
        dossierSummary: record.summary,
      }),
    );
  } catch (err) {
    console.error("[admissions] unclaimed-residence notification failed:", err);
  }
}

export async function listForFamily(familyUserId: string): Promise<AdmissionApplicationRecord[]> {
  const familyId = await familyIdFor(familyUserId);
  if (!familyId) return [];
  const client = await sb();
  const { data } = await client
    .from("applications")
    .select("*")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => rowToRecord(row as Row));
}

export async function listForSites(siteIds: string[]): Promise<AdmissionApplicationRecord[]> {
  if (siteIds.length === 0) return [];
  const client = await sb();
  const { data } = await client
    .from("applications")
    .select("*")
    .in("community_id", siteIds)
    .neq("status", "draft")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });
  return (data ?? []).map((row) => rowToRecord(row as Row));
}

export async function getDetail(args: {
  applicationId: string;
  familyUserId?: string;
  siteIds?: string[];
}): Promise<AdmissionDetail | null> {
  const client = await sb();
  const { data } = await client
    .from("applications")
    .select("*")
    .eq("id", args.applicationId)
    .maybeSingle();
  if (!data) return null;

  const record = rowToRecord(data as Row);

  const familyId = args.familyUserId ? await familyIdFor(args.familyUserId) : null;
  const familyAllowed = familyId ? record.familyUserId === familyId : false;
  const staffAllowed = args.siteIds
    ? args.siteIds.includes(record.siteId) && record.status !== "draft"
    : false;
  if (!familyAllowed && !staffAllowed) return null;

  const [{ data: history }, { data: audit }] = await Promise.all([
    client
      .from("application_status_history")
      .select("*")
      .eq("application_id", record.id)
      .order("created_at", { ascending: true }),
    client
      .from("admissions_audit_log")
      .select("*")
      .eq("application_id", record.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    application: record,
    statusEvents: (history ?? []).map((row) => {
      const r = row as Row;
      return {
        id: str(r.id),
        applicationId: record.id,
        fromStatus: (r.from_status as AdmissionStatus | null) ?? null,
        toStatus: str(r.to_status, "submitted") as AdmissionStatus,
        actorType: "staff" as const,
        actorId: str(r.changed_by),
        note: (r.note as string | null) ?? null,
        at: str(r.created_at),
      };
    }),
    audit: (audit ?? []).map((row) => {
      const r = row as Row;
      return {
        id: str(r.id),
        applicationId: record.id,
        actorType: str(r.actor_type, "system") as "family" | "staff" | "system",
        actorId: str(r.actor_id),
        actorLabel: str(r.actor_label),
        action: str(r.action),
        metadata: (r.metadata as Record<string, unknown>) ?? {},
        at: str(r.created_at),
      };
    }),
  };
}

export async function changeStatus(args: {
  applicationId: string;
  siteIds: string[];
  toStatus: AdmissionStatus;
  note?: string | null;
  actorId: string;
  actorLabel: string;
  decisionKind?: string | null;
  waitlistPosition?: number | null;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  const client = await sb();
  const { data: current } = await client
    .from("applications")
    .select("*")
    .eq("id", args.applicationId)
    .in("community_id", args.siteIds)
    .neq("status", "draft")
    .maybeSingle();
  if (!current) return { ok: false, status: 404, error: "Application not found." };

  const record = rowToRecord(current as Row);
  const now = new Date().toISOString();
  const payload = {
    ...payloadOf(current as Row),
    waitlistPosition:
      args.waitlistPosition !== undefined ? args.waitlistPosition : record.waitlistPosition,
    decision: args.decisionKind
      ? { kind: args.decisionKind, note: args.note ?? null, at: now }
      : record.decision,
  };

  const { data, error } = await client
    .from("applications")
    .update({ status: args.toStatus, admissions_payload: payload, updated_at: now })
    .eq("id", args.applicationId)
    .in("community_id", args.siteIds)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, error: error?.message || "Unable to update status." };
  }

  await client.from("admissions_audit_log").insert({
    application_id: args.applicationId,
    actor_type: "staff",
    actor_id: args.actorId,
    actor_label: args.actorLabel,
    action: `status.${args.toStatus}`,
    metadata: { fromStatus: record.status, note: args.note ?? null },
  });

  return { ok: true, data: rowToRecord(data as Row) };
}

function noteFromRow(row: Row): InternalNoteRecord {
  const profile = (row.profiles ?? {}) as Row;
  const name = [str(profile.first_name), str(profile.last_name)].filter(Boolean).join(" ").trim();
  return {
    id: str(row.id),
    applicationId: str(row.application_id),
    authorId: str(row.author_id),
    authorName: name,
    body: str(row.body),
    createdAt: str(row.created_at),
  };
}

/**
 * Staff-only notes (application_internal_notes, migration 0024). RLS already
 * restricts both select and insert to staff of the application's site
 * (is_site_staff) — the siteIds check below is defence in depth, same
 * reasoning as changeStatus/getDetail in this file.
 */
export async function listInternalNotes(args: {
  applicationId: string;
  siteIds: string[];
}): Promise<AdmissionResult<InternalNoteRecord[]>> {
  const client = await sb();
  const { data: app } = await client
    .from("applications")
    .select("id")
    .eq("id", args.applicationId)
    .in("community_id", args.siteIds)
    .maybeSingle();
  if (!app) return { ok: false, status: 404, error: "Application not found." };

  const { data, error } = await client
    .from("application_internal_notes")
    .select("id, application_id, author_id, body, created_at, profiles(first_name, last_name)")
    .eq("application_id", args.applicationId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, data: (data ?? []).map((row) => noteFromRow(row as Row)) };
}

export async function addInternalNote(args: {
  applicationId: string;
  siteIds: string[];
  authorId: string;
  authorName: string;
  body: string;
}): Promise<AdmissionResult<InternalNoteRecord>> {
  const client = await sb();
  const { data: app } = await client
    .from("applications")
    .select("id")
    .eq("id", args.applicationId)
    .in("community_id", args.siteIds)
    .maybeSingle();
  if (!app) return { ok: false, status: 404, error: "Application not found." };

  const { data, error } = await client
    .from("application_internal_notes")
    .insert({ application_id: args.applicationId, author_id: args.authorId, body: args.body })
    .select("id, application_id, author_id, body, created_at")
    .single();
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Unable to save the note." };
  }
  // Echo the caller's own display name rather than round-tripping through
  // profiles again: addInternalNote's author is always the current actor.
  return { ok: true, data: { ...noteFromRow(data as Row), authorName: args.authorName } };
}

export async function withdraw(args: {
  applicationId: string;
  familyUserId: string;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  const familyId = await familyIdFor(args.familyUserId);
  if (!familyId) return { ok: false, status: 404, error: "Application not found." };

  const client = await sb();
  const { data, error } = await client
    .from("applications")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", args.applicationId)
    .eq("family_id", familyId)
    .select("*")
    .single();

  if (error || !data) return { ok: false, status: 404, error: "Application not found." };

  await client.from("admissions_audit_log").insert({
    application_id: args.applicationId,
    actor_type: "family",
    actor_id: args.familyUserId,
    actor_label: "",
    action: "application.withdrawn",
    metadata: {},
  });

  return { ok: true, data: rowToRecord(data as Row) };
}

export async function saveDraft(args: {
  familyUserId: string;
  familyEmail: string;
  input: AdmissionSubmitInput;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  const site = await getSite(args.input.siteId);
  if (!site) return { ok: false, status: 409, error: "Unknown residence." };

  const familyId = await familyIdFor(args.familyUserId);
  if (!familyId) return { ok: false, status: 403, error: "No family record for this account." };

  const client = await sb();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("applications")
    .upsert(
      {
        family_id: familyId,
        community_id: site.id,
        client_request_id: args.input.clientRequestId,
        status: "draft",
        desired_move_in: args.input.desiredMoveIn ?? null,
        admissions_payload: payloadFromInput(args.input, args.familyEmail, site.name),
        updated_at: now,
      },
      { onConflict: "family_id,client_request_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, error: error?.message || "Unable to save draft." };
  }
  return { ok: true, data: rowToRecord(data as Row) };
}
