/**
 * Supabase-backed store for community profiles.
 *
 * Backed by `community_profiles` (migration 0013): one row per residence,
 * the whole CommunityProfile stored as a jsonb blob rather than decomposed
 * into normalized tables — see that migration's comment for why. RLS
 * (also 0013) lets the public listing page read a verified residence's
 * profile directly, and lets a residence's own staff read/write their own
 * (including a draft not yet verified).
 */
import { createClient } from "@/lib/supabase/server";
import type { CommunityProfile } from "@/lib/community-portal";

type Row = { community_id: string; profile: unknown };

export async function getProfile(siteId: string): Promise<CommunityProfile | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("community_profiles")
    .select("community_id, profile")
    .eq("community_id", siteId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Row;
  if (!row.profile || typeof row.profile !== "object") return null;
  return row.profile as CommunityProfile;
}

export async function saveProfile(
  siteId: string,
  profile: CommunityProfile,
): Promise<CommunityProfile> {
  const client = await createClient();
  const { error } = await client
    .from("community_profiles")
    .upsert({ community_id: siteId, profile }, { onConflict: "community_id" });

  if (error) {
    throw new Error(error.message || "Unable to save the community profile.");
  }
  return profile;
}
