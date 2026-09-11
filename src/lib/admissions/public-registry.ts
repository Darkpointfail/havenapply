/**
 * Public residence directory backed by Supabase's real `communities` +
 * `community_profiles` tables.
 *
 * Replaces the static demo/CMS catalog (site-registry.ts / cms-nursing-homes.ts)
 * on public search/compare pages once NEXT_PUBLIC_DATA_BACKEND is "supabase".
 * Only verified, non-deleted communities are ever returned: this is public
 * data reachable by anonymous visitors, so the query filters on
 * status = 'verified' explicitly rather than relying only on RLS — a signed-in
 * staff member browsing these pages must not see their own unpublished draft
 * leak into a "public" result set (communities_public_select, migration 0006,
 * also allows is_org_member/is_community_staff to read their own draft rows).
 *
 * Field mapping is intentionally conservative: `communities` + `community_profiles`
 * don't carry every field the demo `Residence` fixture invented (nurses,
 * doctors, inspections, fabricated reviews, etc.) — those are left as empty/
 * neutral defaults rather than guessed. lat/lng default to 0 when a residence
 * hasn't set its coordinates yet, which only means it won't surface in a
 * distance-radius search until it does; it still shows up in plain listing
 * and text search.
 */
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/community-profile/repository";
import type { CommunityProfile } from "@/lib/community-portal";
import type { CareLevel, Residence } from "@/data/residences";

type Row = Record<string, unknown>;

const SELECT_COLUMNS =
  "id, name, description, address, city, state, zip, phone, email, latitude, longitude, starting_price, rating";

function num(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function roomTypeKind(name: string): "Private" | "Shared" {
  return name.toLowerCase().includes("shared") ? "Shared" : "Private";
}

function mapToResidence(row: Row, profile: CommunityProfile | null): Residence {
  const priceFrom = num(row.starting_price) ?? (profile?.roomTypes?.[0]?.price ?? null);
  const photos = profile?.photos ?? [];

  return {
    id: str(row.id),
    name: str(row.name) || profile?.name || "",
    city: str(row.city) || profile?.city || "",
    state: str(row.state) || profile?.state || "",
    zip: str(row.zip) || profile?.zip || "",
    region: str(row.state) || profile?.state || "",
    distanceKm: 0,
    distanceMiles: 0,
    lat: num(row.latitude) ?? 0,
    lng: num(row.longitude) ?? 0,
    priceFrom,
    priceAvailable: priceFrom != null,
    waitingWeeks: null,
    availableNow: profile?.acceptingApplications ?? true,
    availabilityConfirmed: false,
    careLevels: (profile?.careTypes ?? []) as CareLevel[],
    rating: num(row.rating) ?? 0,
    reviewCount: 0,
    roomTypes: [...new Set((profile?.roomTypes ?? []).map((r) => roomTypeKind(r.name)))],
    petFriendly: profile?.admissionFlags?.pets ?? false,
    languages: [],
    mealsIncluded: false,
    specialMeals: false,
    wheelchairAccessible: false,
    medicalServices: [],
    acceptsMedicaid: profile?.admissionFlags?.medicaid ?? false,
    acceptsVeteransBenefits: false,
    secureMemoryCare: false,
    transportAvailable: false,
    couplesWelcome: false,
    respiteAvailable: false,
    partner: false,
    highlights: [],
    image: photos[0] || "/community-photos/lobby.jpg",
    gallery: photos,
    about: profile?.description || str(row.description),
    staffRatio: "",
    doctors: [],
    nurses: [],
    therapists: [],
    amenities: profile?.amenities ?? [],
    activities: [],
    meals: [],
    includedServices: profile?.services ?? [],
    pricing: (profile?.roomTypes ?? []).map((r) => ({
      room: r.name,
      price: r.price ?? 0,
      notes: r.notes,
    })),
    inspections: [],
    reviews: [],
  };
}

/** Every publicly listed residence — verified, not deleted. Small result set; filter/sort in-process. */
export async function listPublicResidences(): Promise<Residence[]> {
  const client = await createClient();
  const { data } = await client
    .from("communities")
    .select(SELECT_COLUMNS)
    .eq("status", "verified")
    .is("deleted_at", null);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  const profiles = await Promise.all(rows.map((row) => getProfile(str(row.id))));
  return rows.map((row, i) => mapToResidence(row, profiles[i]));
}

/** A single publicly listed residence by id, or null if unknown/unpublished. */
export async function getPublicResidence(id: string): Promise<Residence | null> {
  const client = await createClient();
  const { data } = await client
    .from("communities")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .eq("status", "verified")
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;
  const row = data as Row;
  const profile = await getProfile(str(row.id));
  return mapToResidence(row, profile);
}
