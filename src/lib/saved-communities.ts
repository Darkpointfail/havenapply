export const FAVORITE_TAGS = [
  { id: "top_choice", label: "Top choice" },
  { id: "tour_scheduled", label: "Tour scheduled" },
  { id: "affordable", label: "Affordable" },
  { id: "best_care_fit", label: "Best care fit" },
  { id: "family_favorite", label: "Family favorite" },
  { id: "waiting_response", label: "Waiting for response" },
] as const;

export type FavoriteTagId = (typeof FAVORITE_TAGS)[number]["id"];

export type SavedFavorite = {
  communityId: string;
  note: string;
  tags: FavoriteTagId[];
  sortOrder: number;
  sharedWithFamily: boolean;
  savedAt: string;
};

export function emptyFavorite(communityId: string, sortOrder = 0): SavedFavorite {
  return {
    communityId,
    note: "",
    tags: [],
    sortOrder,
    sharedWithFamily: false,
    savedAt: new Date().toISOString(),
  };
}

export function favoriteTagLabel(id: FavoriteTagId) {
  return FAVORITE_TAGS.find((t) => t.id === id)?.label || id;
}

export function migrateSavedFavorites(
  raw: Partial<{ savedFavorites: SavedFavorite[]; savedCommunityIds: string[] }>,
): SavedFavorite[] {
  if (Array.isArray(raw.savedFavorites) && raw.savedFavorites.length) {
    return raw.savedFavorites.map((f, i) => ({
      communityId: f.communityId,
      note: typeof f.note === "string" ? f.note : "",
      tags: Array.isArray(f.tags)
        ? f.tags.filter((t): t is FavoriteTagId =>
            FAVORITE_TAGS.some((opt) => opt.id === t),
          )
        : [],
      sortOrder: typeof f.sortOrder === "number" ? f.sortOrder : i,
      sharedWithFamily: Boolean(f.sharedWithFamily),
      savedAt: f.savedAt || new Date().toISOString(),
    }));
  }
  if (Array.isArray(raw.savedCommunityIds)) {
    return raw.savedCommunityIds.map((id, i) => emptyFavorite(id, i));
  }
  return [];
}

export function sortedFavorites(list: SavedFavorite[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.savedAt.localeCompare(b.savedAt));
}
