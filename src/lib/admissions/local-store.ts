/**
 * Server-authoritative admissions store (filesystem under .data/).
 * Used when NEXT_PUBLIC_DATA_BACKEND is not "supabase".
 *
 * Never seeds demo applications: an empty deployment has zero dossiers.
 * Development fixtures go through `seedAdmissionsForDev` only.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveKnownSite } from "@/lib/admissions/site-registry";
import {
  TERMINAL_STATUSES,
  type AdmissionActorType,
  type AdmissionApplicationRecord,
  type AdmissionAuditEntry,
  type AdmissionDetail,
  type AdmissionResult,
  type AdmissionStatus,
  type AdmissionStatusEvent,
  type AdmissionSubmitInput,
  type ResidenceSite,
  type StaffMembership,
} from "@/lib/admissions/types";

const ROOT = path.join(process.cwd(), ".data", "admissions");
const STATE_FILE = path.join(ROOT, "state.json");

type AdmissionsState = {
  applications: AdmissionApplicationRecord[];
  statusEvents: AdmissionStatusEvent[];
  audit: AdmissionAuditEntry[];
  sites: ResidenceSite[];
  memberships: StaffMembership[];
};

const EMPTY_STATE: AdmissionsState = {
  applications: [],
  statusEvents: [],
  audit: [],
  sites: [],
  memberships: [],
};

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

async function readState(): Promise<AdmissionsState> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdmissionsState>;
    return {
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
      statusEvents: Array.isArray(parsed.statusEvents) ? parsed.statusEvents : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      sites: Array.isArray(parsed.sites) ? parsed.sites : [],
      memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(state: AdmissionsState) {
  await fs.mkdir(ROOT, { recursive: true });
  const tmp = `${STATE_FILE}.tmp-${randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, STATE_FILE);
}

/**
 * Writes are serialized through a single promise chain: route handlers run
 * concurrently in one Node process and last-write-wins would drop records.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function withState<T>(fn: (state: AdmissionsState) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const state = await readState();
    const result = await fn(state);
    await writeState(state);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

function sanitizeStrings(list: unknown, max = 40): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}

function sanitizeDocuments(list: AdmissionSubmitInput["documents"]) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 50).map((doc) => ({
    id: String(doc?.id ?? ""),
    name: String(doc?.name ?? ""),
    category: String(doc?.category ?? ""),
    shared: Boolean(doc?.shared),
  }));
}

function applyInput(
  record: AdmissionApplicationRecord,
  input: AdmissionSubmitInput,
): AdmissionApplicationRecord {
  return {
    ...record,
    publicRef: input.publicRef ?? record.publicRef,
    personRef: input.personRef ?? record.personRef,
    dossierRef: input.dossierRef ?? record.dossierRef,
    senior: {
      name: input.senior?.name?.trim() || record.senior.name,
      age: typeof input.senior?.age === "number" ? input.senior.age : record.senior.age,
      relationship: input.senior?.relationship?.trim() || record.senior.relationship,
      photoUrl: input.senior?.photoUrl ?? record.senior.photoUrl,
    },
    summary: typeof input.summary === "string" ? input.summary.slice(0, 2000) : record.summary,
    careNeeds: input.careNeeds ? sanitizeStrings(input.careNeeds) : record.careNeeds,
    medicalHighlights: input.medicalHighlights
      ? sanitizeStrings(input.medicalHighlights)
      : record.medicalHighlights,
    documents: input.documents ? sanitizeDocuments(input.documents) : record.documents,
    familyContact: {
      name: input.familyContact?.name?.trim() || record.familyContact.name,
      email: input.familyContact?.email?.trim().toLowerCase() || record.familyContact.email,
      phone: input.familyContact?.phone?.trim() ?? record.familyContact.phone,
      relationship: input.familyContact?.relationship?.trim() || record.familyContact.relationship,
    },
    desiredMoveIn: input.desiredMoveIn ?? record.desiredMoveIn,
    updatedAt: nowIso(),
  };
}

function blankRecord(args: {
  familyUserId: string;
  familyEmail: string;
  site: ResidenceSite;
  clientRequestId: string;
}): AdmissionApplicationRecord {
  const at = nowIso();
  return {
    id: newId("adm"),
    familyUserId: args.familyUserId,
    familyEmail: args.familyEmail.toLowerCase(),
    siteId: args.site.id,
    siteName: args.site.name,
    clientRequestId: args.clientRequestId,
    publicRef: null,
    personRef: null,
    dossierRef: null,
    status: "draft",
    senior: { name: "", age: null, relationship: "", photoUrl: null },
    summary: "",
    careNeeds: [],
    medicalHighlights: [],
    documents: [],
    familyContact: {
      name: "",
      email: args.familyEmail.toLowerCase(),
      phone: "",
      relationship: "",
    },
    desiredMoveIn: null,
    waitlistPosition: null,
    decision: null,
    isSeed: false,
    createdAt: at,
    submittedAt: null,
    updatedAt: at,
  };
}

function pushEvent(
  state: AdmissionsState,
  args: {
    applicationId: string;
    fromStatus: AdmissionStatus | null;
    toStatus: AdmissionStatus;
    actorType: AdmissionActorType;
    actorId: string;
    note?: string | null;
  },
) {
  state.statusEvents.push({
    id: newId("evt"),
    applicationId: args.applicationId,
    fromStatus: args.fromStatus,
    toStatus: args.toStatus,
    actorType: args.actorType,
    actorId: args.actorId,
    note: args.note ?? null,
    at: nowIso(),
  });
}

function pushAudit(
  state: AdmissionsState,
  args: {
    applicationId: string;
    actorType: AdmissionActorType;
    actorId: string;
    actorLabel: string;
    action: string;
    metadata?: Record<string, unknown>;
  },
) {
  state.audit.push({
    id: newId("aud"),
    applicationId: args.applicationId,
    actorType: args.actorType,
    actorId: args.actorId,
    actorLabel: args.actorLabel,
    action: args.action,
    metadata: args.metadata ?? {},
    at: nowIso(),
  });
}

// ---------------------------------------------------------------------------
// Sites and memberships
// ---------------------------------------------------------------------------

export async function listSites(): Promise<ResidenceSite[]> {
  const state = await readState();
  return state.sites;
}

export async function upsertSite(site: ResidenceSite): Promise<ResidenceSite> {
  return withState((state) => {
    const idx = state.sites.findIndex((s) => s.id === site.id);
    if (idx >= 0) state.sites[idx] = { ...state.sites[idx], ...site };
    else state.sites.push(site);
    return site;
  });
}

export async function getSite(siteId: string): Promise<ResidenceSite | null> {
  const state = await readState();
  return resolveSite(state, siteId);
}

/**
 * A stored site row wins (it may have been paused); otherwise the trusted
 * catalogs answer. Unknown ids resolve to null so the submit is refused.
 */
