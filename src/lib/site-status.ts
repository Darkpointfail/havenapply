import type { SiteStatus } from "@prisma/client";

const TRANSITIONS: Record<SiteStatus, SiteStatus[]> = {
  DRAFT: ["PENDING_VERIFICATION", "ARCHIVED"],
  PENDING_VERIFICATION: ["VERIFIED", "DRAFT", "ARCHIVED"],
  VERIFIED: ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "ARCHIVED"],
  ACTIVE: ["SUSPENDED", "ARCHIVED", "VERIFIED"],
  SUSPENDED: ["ACTIVE", "VERIFIED", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionSiteStatus(from: SiteStatus, to: SiteStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertSiteStatusTransition(from: SiteStatus, to: SiteStatus) {
  if (!canTransitionSiteStatus(from, to)) {
    throw new Error(`INVALID_SITE_TRANSITION:${from}->${to}`);
  }
}

/** Mirror legacy booleans from authoritative status. */
export function legacyFlagsForStatus(status: SiteStatus): {
  isActive: boolean;
  isVerified: boolean;
} {
  switch (status) {
    case "ACTIVE":
      return { isActive: true, isVerified: true };
    case "VERIFIED":
      return { isActive: false, isVerified: true };
    case "SUSPENDED":
      return { isActive: false, isVerified: true };
    default:
      return { isActive: false, isVerified: false };
  }
}

export function isPublicCatalogStatus(status: SiteStatus): boolean {
  return status === "ACTIVE";
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "site";
}
