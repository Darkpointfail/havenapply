/**
 * Supabase-backed family store.
 * Uses the user-scoped SSR client so RLS enforces ownership.
 */

import { emptyCareNeeds, type CareNeeds } from "@/lib/care-needs";
import { formatFileSize, type DocCategoryId, type VaultDocument } from "@/lib/document-vault";
import type { FamilyApplication } from "@/lib/family-applications";
import { emptyResidentDossier, type ResidentDossier } from "@/lib/resident-dossier";
import { emptySeniorProfile, type SeniorProfile } from "@/lib/senior-profile";
import type { SavedFavorite } from "@/lib/saved-communities";
import { computeProfileProgress } from "@/lib/family/completeness";
import {
  PROFILE_RETENTION_CONSENT_VERSION,
  PROFILE_RETENTION_PURPOSE_TEXT,
  type ApplicantIdentity,
  type ConsentRecordDto,
  type DeletionRequestDto,
  type EmergencyContactDto,
  type FamilyAccountRecord,
  type FamilyBundle,
  type SeniorRecord,
} from "@/lib/family/types";
import { createClient } from "@/lib/supabase/server";
import { newOpaqueId } from "@/lib/family/session";

type Sb = Awaited<ReturnType<typeof createClient>>;

async function sb(): Promise<Sb> {
  return createClient();
}

function mapApplicant(row: Record<string, unknown>, emailFallback: string): ApplicantIdentity {
  return {
    firstName: String(row.family_name || "").split(" ")[0] || "",
    lastName: String(row.family_name || "").split(" ").slice(1).join(" "),
    email: String(row.primary_email || emailFallback),
    phone: String(row.primary_phone || ""),
    relationshipToSenior: String(row.relationship_to_senior || ""),
    communicationPreference: String(row.communication_preference || ""),
    preferredLanguage: String(row.preferred_language || "fr"),
  };
}