function resolveSite(state: AdmissionsState, siteId: string): ResidenceSite | null {
  const stored = state.sites.find((s) => s.id === siteId);
  if (stored) return stored;
  return resolveKnownSite(siteId);
}

export async function listMembershipsForUser(userId: string): Promise<StaffMembership[]> {
  const state = await readState();
  return state.memberships.filter((m) => m.userId === userId && m.status === "active");
}

export async function listMembershipsForEmail(email: string): Promise<StaffMembership[]> {
  const state = await readState();
  const needle = email.toLowerCase();
  return state.memberships.filter(
    (m) => m.email.toLowerCase() === needle && m.status === "active",
  );
}

export async function upsertMembership(membership: StaffMembership): Promise<StaffMembership> {
  return withState((state) => {
    const idx = state.memberships.findIndex(
      (m) => m.userId === membership.userId && m.siteId === membership.siteId,
    );
    if (idx >= 0) state.memberships[idx] = { ...state.memberships[idx], ...membership };
    else state.memberships.push(membership);
    return membership;
  });
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function saveDraft(args: {
  familyUserId: string;
  familyEmail: string;
  input: AdmissionSubmitInput;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  return withState((state) => {
    const site = resolveSite(state, args.input.siteId);
    if (!site) return { ok: false as const, status: 409, error: "Unknown residence." };

    const existing = state.applications.find(
      (a) =>
        a.familyUserId === args.familyUserId && a.clientRequestId === args.input.clientRequestId,
    );

    if (existing) {
      if (existing.status !== "draft") {
        return { ok: true as const, data: existing };
      }
      const updated = applyInput(existing, args.input);
      state.applications = state.applications.map((a) => (a.id === updated.id ? updated : a));
      return { ok: true as const, data: updated };
    }

    const created = applyInput(
      blankRecord({
        familyUserId: args.familyUserId,
        familyEmail: args.familyEmail,
        site,
        clientRequestId: args.input.clientRequestId,
      }),
      args.input,
    );
    state.applications.push(created);
    pushAudit(state, {
      applicationId: created.id,
      actorType: "family",
      actorId: args.familyUserId,
      actorLabel: args.familyEmail,
      action: "draft.created",
    });
    return { ok: true as const, data: created };
  });
}

export async function submitApplication(args: {
  familyUserId: string;
  familyEmail: string;
  input: AdmissionSubmitInput;
}): Promise<AdmissionResult<{ record: AdmissionApplicationRecord; created: boolean }>> {
  return withState((state) => {
    const site = resolveSite(state, args.input.siteId);
    if (!site) return { ok: false as const, status: 409, error: "Unknown residence." };
    if (!site.isActive) {
      return {
        ok: false as const,
        status: 409,
        error: "This residence is not accepting applications.",
      };
    }

    const existing = state.applications.find(
      (a) =>
        a.familyUserId === args.familyUserId && a.clientRequestId === args.input.clientRequestId,
    );

    // Idempotent replay: same key, already submitted -> return as-is.
    if (existing && existing.status !== "draft") {
      return { ok: true as const, data: { record: existing, created: false } };
    }

    const base =
      existing ??
      blankRecord({
        familyUserId: args.familyUserId,
        familyEmail: args.familyEmail,
        site,
        clientRequestId: args.input.clientRequestId,
      });

    const at = nowIso();
    const submitted: AdmissionApplicationRecord = {
      ...applyInput(base, args.input),
      status: "submitted",
      submittedAt: at,
      updatedAt: at,
    };

    if (existing) {
      state.applications = state.applications.map((a) => (a.id === submitted.id ? submitted : a));
    } else {
      state.applications.push(submitted);
    }

    pushEvent(state, {
      applicationId: submitted.id,
      fromStatus: existing ? "draft" : null,
      toStatus: "submitted",
      actorType: "family",
      actorId: args.familyUserId,
    });
    pushAudit(state, {
      applicationId: submitted.id,
      actorType: "family",
      actorId: args.familyUserId,
      actorLabel: args.familyEmail,
      action: "application.submitted",
      metadata: { siteId: submitted.siteId },
    });

    return { ok: true as const, data: { record: submitted, created: true } };
  });
}

export async function listForFamily(familyUserId: string): Promise<AdmissionApplicationRecord[]> {
  const state = await readState();
  return state.applications
    .filter((a) => a.familyUserId === familyUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Drafts stay private to the family: staff only see submitted work. */
export async function listForSites(siteIds: string[]): Promise<AdmissionApplicationRecord[]> {
  const state = await readState();
  const allowed = new Set(siteIds);
  return state.applications
    .filter((a) => allowed.has(a.siteId) && a.status !== "draft")
    .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
}

export async function getDetail(args: {
  applicationId: string;
  familyUserId?: string;
  siteIds?: string[];
}): Promise<AdmissionDetail | null> {
  const state = await readState();
  const application = state.applications.find((a) => a.id === args.applicationId);
  if (!application) return null;

  const familyAllowed = args.familyUserId ? application.familyUserId === args.familyUserId : false;
  const staffAllowed = args.siteIds
    ? args.siteIds.includes(application.siteId) && application.status !== "draft"
    : false;
  if (!familyAllowed && !staffAllowed) return null;

  return {
    application,
    statusEvents: state.statusEvents
      .filter((e) => e.applicationId === application.id)
      .sort((a, b) => a.at.localeCompare(b.at)),
    audit: state.audit
      .filter((e) => e.applicationId === application.id)
      .sort((a, b) => a.at.localeCompare(b.at)),
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
  return withState((state) => {
    const application = state.applications.find((a) => a.id === args.applicationId);
    if (!application || !args.siteIds.includes(application.siteId) || application.status === "draft") {
      return { ok: false as const, status: 404, error: "Application not found." };
    }

    const fromStatus = application.status;
    const at = nowIso();
    const updated: AdmissionApplicationRecord = {
      ...application,
      status: args.toStatus,
      waitlistPosition:
        args.waitlistPosition !== undefined ? args.waitlistPosition : application.waitlistPosition,
      decision: args.decisionKind
        ? { kind: args.decisionKind, note: args.note ?? null, at }
        : application.decision,
      updatedAt: at,
    };
    state.applications = state.applications.map((a) => (a.id === updated.id ? updated : a));

    pushEvent(state, {
      applicationId: updated.id,
      fromStatus,
      toStatus: args.toStatus,
      actorType: "staff",
      actorId: args.actorId,
      note: args.note ?? null,
    });
    pushAudit(state, {
      applicationId: updated.id,
      actorType: "staff",
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      action: `status.${args.toStatus}`,
      metadata: { fromStatus, note: args.note ?? null },
    });

    return { ok: true as const, data: updated };
  });
}

export async function withdraw(args: {
  applicationId: string;
  familyUserId: string;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  return withState((state) => {
    const application = state.applications.find(
      (a) => a.id === args.applicationId && a.familyUserId === args.familyUserId,
    );
    if (!application) return { ok: false as const, status: 404, error: "Application not found." };
    if (TERMINAL_STATUSES.includes(application.status)) {
      return { ok: true as const, data: application };
    }

    const fromStatus = application.status;
    const updated = { ...application, status: "withdrawn" as const, updatedAt: nowIso() };
    state.applications = state.applications.map((a) => (a.id === updated.id ? updated : a));

    pushEvent(state, {
      applicationId: updated.id,
      fromStatus,
      toStatus: "withdrawn",
      actorType: "family",
      actorId: args.familyUserId,
    });
    pushAudit(state, {
      applicationId: updated.id,
      actorType: "family",
      actorId: args.familyUserId,
      actorLabel: application.familyEmail,
      action: "application.withdrawn",
    });

    return { ok: true as const, data: updated };
  });
}

// ---------------------------------------------------------------------------
// Test / seed helpers
// ---------------------------------------------------------------------------

export async function insertSeedApplication(
  record: AdmissionApplicationRecord,
): Promise<AdmissionApplicationRecord> {
  return withState((state) => {
    const exists = state.applications.some((a) => a.id === record.id);
    if (!exists) state.applications.push(record);
    return record;
  });
}

export async function countApplications(): Promise<number> {
  const state = await readState();
  return state.applications.length;
}

/** Wipe the store. Tests only. */
export async function __resetAdmissionsForTests() {
  await writeState({ ...EMPTY_STATE });
}
