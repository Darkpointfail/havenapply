/**
 * Server-side residence registry.
 *
 * A submission may only target a site that exists in a catalog the server
 * trusts: the Québec RPA public registry extract, or the curated demo
 * residences used by the console. The client's `siteId` is validated here — it
 * is never taken at face value.
 */

import { RESIDENCES as RPA_RESIDENCES } from "@/data/rpa-quebec";
import { residences as CURATED_RESIDENCES } from "@/data/residences";
import type { ResidenceSite } from "@/lib/admissions/types";

let index: Map<string, ResidenceSite> | null = null;

function buildIndex(): Map<string, ResidenceSite> {
  const map = new Map<string, ResidenceSite>();
  for (const residence of CURATED_RESIDENCES) {
    map.set(residence.id, { id: residence.id, name: residence.name, isActive: true });
  }
  for (const residence of RPA_RESIDENCES) {
    if (map.has(residence.id)) continue;
    map.set(residence.id, { id: residence.id, name: residence.name, isActive: true });
  }
  return map;
}

/** Resolve a site from the trusted catalogs. Null when the id is unknown. */
export function resolveKnownSite(siteId: string): ResidenceSite | null {
  if (!index) index = buildIndex();
  return index.get(siteId) ?? null;
}

export function knownSiteCount(): number {
  if (!index) index = buildIndex();
  return index.size;
}
