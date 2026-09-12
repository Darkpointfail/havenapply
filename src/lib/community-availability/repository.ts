/**
 * Backend-agnostic availability repository.
 * Mirrors community-profile/repository.ts and admissions/repository.ts: one
 * facade, two stores, selected by NEXT_PUBLIC_DATA_BACKEND.
 */
import { isSupabaseBackend } from "@/lib/supabase/config";
import * as local from "@/lib/community-availability/local-store";
import * as remote from "@/lib/community-availability/supabase-store";
import type { AvailabilityUnit } from "@/lib/community-portal";

export function listAvailability(siteId: string): Promise<AvailabilityUnit[]> {
  return isSupabaseBackend() ? remote.listAvailability(siteId) : local.listAvailability(siteId);
}

export async function upsertAvailability(
  siteId: string,
  unit: AvailabilityUnit,
): Promise<{ ok: true; unit: AvailabilityUnit } | { ok: false; error: string }> {
  if (isSupabaseBackend()) return remote.upsertAvailability(siteId, unit);
  const saved = await local.upsertAvailability(siteId, unit);
  return { ok: true, unit: saved };
}

export function removeAvailability(
  siteId: string,
  unitId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return isSupabaseBackend()
    ? remote.removeAvailability(siteId, unitId)
    : local.removeAvailability(siteId, unitId);
}
