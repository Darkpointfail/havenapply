/**
 * Explicit development seeding.
 *
 * Nothing here runs automatically: an empty deployment stays empty. Seeded
 * applications are marked `isSeed` and their senior name is prefixed so a
 * reviewer can never mistake them for a real dossier.
 */

import { randomUUID } from "node:crypto";
import {
  insertSeedApplication,
  upsertMembership,
  upsertSite,
} from "@/lib/admissions/local-store";
import { resolveKnownSite } from "@/lib/admissions/site-registry";
import type { AdmissionApplicationRecord, StaffMembership } from "@/lib/admissions/types";

export const SEED_NAME_PREFIX = "[DÉMO] ";

export type SeedInput = {
  siteId: string;
  siteName?: string;
  staff: { userId: string; email: string; role?: StaffMembership["role"] }[];
  withApplications?: boolean;
  familyUserId?: string;
  familyEmail?: string;
};

export type SeedResult = {
  siteId: string;
  staffCount: number;
  applicationIds: string[];
};

function seedApplication(args: {
  siteId: string;
  siteName: string;
  familyUserId: string;
  familyEmail: string;
  seniorName: string;
  index: number;
}): AdmissionApplicationRecord {
  const at = new Date(Date.now() - args.index * 3600_000).toISOString();
  return {
    id: `adm_seed_${randomUUID()}`,
    familyUserId: args.familyUserId,
    familyEmail: args.familyEmail,
    siteId: args.siteId,
    siteName: args.siteName,
    clientRequestId: `seed-${args.siteId}-${args.index}`,
    publicRef: null,
    personRef: null,
    dossierRef: null,
    status: "submitted",
    senior: {
      name: `${SEED_NAME_PREFIX}${args.seniorName}`,
      age: 82,
      relationship: "Enfant",
      photoUrl: null,
    },
    summary: "Dossier de démonstration créé par le seed de développement.",
    careNeeds: ["Aide au bain", "Gestion des médicaments"],
    medicalHighlights: [],
    documents: [],
    familyContact: {
      name: `${SEED_NAME_PREFIX}Contact famille`,
      email: args.familyEmail,
      phone: "",
      relationship: "Enfant",
    },
    desiredMoveIn: null,
    waitlistPosition: null,
    decision: null,
    isSeed: true,
    createdAt: at,
    submittedAt: at,
    updatedAt: at,
  };
}

/** Caller must have already checked `admissionsSeedAllowed()`. */
export async function seedAdmissionsForDev(input: SeedInput): Promise<SeedResult> {
  const known = resolveKnownSite(input.siteId);
  const site = {
    id: input.siteId,
    name: input.siteName || known?.name || input.siteId,
    isActive: true,
  };
  await upsertSite(site);

  for (const member of input.staff) {
    await upsertMembership({
      id: `mem_${member.userId}_${site.id}`,
      userId: member.userId,
      email: member.email.toLowerCase(),
      siteId: site.id,
      role: member.role ?? "admin",
      status: "active",
    });
  }

  const applicationIds: string[] = [];
  if (input.withApplications) {
    const familyUserId = input.familyUserId || "seed-family";
    const familyEmail = input.familyEmail || "seed.family@havenapply.local";
    const names = ["Jeanne Tremblay", "Marcel Gagnon"];
    for (const [index, seniorName] of names.entries()) {
      const record = seedApplication({
        siteId: site.id,
        siteName: site.name,
        familyUserId,
        familyEmail,
        seniorName,
        index,
      });
      await insertSeedApplication(record);
      applicationIds.push(record.id);
    }
  }

  return { siteId: site.id, staffCount: input.staff.length, applicationIds };
}
