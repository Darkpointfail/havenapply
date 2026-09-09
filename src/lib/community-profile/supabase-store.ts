/**
 * Supabase-backed store for community profiles.
 *
 * Not implemented yet — deferred to the Supabase migration phase (Phase B
 * of the commercialization plan). Reads degrade gracefully to null (the
 * caller already knows how to fall back to catalog data), but a write
 * fails loudly instead of silently pretending to have saved anything, so
 * switching NEXT_PUBLIC_DATA_BACKEND to "supabase" before this lands can't
 * quietly lose a residence's edits.
 */
import type { CommunityProfile } from "@/lib/community-portal";

export async function getProfile(_siteId: string): Promise<CommunityProfile | null> {
  return null;
}

export async function saveProfile(
  _siteId: string,
  _profile: CommunityProfile,
): Promise<CommunityProfile> {
  throw new Error(
    "Community profile persistence is not implemented yet for the Supabase backend.",
  );
}
