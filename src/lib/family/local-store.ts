/**
 * Server-authoritative local family store (filesystem under .data/).
 * Used when NEXT_PUBLIC_DATA_BACKEND is not "supabase".
 * Never seeds demo profiles — empty account until the user saves.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { emptyCareNeeds, type CareNeeds } from "@/lib/care-needs";
import { formatFileSize, type DocCategoryId, type VaultDocument } from "@/lib/document-vault";
import type { FamilyApplication } from "@/lib/family-applications";
import { emptyResidentDossier, type ResidentDossier } from "@/lib/resident-dossier";
import { emptyOnboardingMeta, emptySeniorProfile, type SeniorProfile } from "@/lib/senior-profile";
import type { SavedFavorite } from "@/lib/saved-communities";
import { computeProfileProgress } from "@/lib/family/completeness";
import {
  PROFILE_RETENTION_CONSENT_VERSION,
  PROFILE_RETENTION_PURPOSE_TEXT,
  type ApplicantIdentity,
  type ConsentRecordDto,
  type DeletionRequestDto,
  type EmergencyContactDto,
  type FamilyBundle,
  type FamilyAccountRecord,
  type SeniorRecord,
} from "@/lib/family/types";
import { newOpaqueId } from "@/lib/family/session";

const ROOT = path.join(process.cwd(), ".data", "family");
const DOCS_ROOT = path.join(process.cwd(), ".data", "family-docs");

type StoredFamily = {
  account: FamilyAccountRecord;
  seniors: SeniorRecord[];
  documents: VaultDocument[];
  applications: FamilyApplication[];
  savedFavorites: SavedFavorite[];
  compareIds: string[];
  consents: ConsentRecordDto[];
};

async function ensureDirs() {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.mkdir(DOCS_ROOT, { recursive: true });
}

function familyPath(ownerId: string) {
  return path.join(ROOT, `${ownerId}.json`);
}

async function readStore(ownerId: string): Promise<StoredFamily | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(familyPath(ownerId), "utf8");
    return JSON.parse(raw) as StoredFamily;
  } catch {
    return null;
  }
}

async function writeStore(ownerId: string, data: StoredFamily) {
  await ensureDirs();
  const tmp = familyPath(ownerId) + `.tmp-${randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, familyPath(ownerId));
}

function nowIso() {
  return new Date().toISOString();
}

function emptyApplicant(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): ApplicantIdentity {
  return {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email,
    phone: user.phone || "",
    relationshipToSenior: "",
    communicationPreference: "",
    preferredLanguage: "fr",
  };
}

function buildBundle(store: StoredFamily): FamilyBundle {
  const primary = store.seniors[0];
  const progress = computeProfileProgress({
    senior: primary?.profile ?? emptySeniorProfile(),
    careNeeds: primary?.careNeeds ?? emptyCareNeeds(),
    residentDossier: primary?.residentDossier ?? emptyResidentDossier(),
    emergencyContacts: primary?.emergencyContacts ?? [],
    documents: store.documents,
    lastSavedAt: store.account.updatedAt,
    resumeStep: store.account.onboarding.stepIndex,
    hasProfileConsent: Boolean(
      store.account.profileConsent?.granted && !store.account.profileConsent.revokedAt,
    ),
  });

  return {
    account: store.account,
    seniors: store.seniors,
    documents: store.documents,
    applications: store.applications,
    savedFavorites: store.savedFavorites,
    compareIds: store.compareIds,
    consents: store.consents,
    progress,
  };
}

export async function ensureFamilyForUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<FamilyBundle> {
  const existing = await readStore(user.id);
  if (existing) return buildBundle(existing);

  const ts = nowIso();
  const account: FamilyAccountRecord = {
    id: newOpaqueId("fam"),
    ownerId: user.id,
    applicant: emptyApplicant(user),
    onboarding: emptyOnboardingMeta(),
    profileConsent: null,
    deletionRequest: null,
    createdAt: ts,
    updatedAt: ts,
  };
  const store: StoredFamily = {
    account,
    seniors: [],
    documents: [],
    applications: [],
    savedFavorites: [],
    compareIds: [],
    consents: [],
  };
  await writeStore(user.id, store);
  return buildBundle(store);
}

export async function getFamilyBundle(ownerId: string): Promise<FamilyBundle | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  return buildBundle(store);
}

export async function assertOwnsFamily(ownerId: string, familyId: string) {
  const store = await readStore(ownerId);
  if (!store || store.account.id !== familyId) return null;
  return store;
}

export async function updateApplicant(
  ownerId: string,
  patch: Partial<ApplicantIdentity>,
): Promise<FamilyBundle | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  store.account.applicant = { ...store.account.applicant, ...patch };
  store.account.updatedAt = nowIso();
  store.account.onboarding.lastSavedAt = store.account.updatedAt;
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function ensurePrimarySenior(ownerId: string): Promise<StoredFamily> {
  const store = await readStore(ownerId);
  if (!store) throw new Error("family_missing");
  if (store.seniors.length === 0) {
    const ts = nowIso();
    const senior: SeniorRecord = {
      id: newOpaqueId("snr"),
      familyId: store.account.id,
      profile: emptySeniorProfile(),
      careNeeds: emptyCareNeeds(),
      residentDossier: emptyResidentDossier(),
      emergencyContacts: [],
      completedPercentage: 0,
      createdAt: ts,
      updatedAt: ts,
    };
    senior.profile.createdAt = ts;
    senior.profile.updatedAt = ts;
    store.seniors.push(senior);
    store.account.updatedAt = ts;
    await writeStore(ownerId, store);
  }
  return store!;
}

export async function updateSeniorProfile(
  ownerId: string,
  seniorId: string | null,
  patch: Partial<SeniorProfile>,
  onboarding?: { stepIndex?: number },
): Promise<FamilyBundle | null> {
  const store = await ensurePrimarySenior(ownerId);
  const senior = seniorId
    ? store.seniors.find((s) => s.id === seniorId)
    : store.seniors[0];
  if (!senior) return null;
  const ts = nowIso();
  senior.profile = { ...senior.profile, ...patch, updatedAt: ts };
  if (!senior.profile.createdAt) senior.profile.createdAt = ts;
  senior.updatedAt = ts;
  if (onboarding?.stepIndex != null) {
    store.account.onboarding.stepIndex = onboarding.stepIndex;
    if (!store.account.onboarding.startedAt) store.account.onboarding.startedAt = ts;
  }
  store.account.onboarding.lastSavedAt = ts;
  store.account.updatedAt = ts;
  const bundlePreview = buildBundle(store);
  senior.completedPercentage = bundlePreview.progress.percent;
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function updateCareNeeds(
  ownerId: string,
  seniorId: string | null,
  careNeeds: CareNeeds,
): Promise<FamilyBundle | null> {
  const store = await ensurePrimarySenior(ownerId);
  const senior = seniorId
    ? store.seniors.find((s) => s.id === seniorId)
    : store.seniors[0];
  if (!senior) return null;
  const ts = nowIso();
  senior.careNeeds = { ...careNeeds, updatedAt: ts };
  senior.updatedAt = ts;
  store.account.updatedAt = ts;
  store.account.onboarding.lastSavedAt = ts;
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function updateDossier(
  ownerId: string,
  seniorId: string | null,
  dossier: ResidentDossier,
): Promise<FamilyBundle | null> {
  const store = await ensurePrimarySenior(ownerId);
  const senior = seniorId
    ? store.seniors.find((s) => s.id === seniorId)
    : store.seniors[0];
  if (!senior) return null;
  const ts = nowIso();
  senior.residentDossier = dossier;
  senior.updatedAt = ts;
  store.account.updatedAt = ts;
  store.account.onboarding.lastSavedAt = ts;
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function replaceEmergencyContacts(
  ownerId: string,
  seniorId: string | null,
  contacts: EmergencyContactDto[],
): Promise<FamilyBundle | null> {
  const store = await ensurePrimarySenior(ownerId);
  const senior = seniorId
    ? store.seniors.find((s) => s.id === seniorId)
    : store.seniors[0];
  if (!senior) return null;
  const ts = nowIso();
  senior.emergencyContacts = contacts.map((c, i) => ({
    ...c,
    id: c.id || newOpaqueId("ec"),
    sortOrder: i,
  }));
  senior.updatedAt = ts;
  store.account.updatedAt = ts;
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function recordProfileConsent(
  ownerId: string,
  granted: boolean,
): Promise<FamilyBundle | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  const ts = nowIso();
  if (store.account.profileConsent?.granted && !granted) {
    store.account.profileConsent = {
      ...store.account.profileConsent,
      granted: false,
      revokedAt: ts,
    };
    await writeStore(ownerId, store);
    await appendRightsLog(ownerId, "consent_revoke", "Retrait du consentement de conservation");
    // re-read after log
    const again = await readStore(ownerId);
    return again ? buildBundle(again) : null;
  } else if (granted) {
    const record: ConsentRecordDto = {
      id: newOpaqueId("cns"),
      purpose: "profile_retention",
      granted: true,
      version: PROFILE_RETENTION_CONSENT_VERSION,
      purposeText: PROFILE_RETENTION_PURPOSE_TEXT,
      recordedAt: ts,
      revokedAt: null,
    };
    store.account.profileConsent = record;
    store.consents.unshift(record);
  }
  store.account.updatedAt = ts;
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function requestAccountDeletion(
  ownerId: string,
  input: { scope: "profile" | "account"; reason?: string },
): Promise<FamilyBundle | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  const ts = nowIso();
  const req: DeletionRequestDto = {
    id: newOpaqueId("del"),
    scope: input.scope,
    status: "pending",
    reason: (input.reason || "").slice(0, 500),
    requestedAt: ts,
  };
  store.account.deletionRequest = req;
  store.account.updatedAt = ts;
  await writeStore(ownerId, store);
  await appendRightsLog(ownerId, "deletion_request", `Portée ${input.scope}`);
  return buildBundle(store);
}

export async function saveApplications(
  ownerId: string,
  applications: FamilyApplication[],
): Promise<FamilyBundle | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  store.applications = applications;
  store.account.updatedAt = nowIso();
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function saveFavorites(
  ownerId: string,
  favorites: SavedFavorite[],
  compareIds: string[],
): Promise<FamilyBundle | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  store.savedFavorites = favorites;
  store.compareIds = compareIds;
  store.account.updatedAt = nowIso();
  await writeStore(ownerId, store);
  return buildBundle(store);
}

function docStoragePath(familyId: string, seniorId: string, docId: string, version: number) {
  return path.join(DOCS_ROOT, familyId, seniorId, `${docId}_v${version}`);
}

export async function addDocument(input: {
  ownerId: string;
  seniorId?: string | null;
  category: DocCategoryId;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Buffer;
  expires?: string | null;
  description?: string;
}): Promise<{ bundle: FamilyBundle; document: VaultDocument } | { error: string; status: number }> {
  const store = await ensurePrimarySenior(input.ownerId);
  const senior = input.seniorId
    ? store.seniors.find((s) => s.id === input.seniorId)
    : store.seniors[0];
  if (!senior) return { error: "Profil introuvable.", status: 404 };

  const ts = nowIso();
  const id = newOpaqueId("doc");
  const version = 1;
  const storageRel = `${store.account.id}/${senior.id}/${id}_v${version}`;
  const abs = docStoragePath(store.account.id, senior.id, id, version);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.bytes);

  const document: VaultDocument = {
    id,
    name: input.originalFilename,
    category: input.category,
    description: input.description || "",
    status: "uploaded",
    expires: input.expires ?? null,
    size: formatFileSize(input.sizeBytes),
    sizeBytes: input.sizeBytes,
    mimeType: input.mimeType,
    updated: ts.slice(0, 10),
    createdAt: ts,
    versions: version,
    hasFile: true,
    sharedWith: [],
    attachedToApplications: [],
  };

  store.documents.unshift(document);
  store.account.updatedAt = ts;
  await writeStore(input.ownerId, store);
  // stash path in a sidecar map
  await writeDocMeta(id, { ownerId: input.ownerId, path: storageRel, abs });
  return { bundle: buildBundle(store), document };
}

async function writeDocMeta(docId: string, meta: { ownerId: string; path: string; abs: string }) {
  await ensureDirs();
  const metaPath = path.join(DOCS_ROOT, `_meta_${docId}.json`);
  await fs.writeFile(metaPath, JSON.stringify(meta), "utf8");
}

async function readDocMeta(docId: string) {
  try {
    const raw = await fs.readFile(path.join(DOCS_ROOT, `_meta_${docId}.json`), "utf8");
    return JSON.parse(raw) as { ownerId: string; path: string; abs: string };
  } catch {
    return null;
  }
}

export async function getDocumentFile(
  ownerId: string,
  docId: string,
): Promise<{ bytes: Buffer; mimeType: string; filename: string } | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  const doc = store.documents.find((d) => d.id === docId);
  if (!doc) return null;
  const meta = await readDocMeta(docId);
  if (!meta || meta.ownerId !== ownerId) return null;
  try {
    const bytes = await fs.readFile(meta.abs);
    return { bytes, mimeType: doc.mimeType, filename: doc.name };
  } catch {
    return null;
  }
}

export async function deleteDocument(
  ownerId: string,
  docId: string,
): Promise<FamilyBundle | null | { error: "not_found" }> {
  const store = await readStore(ownerId);
  if (!store) return null;
  const idx = store.documents.findIndex((d) => d.id === docId);
  if (idx < 0) return { error: "not_found" };
  store.documents.splice(idx, 1);
  store.account.updatedAt = nowIso();
  const meta = await readDocMeta(docId);
  if (meta?.abs) {
    try {
      await fs.unlink(meta.abs);
    } catch {
      /* ignore */
    }
    try {
      await fs.unlink(path.join(DOCS_ROOT, `_meta_${docId}.json`));
    } catch {
      /* ignore */
    }
  }
  await writeStore(ownerId, store);
  return buildBundle(store);
}