function seniorFromRow(row: Record<string, unknown>, care: CareNeeds, dossier: ResidentDossier, contacts: EmergencyContactDto[]): SeniorRecord {
  const profile: SeniorProfile = {
    ...emptySeniorProfile(),
    firstName: String(row.first_name || ""),
    middleName: String(row.middle_name || ""),
    lastName: String(row.last_name || ""),
    dateOfBirth: row.birth_date ? String(row.birth_date) : "",
    gender: String(row.gender || ""),
    phone: String(row.phone || ""),
    email: String(row.email || ""),
    address: String(row.address || ""),
    city: String(row.city || ""),
    state: String(row.state || ""),
    zip: String(row.zip_code || ""),
    primaryLanguage: String(row.language || "fr"),
    relationship: String(row.relationship_to_creator || ""),
    livingSituation: String(row.living_situation || ""),
    urgency: String(row.urgency_level || row.move_timeline || ""),
    searchZones: Array.isArray(row.preferred_locations)
      ? (row.preferred_locations as { id?: string; query?: string; radiusMiles?: number }[]).map((z, i) => ({
          id: z.id || `z${i}`,
          query: z.query || String(z),
          radiusMiles: z.radiusMiles ?? Number(row.search_radius_miles) ?? 25,
        }))
      : emptySeniorProfile().searchZones,
    budgetMin: row.budget_min != null ? String(row.budget_min) : "",
    budgetMax: row.budget_max != null ? String(row.budget_max) : "",
    fundingModes: row.funding_type ? [String(row.funding_type)] : [],
    createdAt: String(row.created_at || null),
    updatedAt: String(row.updated_at || null),
  };

  const dossierJson = (row.dossier_json as ResidentDossier) || dossier;

  return {
    id: String(row.id),
    familyId: String(row.family_id),
    profile,
    careNeeds: care,
    residentDossier: dossierJson,
    emergencyContacts: contacts,
    completedPercentage: Number(row.completed_percentage) || 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDoc(row: Record<string, unknown>): VaultDocument {
  const size = Number(row.byte_size) || 0;
  return {
    id: String(row.id),
    name: String(row.original_filename || row.title || "document"),
    category: (String(row.category_detail || row.category || "other") as DocCategoryId) || "other",
    description: String(row.description || ""),
    status: (String(row.status) === "ready" ? "uploaded" : String(row.status)) as VaultDocument["status"],
    expires: row.expires_at ? String(row.expires_at).slice(0, 10) : null,
    size: formatFileSize(size),
    sizeBytes: size,
    mimeType: String(row.mime_type || "application/octet-stream"),
    updated: String(row.updated_at || "").slice(0, 10),
    createdAt: String(row.created_at || ""),
    versions: Number(row.version) || 1,
    hasFile: Boolean(row.storage_path),
    sharedWith: [],
    attachedToApplications: [],
  };
}

async function loadBundleForOwner(
  client: Sb,
  user: { id: string; email: string; firstName: string; lastName: string; phone?: string },
  familyRow: Record<string, unknown>,
): Promise<FamilyBundle> {
  const familyId = String(familyRow.id);

  const { data: seniorsRows } = await client
    .from("seniors")
    .select("*")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const seniors: SeniorRecord[] = [];
  for (const row of seniorsRows || []) {
    const { data: careRow } = await client
      .from("senior_care_assessments")
      .select("*")
      .eq("senior_id", row.id)
      .maybeSingle();

    let care = emptyCareNeeds();
    if (careRow) {
      care = {
        ...emptyCareNeeds(),
        mobility: Array.isArray(careRow.mobility) ? careRow.mobility : [],
        cognition: Array.isArray(careRow.cognition) ? careRow.cognition : [],
        health: Array.isArray(careRow.health_conditions) ? careRow.health_conditions : [],
        updatedAt: careRow.updated_at,
        completedAt: row.care_needs_completed_at || careRow.updated_at,
      } as CareNeeds;
      // Prefer jsonb blobs when shaped like CareNeeds
      if (careRow.preferences && typeof careRow.preferences === "object" && "adl" in (careRow.preferences as object)) {
        care = { ...care, ...(careRow.preferences as CareNeeds) };
      }
    }

    const { data: contacts } = await client
      .from("emergency_contacts")
      .select("*")
      .eq("senior_id", row.id)
      .order("sort_order");

    const ec: EmergencyContactDto[] = (contacts || []).map((c) => ({
      id: c.id,
      fullName: c.full_name || "",
      relationship: c.relationship || "",
      phone: c.phone || "",
      email: c.email || "",
      isPrimary: Boolean(c.is_primary),
      sortOrder: c.sort_order || 0,
    }));

    seniors.push(seniorFromRow(row, care, emptyResidentDossier(), ec));
  }

  const { data: docs } = await client
    .from("documents")
    .select("*")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const documents = (docs || []).map(mapDoc);

  const { data: consents } = await client
    .from("consent_records")
    .select("*")
    .eq("family_id", familyId)
    .order("recorded_at", { ascending: false });

  const consentDtos: ConsentRecordDto[] = (consents || []).map((c) => ({
    id: c.id,
    purpose: c.purpose,
    granted: c.granted,
    version: c.version,
    purposeText: c.purpose_text,
    recordedAt: c.recorded_at,
    revokedAt: c.revoked_at,
  }));

  const profileConsent =
    consentDtos.find((c) => c.purpose === "profile_retention" && c.granted && !c.revokedAt) || null;

  const { data: deletion } = await client
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const deletionRequest: DeletionRequestDto | null = deletion
    ? {
        id: deletion.id,
        scope: deletion.scope,
        status: deletion.status,
        reason: deletion.reason || "",
        requestedAt: deletion.requested_at,
      }
    : null;

  const account: FamilyAccountRecord = {
    id: familyId,
    ownerId: user.id,
    applicant: {
      ...mapApplicant(familyRow, user.email),
      firstName: user.firstName || mapApplicant(familyRow, user.email).firstName,
      lastName: user.lastName || mapApplicant(familyRow, user.email).lastName,
      phone: user.phone || String(familyRow.primary_phone || ""),
    },
    onboarding: {
      stepIndex: Number(familyRow.onboarding_step) || 0,
      startedAt: familyRow.created_at ? String(familyRow.created_at) : null,
      lastSavedAt: familyRow.last_saved_at ? String(familyRow.last_saved_at) : null,
    },
    profileConsent,
    deletionRequest,
    createdAt: String(familyRow.created_at),
    updatedAt: String(familyRow.updated_at),
  };

  const primary = seniors[0];
  const progress = computeProfileProgress({
    senior: primary?.profile ?? emptySeniorProfile(),
    careNeeds: primary?.careNeeds ?? emptyCareNeeds(),
    residentDossier: primary?.residentDossier ?? emptyResidentDossier(),
    emergencyContacts: primary?.emergencyContacts ?? [],
    documents,
    lastSavedAt: account.onboarding.lastSavedAt,
    resumeStep: account.onboarding.stepIndex,
    hasProfileConsent: Boolean(profileConsent),
  });

  return {
    account,
    seniors,
    documents,
    applications: [],
    savedFavorites: [],
    compareIds: [],
    consents: consentDtos,
    progress,
  };
}

export async function loadOrCreateSupabaseFamily(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<FamilyBundle> {
  const client = await sb();
  const { data: existing } = await client
    .from("families")
    .select("*")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) return loadBundleForOwner(client, user, existing);

  const { data: created, error } = await client
    .from("families")
    .insert({
      owner_id: user.id,
      family_name: `${user.firstName} ${user.lastName}`.trim(),
      primary_email: user.email,
      primary_phone: user.phone || null,
      preferred_language: "fr",
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Impossible de créer le compte famille.");
  }

  await client.from("family_members").insert({
    family_id: created.id,
    user_id: user.id,
    role: "owner",
    invitation_status: "accepted",
  });

  return loadBundleForOwner(client, user, created);
}

export async function patchApplicant(ownerId: string, patch: Partial<ApplicantIdentity>) {
  const client = await sb();
  const { data: fam } = await client
    .from("families")
    .select("*")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!fam) return null;
  const updates: Record<string, unknown> = {
    last_saved_at: new Date().toISOString(),
  };
  if (patch.phone != null) updates.primary_phone = patch.phone;
  if (patch.email != null) updates.primary_email = patch.email;
  if (patch.communicationPreference != null) updates.communication_preference = patch.communicationPreference;
  if (patch.preferredLanguage != null) updates.preferred_language = patch.preferredLanguage;
  if (patch.relationshipToSenior != null) updates.relationship_to_senior = patch.relationshipToSenior;
  if (patch.firstName != null || patch.lastName != null) {
    updates.family_name = `${patch.firstName ?? ""}${patch.lastName ? ` ${patch.lastName}` : ""}`.trim();
  }
  await client.from("families").update(updates).eq("id", fam.id);
  return loadOrCreateSupabaseFamily({
    id: ownerId,
    email: String(patch.email || fam.primary_email),
    firstName: patch.firstName || "",
    lastName: patch.lastName || "",
    phone: patch.phone,
  });
}

async function ensureSenior(client: Sb, familyId: string, ownerId: string, seniorId: string | null) {
  if (seniorId) {
    const { data } = await client.from("seniors").select("*").eq("id", seniorId).eq("family_id", familyId).maybeSingle();
    return data;
  }
  const { data: list } = await client
    .from("seniors")
    .select("*")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (list?.[0]) return list[0];
  const { data: created } = await client
    .from("seniors")
    .insert({ family_id: familyId, created_by: ownerId, first_name: "", last_name: "" })
    .select("*")
    .single();
  if (created) {
    await client.from("senior_care_assessments").insert({ senior_id: created.id });
  }
  return created;
}

export async function patchSenior(
  ownerId: string,
  seniorId: string | null,
  patch: Partial<SeniorProfile>,
  onboarding?: { stepIndex?: number },
) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const senior = await ensureSenior(client, fam.id, ownerId, seniorId);
  if (!senior) return null;

  const updates: Record<string, unknown> = {
    first_name: patch.firstName ?? senior.first_name,
    middle_name: patch.middleName ?? senior.middle_name,
    last_name: patch.lastName ?? senior.last_name,
    birth_date: patch.dateOfBirth || senior.birth_date,
    gender: patch.gender ?? senior.gender,
    phone: patch.phone ?? senior.phone,
    email: patch.email ?? senior.email,
    address: patch.address ?? senior.address,
    city: patch.city ?? senior.city,
    state: patch.state ?? senior.state,
    zip_code: patch.zip ?? senior.zip_code,
    language: patch.primaryLanguage ?? senior.language,
    relationship_to_creator: patch.relationship ?? senior.relationship_to_creator,
    living_situation: patch.livingSituation ?? senior.living_situation,
    move_timeline: patch.urgency ?? senior.move_timeline,
    urgency_level: patch.urgency ?? senior.urgency_level,
    preferred_locations: patch.searchZones ?? senior.preferred_locations,
    budget_min: patch.budgetMin !== undefined && patch.budgetMin !== "" ? Number(patch.budgetMin) : senior.budget_min,
    budget_max: patch.budgetMax !== undefined && patch.budgetMax !== "" ? Number(patch.budgetMax) : senior.budget_max,
    funding_type: patch.fundingModes?.[0] ?? senior.funding_type,
  };
  await client.from("seniors").update(updates).eq("id", senior.id);

  const famUpdates: Record<string, unknown> = { last_saved_at: new Date().toISOString() };
  if (onboarding?.stepIndex != null) famUpdates.onboarding_step = onboarding.stepIndex;
  await client.from("families").update(famUpdates).eq("id", fam.id);

  return loadOrCreateSupabaseFamily({
    id: ownerId,
    email: fam.primary_email,
    firstName: "",
    lastName: "",
  });
}

export async function patchCareNeeds(ownerId: string, seniorId: string | null, care: CareNeeds) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const senior = await ensureSenior(client, fam.id, ownerId, seniorId);
  if (!senior) return null;
  await client.from("senior_care_assessments").upsert({
    senior_id: senior.id,
    mobility: care.mobility || [],
    cognition: care.cognition || [],
    health_conditions: care.health || [],
    preferences: care,
    schema_version: 1,
  });
  await client
    .from("seniors")
    .update({ care_needs_completed_at: care.completedAt || new Date().toISOString() })
    .eq("id", senior.id);
  return loadOrCreateSupabaseFamily({ id: ownerId, email: fam.primary_email, firstName: "", lastName: "" });
}

