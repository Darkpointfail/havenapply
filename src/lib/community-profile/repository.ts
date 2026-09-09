/**
 * Backend-agnostic community-profile repository.
 * Mirrors src/lib/admissions/repository.ts and
 * src/lib/messaging-server/repository.ts: one facade, two stores, selected
 * by NEXT_PUBLIC_DATA_BACKEND.
 */
import { isSupabaseBackend } from "@/lib/supabase/config";
import * as local from "@/lib/community-profile/local-store";
import * as remote from "@/lib/community-profile/supabase-store";
import type { CommunityProfile } from "@/lib/community-portal";

export function getProfile(siteId: string): Promise<CommunityProfile | null> {
  return isSupabaseBackend() ? remote.getProfile(siteId) : local.getProfile(siteId);
}

export function saveProfile(
  siteId: string,
  profile: CommunityProfile,
): Promise<CommunityProfile> {
  return isSupabaseBackend()
    ? remote.saveProfile(siteId, profile)
    : local.saveProfile(siteId, profile);
}