export async function replaceDocument(input: {
  ownerId: string;
  docId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Buffer;
}): Promise<{ bundle: FamilyBundle; document: VaultDocument } | { error: string; status: number }> {
  const store = await readStore(input.ownerId);
  if (!store) return { error: "Compte introuvable.", status: 404 };
  const doc = store.documents.find((d) => d.id === input.docId);
  if (!doc) return { error: "Document introuvable.", status: 404 };
  const senior = store.seniors[0];
  if (!senior) return { error: "Profil introuvable.", status: 404 };

  const version = doc.versions + 1;
  const abs = docStoragePath(store.account.id, senior.id, doc.id, version);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.bytes);
  const ts = nowIso();
  doc.name = input.originalFilename;
  doc.mimeType = input.mimeType;
  doc.sizeBytes = input.sizeBytes;
  doc.size = formatFileSize(input.sizeBytes);
  doc.versions = version;
  doc.updated = ts.slice(0, 10);
  doc.status = "uploaded";
  doc.hasFile = true;
  store.account.updatedAt = ts;
  await writeDocMeta(doc.id, {
    ownerId: input.ownerId,
    path: `${store.account.id}/${senior.id}/${doc.id}_v${version}`,
    abs,
  });
  await writeStore(input.ownerId, store);
  return { bundle: buildBundle(store), document: doc };
}