export async function patchDossier(ownerId: string, seniorId: string | null, dossier: ResidentDossier) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const senior = await ensureSenior(client, fam.id, ownerId, seniorId);
  if (!senior) return null;
  await client.from("seniors").update({ dossier_json: dossier }).eq("id", senior.id);
  return loadOrCreateSupabaseFamily({ id: ownerId, email: fam.primary_email, firstName: "", lastName: "" });
}

export async function patchEmergencyContacts(
  ownerId: string,
  seniorId: string | null,
  contacts: EmergencyContactDto[],
) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const senior = await ensureSenior(client, fam.id, ownerId, seniorId);
  if (!senior) return null;
  await client.from("emergency_contacts").delete().eq("senior_id", senior.id);
  if (contacts.length) {
    await client.from("emergency_contacts").insert(
      contacts.map((c, i) => ({
        id: c.id && c.id.length > 10 ? c.id : undefined,
        senior_id: senior.id,
        family_id: fam.id,
        full_name: c.fullName,
        relationship: c.relationship,
        phone: c.phone,
        email: c.email,
        is_primary: c.isPrimary,
        sort_order: i,
      })),
    );
  }
  return loadOrCreateSupabaseFamily({ id: ownerId, email: fam.primary_email, firstName: "", lastName: "" });
}

