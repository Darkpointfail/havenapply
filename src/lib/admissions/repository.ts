/**
 * Backend-agnostic admissions repository.
 * Mirrors the family layer: one facade, two stores, selected by
 * NEXT_PUBLIC_DATA_BACKEND.
 *
 * Tenant filtering happens here and in the stores — never in the client.
 */

import { isSupabaseBackend } from "@/lib/supabase/config";
import * as local from "@/lib/admissions/local-store";
import * as remote from "@/lib/admissions/supabase-store";
import type {
  AdmissionApplicationRecord,
  AdmissionDetail,
  AdmissionResult,
  AdmissionStatus,
  AdmissionSubmitInput,
  ResidenceSite,
  StaffMembership,
} from "@/lib/admissions/types";

export function getSite(siteId: string): Promise<ResidenceSite | null> {
  return isSupabaseBackend() ? remote.getSite(siteId) : local.getSite(siteId);
}

export function listMembershipsForUser(userId: string): Promise<StaffMembership[]> {
  return isSupabaseBackend()
    ? remote.listMembershipsForUser(userId)
    : local.listMembershipsForUser(userId);
}

export function listMembershipsForEmail(email: string): Promise<StaffMembership[]> {
  // Supabase memberships are keyed by user id; email lookup is local-only.
  return isSupabaseBackend() ? Promise.resolve([]) : local.listMembershipsForEmail(email);
}

export function saveDraft(args: {
  familyUserId: string;
  familyEmail: string;
  input: AdmissionSubmitInput;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  return isSupabaseBackend() ? remote.saveDraft(args) : local.saveDraft(args);
}

export function submitApplication(args: {
  familyUserId: string;
  familyEmail: string;
  input: AdmissionSubmitInput;
}): Promise<AdmissionResult<{ record: AdmissionApplicationRecord; created: boolean }>> {
  return isSupabaseBackend() ? remote.submitApplication(args) : local.submitApplication(args);
}

export function listForFamily(familyUserId: string): Promise<AdmissionApplicationRecord[]> {
  return isSupabaseBackend() ? remote.listForFamily(familyUserId) : local.listForFamily(familyUserId);
}

export function listForSites(siteIds: string[]): Promise<AdmissionApplicationRecord[]> {
  return isSupabaseBackend() ? remote.listForSites(siteIds) : local.listForSites(siteIds);
}

export function getDetail(args: {
  applicationId: string;
  familyUserId?: string;
  siteIds?: string[];
}): Promise<AdmissionDetail | null> {
  return isSupabaseBackend() ? remote.getDetail(args) : local.getDetail(args);
}

export function changeStatus(args: {
  applicationId: string;
  siteIds: string[];
  toStatus: AdmissionStatus;
  note?: string | null;
  actorId: string;
  actorLabel: string;
  decisionKind?: string | null;
  waitlistPosition?: number | null;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  return isSupabaseBackend() ? remote.changeStatus(args) : local.changeStatus(args);
}

export function withdraw(args: {
  applicationId: string;
  familyUserId: string;
}): Promise<AdmissionResult<AdmissionApplicationRecord>> {
  return isSupabaseBackend() ? remote.withdraw(args) : local.withdraw(args);
}
