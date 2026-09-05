/**
 * Supabase-backed admissions store.
 *
 * Reads/writes `applications`, `application_status_history` (0004) and
 * `admissions_audit_log`, `site_admissions_settings` (0010). RLS is defence in
 * depth: every query here is also tenant-filtered explicitly so a policy gap
 * cannot silently widen access.
 *
 * The shape of every query here is checked against a real PostgreSQL schema by
 * tests/rls/supabase-parity.test.ts; the policies those queries run under are
 * exercised by tests/rls/rls-live.test.ts. Behaviour under PostgREST itself is
 * still covered by the local store, which implements the same contract.
 * See docs/architecture/ADMISSIONS_SERVER_FLOW.md.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  AdmissionApplicationRecord,
  AdmissionDetail,
  AdmissionResult,
  AdmissionStatus,
  AdmissionSubmitInput,
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
    waitlistPosition: null,
    decision: null,
  };
}

async function sb() {
  return createClient();
}

/**
 * A residence is open to applications when it is published and has not paused
 * intake. `verified` is the published state in `community_status`; there is no
 * `active` member in that enum.
 */
export async function getSite(siteId: string): Promise<ResidenceSite | null> {
  const client = await sb();
  const { data } = await client
    .from("communities")
    .select("id, name, status, deleted_at")
    .eq("id", siteId)
    .maybeSingle();
  if (!data) return null;

  const { data: settings } = await client
    .from("site_admissions_settings")
    .select("is_active")
    .eq("community_id", siteId)
    .maybeSingle();

  const row = data as Row;
  const active =
    row.status === "verified" && !row.deleted_at && (settings?.is_active ?? true) !== false;
  return { id: str(row.id), name: str(row.name), isActive: Boolean(active) };
}

/**
 * Site scope comes from `staff_memberships` (0011), the table whose roles match
 * the guards. The legacy `community_team_members` vocabulary (`org_admin`,
 * `admissions_manager`, …) does not, and reading it here would silently demote
 * every manager to a role the guards refuse.
 */
export async function listMembershipsForUser(userId: string): Promise<StaffMembership[]> {
  const client = await sb();
  const { data } = await client
    .from("staff_memberships")
    .select("id, user_id, community_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");
  return (data ?? [])
    .filter((row) => Boolean((row as Row).community_id))
    .map((row) => {
      const r = row as Row;
      return {
        id: str(r.id),
        userId: str(r.user_id),
        email: "",
        siteId: str(r.community_id),
        role: str(r.role, "readonly") as StaffMembership["role"],
        status: "active" as const,
      };
    });
}

async function familyIdFor(userId: string): Promise<string | null> {
  const client = await sb();
  const { data } = await client
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .eq("invitation_status", "accepted")
    .limit(1);
  const row = (data ?? [])[0] as Row | undefined;
  return row ? str(row.family_id) : null;
}

/** `applications.organization_id` is not null and must match the community. */
async function organizationIdFor(siteId: string): Promise<string | null> {
  const client = await sb();
  const { data } = await client
    .from("communities")
    .select("organization_id")
    .eq("id", siteId)
    .maybeSingle();
  return data ? str((data as Row).organization_id) : null;
}

/**
 * `applications.senior_id` is not null: the denormalized payload is a snapshot,
 * not a substitute for the record. Reuse the family's senior of that name when
 * there is one, otherwise open a minimal record.
 */
async function seniorIdFor(familyId: string, name: string): Promise<string | null> {
  const client = await sb();
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const { data: existing } = await client
    .from("seniors")
    .select("id, first_name, last_name")
    .eq("family_id", familyId);

  const match = (existing ?? []).find((row) => {
    const r = row as Row;
    return (
      `${str(r.first_name)} ${str(r.last_name)}`.trim().toLowerCase() ===
      name.trim().toLowerCase()
    );
  });
  if (match) return str((match as Row).id);

  const { data: created } = await client
    .from("seniors")
    .insert({ family_id: familyId, first_name: firstName ?? "", last_name: lastName })
    .select("id")
    .single();
  return created ? str((created as Row).id) : null;
}

/**
 * The audit trail has no insert policy on purpose. `record_admissions_event`
 * (0010) is the only way in: it is security definer, it re-checks that the
 * caller may read the application and it takes the actor from the session.
 */
async function recordEvent(args: {
  applicationId: string;
  actorType: "family" | "staff" | "system";
  actorLabel: string;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const client = await sb();
  await client.rpc("record_admissions_event", {
    p_application_id: args.applicationId,
    p_actor_type: args.actorType,
    p_actor_label: args.actorLabel,
    p_action: args.action,
    p_metadata: args.metadata ?? {},
  });
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

  const organizationId = await organizationIdFor(site.id);
  if (!organizationId) return { ok: false, status: 409, error: "Unknown residence." };

  const seniorId = await seniorIdFor(familyId, args.input.senior?.name ?? "");
  if (!seniorId) return { ok: false, status: 500, error: "Unable to submit application." };

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
        senior_id: seniorId,
        community_id: site.id,
        organization_id: organizationId,
        submitted_by: args.familyUserId,
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
  await recordEvent({
    applicationId: record.id,
    actorType: "family",
    actorLabel: args.familyEmail,
    action: "application.submitted",
    metadata: { siteId: record.siteId },
  });

  return { ok: true, data: { record, created: true } };
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

  await recordEvent({
    applicationId: args.applicationId,
    actorType: "staff",
    actorLabel: args.actorLabel,
    action: `status.${args.toStatus}`,
    metadata: { fromStatus: record.status, note: args.note ?? null },
  });

  return { ok: true, data: rowToRecord(data as Row) };
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

  await recordEvent({
    applicationId: args.applicationId,
    actorType: "family",
    actorLabel: "",
    action: "application.withdrawn",
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

  const organizationId = await organizationIdFor(site.id);
  if (!organizationId) return { ok: false, status: 409, error: "Unknown residence." };

  const seniorId = await seniorIdFor(familyId, args.input.senior?.name ?? "");
  if (!seniorId) return { ok: false, status: 500, error: "Unable to save draft." };

  const client = await sb();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("applications")
    .upsert(
      {
        family_id: familyId,
        senior_id: seniorId,
        community_id: site.id,
        organization_id: organizationId,
        submitted_by: args.familyUserId,
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