export async function grantProfileConsent(ownerId: string, granted: boolean) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const ts = new Date().toISOString();
  if (granted) {
    await client.from("consent_records").insert({
      user_id: ownerId,
      family_id: fam.id,
      purpose: "profile_retention",
      granted: true,
      version: PROFILE_RETENTION_CONSENT_VERSION,
      purpose_text: PROFILE_RETENTION_PURPOSE_TEXT,
      recorded_at: ts,
    });
    await client
      .from("families")
      .update({ profile_consent_version: PROFILE_RETENTION_CONSENT_VERSION, profile_consent_at: ts })
      .eq("id", fam.id);
  } else {
    await client
      .from("consent_records")
      .update({ revoked_at: ts, granted: false })
      .eq("family_id", fam.id)
      .eq("purpose", "profile_retention")
      .is("revoked_at", null);
  }
  return loadOrCreateSupabaseFamily({ id: ownerId, email: fam.primary_email, firstName: "", lastName: "" });
}

export async function requestDeletion(
  ownerId: string,
  input: { scope: "profile" | "account"; reason?: string },
) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  await client.from("account_deletion_requests").insert({
    user_id: ownerId,
    family_id: fam?.id ?? null,
    scope: input.scope,
    reason: input.reason || null,
    status: "pending",
  });
  return loadOrCreateSupabaseFamily({
    id: ownerId,
    email: fam?.primary_email || "",
    firstName: "",
    lastName: "",
  });
}