/** Test helper: wipe a user's family store */
export async function __resetFamilyForTests(ownerId: string) {
  try {
    await fs.unlink(familyPath(ownerId));
  } catch {
    /* ignore */
  }
}

export type RightsOperation =
  | "access_view"
  | "export"
  | "rectify"
  | "consent_revoke"
  | "deletion_request"
  | "deletion_executed";

export type RightsLogEntry = {
  id: string;
  operation: RightsOperation;
  detail: string;
  recordedAt: string;
};

function rightsLogPath(ownerId: string) {
  return path.join(ROOT, `${ownerId}.rights-log.json`);
}

async function readRightsLog(ownerId: string): Promise<RightsLogEntry[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(rightsLogPath(ownerId), "utf8");
    const parsed = JSON.parse(raw) as RightsLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendRightsLog(
  ownerId: string,
  operation: RightsOperation,
  detail = "",
): Promise<RightsLogEntry> {
  const logs = await readRightsLog(ownerId);
  const entry: RightsLogEntry = {
    id: newOpaqueId("rlog"),
    operation,
    detail: detail.slice(0, 300),
    recordedAt: nowIso(),
  };
  logs.unshift(entry);
  await fs.writeFile(rightsLogPath(ownerId), JSON.stringify(logs.slice(0, 200), null, 2), "utf8");
  return entry;
}

export type FamilyExportPayload = {
  exportedAt: string;
  formatVersion: string;
  account: FamilyAccountRecord;
  seniors: SeniorRecord[];
  documents: VaultDocument[];
  applications: FamilyApplication[];
  consents: ConsentRecordDto[];
  progress: FamilyBundle["progress"];
  rightsLog: RightsLogEntry[];
  notes: string[];
};

export async function buildFamilyExport(ownerId: string): Promise<FamilyExportPayload | null> {
  const store = await readStore(ownerId);
  if (!store) return null;
  await appendRightsLog(ownerId, "export", "Export JSON des données familiales");
  const bundle = buildBundle(store);
  const rightsLog = await readRightsLog(ownerId);
  return {
    exportedAt: nowIso(),
    formatVersion: "haven-family-export-v1",
    account: bundle.account,
    seniors: bundle.seniors.map((s) => ({
      ...s,
      profile: { ...s.profile, photoDataUrl: s.profile.photoDataUrl ? "[photo omise dans l'export JSON — téléchargez le document séparément si besoin]" : "" },
    })),
    documents: bundle.documents,
    applications: bundle.applications,
    consents: bundle.consents,
    progress: bundle.progress,
    rightsLog,
    notes: [
      "Les fichiers binaires ne sont pas inclus dans cet export. Utilisez le téléchargement de chaque document depuis l'espace famille.",
      "Ce fichier contient des renseignements personnels — conservez-le de façon sécurisée.",
    ],
  };
}

export async function listRightsLog(ownerId: string) {
  return readRightsLog(ownerId);
}

export async function logRightsOperation(
  ownerId: string,
  operation: RightsOperation,
  detail?: string,
) {
  return appendRightsLog(ownerId, operation, detail);
}

/**
 * Execute deletion: remove document bytes and wipe or anonymize family store.
 * scope=profile clears senior dossier but keeps the empty family shell.
 * scope=account removes the family store entirely after logging.
 */
export async function executeAccountDeletion(
  ownerId: string,
  input: { scope: "profile" | "account"; reason?: string },
): Promise<{ ok: true; scope: "profile" | "account" } | null> {
  const store = await readStore(ownerId);
  if (!store) return null;

  // Delete document files first
  for (const doc of store.documents) {
    const meta = await readDocMeta(doc.id);
    if (meta?.abs) {
      try {
        await fs.unlink(meta.abs);
      } catch {
        /* ignore */
      }
      try {
        await fs.unlink(path.join(DOCS_ROOT, `_meta_${doc.id}.json`));
      } catch {
        /* ignore */
      }
    }
  }

  await appendRightsLog(
    ownerId,
    "deletion_executed",
    `Suppression exécutée (portée: ${input.scope})`,
  );

  if (input.scope === "profile") {
    const ts = nowIso();
    store.seniors = [];
    store.documents = [];
    store.applications = [];
    store.savedFavorites = [];
    store.compareIds = [];
    store.account.profileConsent = null;
    store.account.deletionRequest = {
      id: newOpaqueId("del"),
      scope: "profile",
      status: "completed",
      reason: (input.reason || "").slice(0, 500),
      requestedAt: ts,
    };
    store.account.updatedAt = ts;
    store.account.onboarding = emptyOnboardingMeta();
    await writeStore(ownerId, store);
    return { ok: true, scope: "profile" };
  }

  // account: wipe store file (keep rights log without PII payloads)
  try {
    await fs.unlink(familyPath(ownerId));
  } catch {
    /* ignore */
  }
  return { ok: true, scope: "account" };
}
