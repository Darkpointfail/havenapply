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

/**
 * Rich demo dossiers for presentations. Each profile is entirely fictional
 * (prefixed with SEED_NAME_PREFIX) but structured exactly like a real
 * family-submitted dossier, so a residence reviewer sees the full target
 * experience: identity, contacts, situation, care needs, housing
 * preferences, and document status.
 */
const RICH_SEED_PROFILES: Array<{
  seniorName: string;
  completenessDemo: "complete" | "partial";
  build: (familyEmail: string) => Omit<
    AdmissionApplicationRecord,
    | "id"
    | "familyUserId"
    | "familyEmail"
    | "siteId"
    | "siteName"
    | "clientRequestId"
    | "isSeed"
    | "createdAt"
    | "submittedAt"
    | "updatedAt"
  >;
}> = [
  {
    seniorName: "Jeanne Tremblay",
    completenessDemo: "complete",
    build: (familyEmail) => ({
      publicRef: null,
      personRef: null,
      dossierRef: null,
      status: "submitted",
      senior: {
        name: `${SEED_NAME_PREFIX}Jeanne Tremblay`,
        age: 84,
        relationship: "Mère",
        photoUrl: null,
      },
      summary:
        "Jeanne recherche un milieu de vie avec soins de niveau 2, proche de sa fille à Longueuil. Autonome aux transferts avec supervision, gestion de la médication à assumer par l'établissement.",
      careNeeds: [
        "Aide au bain",
        "Gestion des médicaments",
        "Supervision aux repas",
        "Aide à l'habillage",
      ],
      medicalHighlights: [
        "Hypertension contrôlée",
        "Début de trouble cognitif léger",
        "Antécédent de chute (janvier 2026)",
      ],
      documents: [
        { id: "doc-seed-id", name: "Carte d'assurance maladie (RAMQ)", category: "Identity", shared: true },
        { id: "doc-seed-med1", name: "Évaluation médicale (OEMC)", category: "Medical", shared: true },
        { id: "doc-seed-med2", name: "Liste de médicaments à jour", category: "Medical", shared: true },
        { id: "doc-seed-fin1", name: "Preuve de revenu (RRQ/SV)", category: "Financial", shared: true },
        { id: "doc-seed-legal1", name: "Procuration / mandat de protection", category: "Legal", shared: true },
      ],
      familyContact: {
        name: `${SEED_NAME_PREFIX}Marie Tremblay`,
        email: familyEmail,
        phone: "514-555-0142",
        relationship: "Fille",
        preferredLanguage: "Français",
        preferredContactMethod: "Téléphone",
        availability: "Semaine, 9h à 17h",
        decisionAuthority: true,
      },
      emergencyContact: {
        name: `${SEED_NAME_PREFIX}Paul Tremblay`,
        phone: "514-555-0198",
        relationship: "Fils",
        email: "paul.tremblay.demo@example.com",
      },
      consentToShare: true,
      dossier: {
        dateOfBirth: "1942-03-11",
        gender: "Féminin",
        primaryLanguage: "Français",
        maritalStatus: "Veuve",
        currentLivingSituation: "Vit seule, à domicile, avec soutien familial quotidien",
        primaryPhysician: `${SEED_NAME_PREFIX}Dr. A. Bélanger`,
        insurancePrimary: "RAMQ",
        pathologies: [
          { name: "Hypertension artérielle", status: "active" as const, notes: "Contrôlée" },
          { name: "Trouble cognitif léger", status: "active" as const, diagnosedYear: "2025" },
        ],
        medications: [
          { name: "Amlodipine", dose: "5mg", frequency: "1x/jour" },
          { name: "Donépézil", dose: "5mg", frequency: "1x/jour, le soir" },
        ],
        allergies: [{ substance: "Pénicilline", reaction: "Éruption cutanée", severity: "Modérée" }],
        adls: [
          { activity: "Transferts", level: "Autonome avec supervision" },
          { activity: "Hygiène", level: "Aide partielle" },
          { activity: "Habillage", level: "Aide partielle" },
          { activity: "Alimentation", level: "Autonome" },
        ],
        mobilityAids: ["Marchette"],
        diet: "Régime standard, texture régulière",
        continence: "Continente, supervision occasionnelle la nuit",
        cognitiveNotes: "Orientée dans le temps et l'espace, léger oubli à court terme",
        fallHistory: "Une chute à domicile en janvier 2026, sans blessure grave",
        socialSupports: "Fille présente quotidiennement, fils en soutien la fin de semaine",
        searchReason: "Perte d'autonomie progressive, épuisement du proche aidant",
        desiredMoveInTimeframe: "Dans les 30 jours",
        preferredLocations: ["Longueuil", "Rive-Sud de Montréal"],
        budgetMonthly: "2 200 $ à 2 800 $ / mois",
        fundingSources: ["Régie des rentes du Québec", "Sécurité de la vieillesse", "Épargne personnelle"],
        unitType: "Studio ou 1½",
        roomSharing: "Chambre privée uniquement",
        accessibilityNeeds: "Salle de bain adaptée, barres d'appui",
        importantPreferences: ["Proximité avec la famille", "Activités sociales en français", "Animaux de compagnie acceptés en visite"],
        nonNegotiables: ["Aucun partage de chambre"],
      },
      dossierSnapshot: null,
      desiredMoveIn: new Date(Date.now() + 30 * 24 * 3600_000).toISOString().slice(0, 10),
      waitlistPosition: null,
      decision: null,
    }),
  },
  {
    seniorName: "Marcel Gagnon",
    completenessDemo: "complete",
    build: (familyEmail) => ({
      publicRef: null,
      personRef: null,
      dossierRef: null,
      status: "under_review",
      senior: {
        name: `${SEED_NAME_PREFIX}Marcel Gagnon`,
        age: 79,
        relationship: "Père",
        photoUrl: null,
      },
      summary:
        "Marcel a été hospitalisé après une chute à domicile et ne peut plus vivre seul en toute sécurité. La famille a complété le dossier avec l'équipe de transition de l'hôpital; toutes les pièces requises ont été transmises.",
      careNeeds: [
        "Gestion des médicaments",
        "Aide aux repas",
        "Aide à la mobilité",
        "Supervision de la glycémie",
        "Aide partielle à l'hygiène",
      ],
      medicalHighlights: [
        "Diabète de type 2, insulinodépendant",
        "Hypertension artérielle",
        "Chute récente avec fracture du poignet (août 2026)",
      ],
      documents: [
        { id: "doc-seed-mg-id", name: "Carte d'assurance maladie (RAMQ)", category: "Identity", shared: true },
        { id: "doc-seed-mg-med1", name: "Évaluation médicale (OEMC)", category: "Medical", shared: true },
        { id: "doc-seed-mg-med2", name: "Liste de médicaments à jour", category: "Medical", shared: true },
        { id: "doc-seed-mg-fin1", name: "Preuve de revenu (RRQ/SV)", category: "Financial", shared: true },
        { id: "doc-seed-mg-legal1", name: "Procuration / mandat de protection", category: "Legal", shared: true },
      ],
      familyContact: {
        name: `${SEED_NAME_PREFIX}Luc Gagnon`,
        email: familyEmail,
        phone: "450-555-0177",
        relationship: "Fils",
        preferredLanguage: "Français",
        preferredContactMethod: "Téléphone",
        availability: "Soir et fin de semaine",
        decisionAuthority: true,
      },
      emergencyContact: {
        name: `${SEED_NAME_PREFIX}Diane Gagnon`,
        phone: "450-555-0188",
        relationship: "Fille",
        email: "diane.gagnon.demo@example.com",
      },
      consentToShare: true,
      dossier: {
        dateOfBirth: "1947-08-22",
        gender: "Masculin",
        primaryLanguage: "Français",
        maritalStatus: "Veuf",
        currentLivingSituation: "Présentement en centre hospitalier, sortie prévue sous 2 semaines",
        primaryPhysician: `${SEED_NAME_PREFIX}Dr. S. Boivin`,
        insurancePrimary: "RAMQ",
        pathologies: [
          { name: "Diabète de type 2", status: "active" as const, notes: "Insulinodépendant, suivi endocrinologie" },
          { name: "Hypertension artérielle", status: "active" as const },
          {
            name: "Fracture du poignet droit",
            status: "active" as const,
            diagnosedYear: "2026",
            notes: "Suite à une chute, consolidation en cours",
          },
        ],
        medications: [
          { name: "Metformine", dose: "500 mg", frequency: "2x/jour" },
          { name: "Insuline (Lantus)", dose: "12 unités", frequency: "1x/jour, au coucher" },
          { name: "Amlodipine", dose: "5 mg", frequency: "1x/jour, matin" },
        ],
        allergies: [{ substance: "Sulfamides", reaction: "Éruption cutanée", severity: "Légère" }],
        adls: [
          { activity: "Transferts", level: "Aide partielle (poignet en guérison)" },
          { activity: "Hygiène", level: "Aide partielle" },
          { activity: "Habillage", level: "Aide partielle" },
          { activity: "Alimentation", level: "Autonome, supervision glycémie" },
        ],
        mobilityAids: ["Canne", "Marchette temporaire (poignet)"],
        diet: "Régime diabétique, texture régulière",
        continence: "Continent",
        cognitiveNotes: "Orienté, aucun trouble cognitif identifié",
        fallHistory: "Chute à domicile en août 2026 ayant mené à l'hospitalisation actuelle",
        socialSupports: "Fils et fille impliqués, visites hebdomadaires prévues",
        searchReason: "Retour à domicile jugé non sécuritaire par l'équipe hospitalière",
        desiredMoveInTimeframe: "Dès que possible",
        preferredLocations: ["Longueuil", "Rive-Sud de Montréal"],
        budgetMonthly: "2 000 $ à 2 500 $ / mois",
        fundingSources: ["Régie des rentes du Québec", "Sécurité de la vieillesse"],
        unitType: "Studio",
        roomSharing: "Chambre privée uniquement",
        accessibilityNeeds: "Salle de bain adaptée, barres d'appui, aucun escalier",
        importantPreferences: ["Suivi diabétique sur place", "Proximité avec la famille", "Repas adaptés"],
        nonNegotiables: ["Aucun partage de chambre", "Accès sans escalier"],
      },
      dossierSnapshot: null,
      desiredMoveIn: new Date(Date.now() + 14 * 24 * 3600_000).toISOString().slice(0, 10),
      waitlistPosition: null,
      decision: null,
    }),
  },
];

function seedApplication(args: {
  siteId: string;
  siteName: string;
  familyUserId: string;
  familyEmail: string;
  seniorName: string;
  index: number;
}): AdmissionApplicationRecord {
  const at = new Date(Date.now() - args.index * 3600_000).toISOString();
  const profile = RICH_SEED_PROFILES[args.index] ?? RICH_SEED_PROFILES[0];
  const built = profile.build(args.familyEmail);
  return {
    id: `adm_seed_${randomUUID()}`,
    familyUserId: args.familyUserId,
    familyEmail: args.familyEmail,
    siteId: args.siteId,
    siteName: args.siteName,
    clientRequestId: `seed-${args.siteId}-${args.index}`,
    isSeed: true,
    createdAt: at,
    submittedAt: at,
    updatedAt: at,
    ...built,
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
    const names = RICH_SEED_PROFILES.map((p) => p.seniorName);
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