export async function persistApplications(_ownerId: string, _apps: FamilyApplication[]) {
  // B2B applications out of scope for this phase — keep empty on supabase until wired.
  return loadOrCreateSupabaseFamily({ id: _ownerId, email: "", firstName: "", lastName: "" });
}

export async function persistFavorites(
  ownerId: string,
  _favorites: SavedFavorite[],
  _compareIds: string[],
) {
  return loadOrCreateSupabaseFamily({ id: ownerId, email: "", firstName: "", lastName: "" });
}

export async function uploadDocument(input: {
  ownerId: string;
  seniorId?: string | null;
  category: DocCategoryId;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Buffer;
  expires?: string | null;
  description?: string;
}) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", input.ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return { error: "Compte introuvable.", status: 404 as const };
  const senior = await ensureSenior(client, fam.id, input.ownerId, input.seniorId ?? null);
  if (!senior) return { error: "Profil introuvable.", status: 404 as const };

  const docId = newOpaqueId("doc").replace("doc_", "");
  // Use uuid-like path; storage bucket senior-documents
  const version = 1;
  const storagePath = `${fam.id}/${senior.id}/${docId}/v${version}`;
  const { error: upErr } = await client.storage.from("senior-documents").upload(storagePath, input.bytes, {
    contentType: input.mimeType,
    upsert: false,
  });
  if (upErr) return { error: "Échec du téléversement.", status: 500 as const };

  const categoryMap: Record<string, string> = {
    identification: "id",
    insurance_card: "insurance",
    medicare: "insurance",
    medicaid: "insurance",
    ltc_insurance: "insurance",
    medication_list: "medical",
    physician_report: "medical",
    medical_history: "medical",
    care_assessment: "medical",
    power_of_attorney: "legal",
    guardianship: "legal",
    advance_directives: "legal",
    financial: "financial",
    vaccination: "medical",
    discharge: "medical",
    facility_forms: "application",
    other: "other",
  };

  const { data: docRow, error } = await client
    .from("documents")
    .insert({
      senior_id: senior.id,
      family_id: fam.id,
      uploaded_by: input.ownerId,
      category: categoryMap[input.category] || "other",
      category_detail: input.category,
      title: input.originalFilename,
      original_filename: input.originalFilename,
      description: input.description || null,
      bucket: "senior-documents",
      storage_path: storagePath,
      mime_type: input.mimeType,
      byte_size: input.sizeBytes,
      version,
      status: "ready",
      expires_at: input.expires || null,
    })
    .select("*")
    .single();

  if (error || !docRow) return { error: "Impossible d'enregistrer le document.", status: 500 as const };

  const bundle = await loadOrCreateSupabaseFamily({
    id: input.ownerId,
    email: fam.primary_email,
    firstName: "",
    lastName: "",
  });
  return { bundle, document: mapDoc(docRow) };
}

export async function removeDocument(ownerId: string, docId: string) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const { data: doc } = await client
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("family_id", fam.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc) return { error: "not_found" as const };
  await client
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", docId);
  return loadOrCreateSupabaseFamily({ id: ownerId, email: fam.primary_email, firstName: "", lastName: "" });
}

export async function replaceDocumentFile(input: {
  ownerId: string;
  docId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Buffer;
}) {
  const removed = await removeDocument(input.ownerId, input.docId);
  if (!removed || "error" in (removed as object)) {
    return { error: "Document introuvable.", status: 404 as const };
  }
  // Need category from old — simplified: re-upload as other if unknown
  return uploadDocument({
    ownerId: input.ownerId,
    category: "other",
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    bytes: input.bytes,
  });
}

export async function readDocumentFile(ownerId: string, docId: string) {
  const client = await sb();
  const { data: fam } = await client.from("families").select("*").eq("owner_id", ownerId).is("deleted_at", null).maybeSingle();
  if (!fam) return null;
  const { data: doc } = await client
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("family_id", fam.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc) return null;
  const { data, error } = await client.storage.from(doc.bucket).download(doc.storage_path);
  if (error || !data) return null;
  const bytes = Buffer.from(await data.arrayBuffer());
  return {
    bytes,
    mimeType: doc.mime_type || "application/octet-stream",
    filename: doc.original_filename || doc.title,
  };
}
