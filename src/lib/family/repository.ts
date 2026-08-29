/**
 * Family repository facade — local filesystem or Supabase.
 * Local mode is still server-authoritative (no demo fallbacks).
 */

import { isSupabaseBackend } from "@/lib/supabase/config";
import type { CareNeeds } from "@/lib/care-needs";
import type { DocCategoryId, VaultDocument } from "@/lib/document-vault";
import type { FamilyApplication } from "@/lib/family-applications";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { SeniorProfile } from "@/lib/senior-profile";
import type { SavedFavorite } from "@/lib/saved-communities";
import type { ApplicantIdentity, EmergencyContactDto, FamilyBundle } from "@/lib/family/types";
import * as local from "@/lib/family/local-store";

export async function loadOrCreateFamilyBundle(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<FamilyBundle> {
  if (isSupabaseBackend()) {
    // Supabase path: prefer Edge/RLS later; for now mirror via admin is out of scope
    // if env incomplete — fall through is not allowed; throw clear error.
    const { loadOrCreateSupabaseFamily } = await import("@/lib/family/supabase-store");
    return loadOrCreateSupabaseFamily(user);
  }
  return local.ensureFamilyForUser(user);
}

export async function patchApplicant(ownerId: string, patch: Partial<ApplicantIdentity>) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.patchApplicant(ownerId, patch);
  }
  return local.updateApplicant(ownerId, patch);
}

export async function patchSenior(
  ownerId: string,
  seniorId: string | null,
  patch: Partial<SeniorProfile>,
  onboarding?: { stepIndex?: number },
) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.patchSenior(ownerId, seniorId, patch, onboarding);
  }
  return local.updateSeniorProfile(ownerId, seniorId, patch, onboarding);
}

export async function patchCareNeeds(ownerId: string, seniorId: string | null, care: CareNeeds) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.patchCareNeeds(ownerId, seniorId, care);
  }
  return local.updateCareNeeds(ownerId, seniorId, care);
}

export async function patchDossier(ownerId: string, seniorId: string | null, dossier: ResidentDossier) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.patchDossier(ownerId, seniorId, dossier);
  }
  return local.updateDossier(ownerId, seniorId, dossier);
}

export async function patchEmergencyContacts(
  ownerId: string,
  seniorId: string | null,
  contacts: EmergencyContactDto[],
) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.patchEmergencyContacts(ownerId, seniorId, contacts);
  }
  return local.replaceEmergencyContacts(ownerId, seniorId, contacts);
}

export async function grantProfileConsent(ownerId: string, granted: boolean) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.grantProfileConsent(ownerId, granted);
  }
  return local.recordProfileConsent(ownerId, granted);
}

export async function requestDeletion(
  ownerId: string,
  input: { scope: "profile" | "account"; reason?: string },
) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.requestDeletion(ownerId, input);
  }
  return local.requestAccountDeletion(ownerId, input);
}

export async function persistApplications(ownerId: string, apps: FamilyApplication[]) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.persistApplications(ownerId, apps);
  }
  return local.saveApplications(ownerId, apps);
}

export async function persistFavorites(
  ownerId: string,
  favorites: SavedFavorite[],
  compareIds: string[],
) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.persistFavorites(ownerId, favorites, compareIds);
  }
  return local.saveFavorites(ownerId, favorites, compareIds);
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
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.uploadDocument(input);
  }
  return local.addDocument(input);
}

export async function removeDocument(ownerId: string, docId: string) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.removeDocument(ownerId, docId);
  }
  return local.deleteDocument(ownerId, docId);
}

export async function replaceDocumentFile(input: {
  ownerId: string;
  docId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Buffer;
}) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.replaceDocumentFile(input);
  }
  return local.replaceDocument(input);
}

export async function readDocumentFile(ownerId: string, docId: string) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.readDocumentFile(ownerId, docId);
  }
  return local.getDocumentFile(ownerId, docId);
}

export async function exportFamilyData(ownerId: string) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.buildFamilyExport(ownerId);
  }
  return local.buildFamilyExport(ownerId);
}

export async function executeDeletion(
  ownerId: string,
  input: { scope: "profile" | "account"; reason?: string },
) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.executeAccountDeletion(ownerId, input);
  }
  return local.executeAccountDeletion(ownerId, input);
}

export async function getRightsLog(ownerId: string) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.listRightsLog(ownerId);
  }
  return local.listRightsLog(ownerId);
}

export async function recordRightsOperation(
  ownerId: string,
  operation: local.RightsOperation,
  detail?: string,
) {
  if (isSupabaseBackend()) {
    const mod = await import("@/lib/family/supabase-store");
    return mod.logRightsOperation(ownerId, operation, detail);
  }
  return local.logRightsOperation(ownerId, operation, detail);
}

export type { FamilyBundle, VaultDocument };
