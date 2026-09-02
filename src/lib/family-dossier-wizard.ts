/**
 * Map the French family-space dossier wizard ↔ ResidentDossier.
 * Uses a loose patch shape to avoid circular imports with family-space.ts.
 */
import {
  newContact,
  type ContactPerson,
  type ResidentDossier,
  type YesNoUnsure,
} from "@/lib/resident-dossier";

export type FamilyWizardPatch = {
  prenom?: string;
  nom?: string;
  dateNaissance?: string;
  sexe?: string;
  adresse?: string;
  ville?: string;
  province?: string;
  codePostal?: string;
  photo?: string | null;
  autonomie?: string;
  autonomyScore?: number | null;
  services?: string;
  searchSector?: string;
  searchRadiusKm?: number | null;
  searchBudgetMax?: number | null;
  searchSize?: "any" | "small" | "medium" | "large";
  searchMinRating?: number | null;
  priorityCare?: number;
  priorityGeo?: number;
  priorityBudget?: number;
  prioritySize?: number;
  priorityRating?: number;
  contactPrincipalNom?: string;
  contactPrincipalLien?: string;
  contactPrincipalTel?: string;
  contactPrincipalCourriel?: string;
  contactSecondaireNom?: string;
  contactSecondaireLien?: string;
  contactSecondaireTel?: string;
  contactSecondaireCourriel?: string;
  mandatProtection?: string;
  procuration?: string;
  curatelle?: string;
  directivesMedicales?: string;
  nomMandataire?: string;
  assuranceMaladie?: string;
  assurancePrivee?: string;
  numeroPolice?: string;
  assuranceVie?: string;
  revenusMensuels?: string;
  sourcesRevenus?: string;
  garantFinancier?: string;
  modePaiement?: string;
  mobilite?: string;
  aideRepas?: string;
  aideHygiene?: string;
  aideMedication?: string;
  allergies?: string;
  regimeAlimentaire?: string;
  consentPartage?: boolean;
  signatureNom?: string;
  signatureDate?: string;
};

function yesNoUnsure(value: string | undefined): YesNoUnsure {
  const s = (value || "").trim().toLowerCase();
  if (!s) return "";
  if (["oui", "yes", "o", "y", "true", "1"].includes(s)) return "yes";
  if (["non", "no", "n", "false", "0"].includes(s)) return "no";
  if (["à préciser", "a preciser", "unsure", "nsp", "je ne sais pas"].includes(s)) return "unsure";
  // Free-text answers still count as "yes" when they look affirmative beyond Oui/Non
  return "unsure";
}

function fromYesNoUnsure(v: YesNoUnsure | undefined, detail?: string): string {
  if (detail && detail.trim()) return detail.trim();
  if (v === "yes") return "Oui";
  if (v === "no") return "Non";
  if (v === "unsure") return "To be determined";
  return "";
}

function touchContact(
  existing: ContactPerson | null | undefined,
  patch: Partial<ContactPerson>,
): ContactPerson {
  const base = existing ?? newContact();
  return {
    ...base,
    ...patch,
    id: base.id || newContact().id,
  };
}

const EMPTY_WIZARD_FIELDS: {
  contactPrincipalNom: string;
  contactPrincipalLien: string;
  contactPrincipalTel: string;
  contactPrincipalCourriel: string;
  contactSecondaireNom: string;
  contactSecondaireLien: string;
  contactSecondaireTel: string;
  contactSecondaireCourriel: string;
  mandatProtection: string;
  procuration: string;
  curatelle: string;
  directivesMedicales: string;
  nomMandataire: string;
  assuranceMaladie: string;
  assurancePrivee: string;
  numeroPolice: string;
  assuranceVie: string;
  revenusMensuels: string;
  sourcesRevenus: string;
  garantFinancier: string;
  modePaiement: string;
  mobilite: string;
  aideRepas: string;
  aideHygiene: string;
  aideMedication: string;
  allergies: string;
  regimeAlimentaire: string;
  autonomyScore: number | null;
  searchSector: string;
  searchRadiusKm: number | null;
  searchBudgetMax: number | null;
  searchSize: "any" | "small" | "medium" | "large";
  searchMinRating: number | null;
  priorityCare: number;
  priorityGeo: number;
  priorityBudget: number;
  prioritySize: number;
  priorityRating: number;
  consentPartage: boolean;
  signatureNom: string;
  signatureDate: string;
} = {
  contactPrincipalNom: "",
  contactPrincipalLien: "",
  contactPrincipalTel: "",
  contactPrincipalCourriel: "",
  contactSecondaireNom: "",
  contactSecondaireLien: "",
  contactSecondaireTel: "",
  contactSecondaireCourriel: "",
  mandatProtection: "",
  procuration: "",
  curatelle: "",
  directivesMedicales: "",
  nomMandataire: "",
  assuranceMaladie: "RAMQ",
  assurancePrivee: "",
  numeroPolice: "",
  assuranceVie: "",
  revenusMensuels: "",
  sourcesRevenus: "",
  garantFinancier: "",
  modePaiement: "",
  mobilite: "",
  aideRepas: "",
  aideHygiene: "",
  aideMedication: "",
  allergies: "",
  regimeAlimentaire: "",
  autonomyScore: null,
  searchSector: "",
  searchRadiusKm: null,
  searchBudgetMax: null,
  searchSize: "any",
  searchMinRating: null,
  priorityCare: 5,
  priorityGeo: 4,
  priorityBudget: 3,
  prioritySize: 2,
  priorityRating: 2,
  consentPartage: false,
  signatureNom: "",
  signatureDate: "",
};

export type FamilyWizardFields = typeof EMPTY_WIZARD_FIELDS;

export function emptyWizardFields(): FamilyWizardFields {
  return { ...EMPTY_WIZARD_FIELDS };
}

/** Hydrate wizard-only FamilyProfile fields from the persisted resident dossier. */
export function wizardFieldsFromDossier(d: ResidentDossier): FamilyWizardFields {
  const ec = d.emergencyContact;
  const sc = d.secondaryContact;
  const guarantor =
    d.familyMembers.find((c) => c.isFinancialGuarantor)?.name ||
    d.legalContacts.find((c) => c.isFinancialGuarantor)?.name ||
    "";

  const directives =
    d.advanceDirectives.length > 0
      ? d.advanceDirectives.join(", ")
      : fromYesNoUnsure(d.hasHealthcareProxy);

  const autonomyScore = (() => {
    const m = String(d.autonomyLevel || "").match(/^(\d{1,2})\s*\/\s*10/);
    if (m) {
      const n = Number(m[1]);
      return n >= 1 && n <= 10 ? n : null;
    }
    return null;
  })();

  const matchMeta = (() => {
    const raw = d.specialPreferencesNotes || "";
    const m = raw.match(/matchWeights:(\{[^}]+\})/);
    if (!m) return null;
    try {
      return JSON.parse(m[1]!) as Record<string, number | string | null>;
    } catch {
      return null;
    }
  })();

  const sizePref = (d.specialPreferences || []).find((p) => p.startsWith("size:"));
  const size = (sizePref?.replace("size:", "") || "any") as FamilyWizardFields["searchSize"];

  const budgetN = Number(String(d.budgetMax || d.maxMonthlyBudget || "").replace(/\s/g, ""));

  return {
    contactPrincipalNom: ec?.name || "",
    contactPrincipalLien: ec?.relationship || "",
    contactPrincipalTel: ec?.phone || ec?.cellPhone || "",
    contactPrincipalCourriel: ec?.email || "",
    contactSecondaireNom: sc?.name || "",
    contactSecondaireLien: sc?.relationship || "",
    contactSecondaireTel: sc?.phone || sc?.cellPhone || "",
    contactSecondaireCourriel: sc?.email || "",
    mandatProtection: fromYesNoUnsure(d.hasGuardianOrPoa),
    procuration: fromYesNoUnsure(d.hasFinancialPoa, d.financialPoaName ? "Oui" : ""),
    curatelle: fromYesNoUnsure(d.hasLegalGuardian),
    directivesMedicales: directives === "Oui" ? "Oui" : directives,
    nomMandataire:
      d.healthcareProxyName || d.financialPoaName || d.legalGuardianName || "",
    assuranceMaladie: d.insurance || "RAMQ",
    assurancePrivee: d.supplementalInsuranceCompany || "",
    numeroPolice: d.supplementalPolicyId || "",
    assuranceVie: d.lifeInsuranceCompany || "",
    revenusMensuels: d.monthlyIncome || "",
    sourcesRevenus:
      [d.incomeSocialSecurity, d.incomePension, d.incomeVa, d.incomeOther]
        .filter((x) => x && String(x).trim())
        .join(" · ") || d.governmentAssistance || "",
    garantFinancier: guarantor,
    modePaiement: d.primaryPayor || "",
    mobilite: d.mobility || "",
    aideRepas: d.adls?.eating || "",
    aideHygiene: d.adls?.bathing || "",
    aideMedication:
      d.specialCareNeeds.match(/^Aide à la médication:\s*(.*)$/m)?.[1]?.trim() || "",
    allergies: d.allergies || "",
    regimeAlimentaire: d.dietaryRequirements || (d.nutrition || []).join(", "),
    autonomyScore,
    searchSector: d.preferredCities || "",
    searchRadiusKm:
      d.maxDistanceMiles > 0 ? Math.round(d.maxDistanceMiles * 1.609) : null,
    searchBudgetMax: Number.isFinite(budgetN) && budgetN > 0 ? budgetN : null,
    searchSize: ["any", "small", "medium", "large"].includes(size) ? size : "any",
    searchMinRating:
      typeof matchMeta?.minRating === "number" ? matchMeta.minRating : null,
    priorityCare: Number(matchMeta?.care) || 5,
    priorityGeo: Number(matchMeta?.geo) || 4,
    priorityBudget: Number(matchMeta?.budget) || 3,
    prioritySize: Number(matchMeta?.size) || 2,
    priorityRating: Number(matchMeta?.rating) || 2,
    consentPartage: Boolean(d.acknowledgementSigned),
    signatureNom: d.signatureName || "",
    signatureDate: d.signatureDate || "",
  };
}

/**
 * Apply a partial FamilyProfile wizard patch onto a ResidentDossier.
 * Identity fields (prenom/nom/adresse/…) are also written so dossier stays in sync.
 */
export function applyFamilyPatchToDossier(
  dossier: ResidentDossier,
  patch: FamilyWizardPatch,
): ResidentDossier {
  let next: ResidentDossier = { ...dossier, adls: { ...dossier.adls } };

  if (patch.prenom !== undefined) next.firstName = patch.prenom;
  if (patch.nom !== undefined) next.lastName = patch.nom;
  if (patch.dateNaissance !== undefined) next.dateOfBirth = patch.dateNaissance;
  if (patch.sexe !== undefined) next.gender = patch.sexe;
  if (patch.adresse !== undefined) next.address = patch.adresse;
  if (patch.ville !== undefined) next.city = patch.ville;
  if (patch.province !== undefined) next.state = patch.province;
  if (patch.codePostal !== undefined) next.zip = patch.codePostal;
  if (patch.photo !== undefined) next.photoDataUrl = patch.photo || "";
  if (patch.autonomie !== undefined) next.autonomyLevel = patch.autonomie;
  if (patch.autonomyScore !== undefined) {
    if (patch.autonomyScore != null && patch.autonomyScore >= 1 && patch.autonomyScore <= 10) {
      const label =
        patch.autonomyScore <= 3
          ? "peu autonome"
          : patch.autonomyScore <= 6
            ? "semi-autonome"
            : patch.autonomyScore <= 8
              ? "assez autonome"
              : "très autonome";
      next.autonomyLevel = `${patch.autonomyScore}/10 — ${label}`;
    }
  }

  if (patch.searchSector !== undefined) next.preferredCities = patch.searchSector;
  if (patch.searchRadiusKm !== undefined) {
    next.maxDistanceMiles =
      patch.searchRadiusKm != null && patch.searchRadiusKm > 0
        ? Math.round(patch.searchRadiusKm / 1.609)
        : 0;
  }
  if (patch.searchBudgetMax !== undefined) {
    const v =
      patch.searchBudgetMax != null && patch.searchBudgetMax > 0
        ? String(patch.searchBudgetMax)
        : "";
    next.budgetMax = v;
    next.maxMonthlyBudget = v;
  }
  if (patch.searchSize !== undefined) {
    const others = (next.specialPreferences || []).filter((p) => !p.startsWith("size:"));
    next.specialPreferences =
      patch.searchSize && patch.searchSize !== "any"
        ? [...others, `size:${patch.searchSize}`]
        : others;
  }
  if (
    patch.priorityCare !== undefined ||
    patch.priorityGeo !== undefined ||
    patch.priorityBudget !== undefined ||
    patch.prioritySize !== undefined ||
    patch.priorityRating !== undefined ||
    patch.searchMinRating !== undefined
  ) {
    const prev = (() => {
      const m = (next.specialPreferencesNotes || "").match(/matchWeights:(\{[^}]+\})/);
      if (!m) return {} as Record<string, number | null>;
      try {
        return JSON.parse(m[1]!) as Record<string, number | null>;
      } catch {
        return {} as Record<string, number | null>;
      }
    })();
    const payload = {
      care: patch.priorityCare ?? prev.care ?? 5,
      geo: patch.priorityGeo ?? prev.geo ?? 4,
      budget: patch.priorityBudget ?? prev.budget ?? 3,
      size: patch.prioritySize ?? prev.size ?? 2,
      rating: patch.priorityRating ?? prev.rating ?? 2,
      minRating: patch.searchMinRating !== undefined ? patch.searchMinRating : prev.minRating ?? null,
    };
    const cleaned = (next.specialPreferencesNotes || "")
      .replace(/matchWeights:\{[^}]+\}/g, "")
      .trim();
    next.specialPreferencesNotes = [cleaned, `matchWeights:${JSON.stringify(payload)}`]
      .filter(Boolean)
      .join("\n");
  }

  if (
    patch.contactPrincipalNom !== undefined ||
    patch.contactPrincipalLien !== undefined ||
    patch.contactPrincipalTel !== undefined ||
    patch.contactPrincipalCourriel !== undefined
  ) {
    next.emergencyContact = touchContact(next.emergencyContact, {
      name: patch.contactPrincipalNom ?? next.emergencyContact?.name ?? "",
      relationship:
        patch.contactPrincipalLien ?? next.emergencyContact?.relationship ?? "",
      phone: patch.contactPrincipalTel ?? next.emergencyContact?.phone ?? "",
      email: patch.contactPrincipalCourriel ?? next.emergencyContact?.email ?? "",
      isEmergency: true,
    });
  }

  if (
    patch.contactSecondaireNom !== undefined ||
    patch.contactSecondaireLien !== undefined ||
    patch.contactSecondaireTel !== undefined ||
    patch.contactSecondaireCourriel !== undefined
  ) {
    next.secondaryContact = touchContact(next.secondaryContact, {
      name: patch.contactSecondaireNom ?? next.secondaryContact?.name ?? "",
      relationship:
        patch.contactSecondaireLien ?? next.secondaryContact?.relationship ?? "",
      phone: patch.contactSecondaireTel ?? next.secondaryContact?.phone ?? "",
      email: patch.contactSecondaireCourriel ?? next.secondaryContact?.email ?? "",
    });
  }

  if (patch.mandatProtection !== undefined) {
    next.hasGuardianOrPoa = yesNoUnsure(patch.mandatProtection);
  }
  if (patch.procuration !== undefined) {
    next.hasFinancialPoa = yesNoUnsure(patch.procuration);
  }
  if (patch.curatelle !== undefined) {
    next.hasLegalGuardian = yesNoUnsure(patch.curatelle);
  }
  if (patch.directivesMedicales !== undefined) {
    const raw = patch.directivesMedicales.trim();
    const flag = yesNoUnsure(raw);
    next.hasHealthcareProxy = flag === "yes" || raw.length > 0 ? (flag || "yes") : flag;
    if (raw && !["oui", "non", "à préciser", "yes", "no"].includes(raw.toLowerCase())) {
      next.advanceDirectives = Array.from(
        new Set([...(next.advanceDirectives || []), "living_will"]),
      );
      next.medicalNotes = [next.medicalNotes, `Directives: ${raw}`]
        .filter((x) => x && String(x).trim())
        .join("\n");
    } else if (flag === "yes") {
      next.advanceDirectives = Array.from(
        new Set([...(next.advanceDirectives || []), "living_will"]),
      );
    } else if (flag === "no") {
      next.advanceDirectives = [];
    }
  }
  if (patch.nomMandataire !== undefined) {
    next.healthcareProxyName = patch.nomMandataire;
    if (!next.financialPoaName) next.financialPoaName = patch.nomMandataire;
    if (!next.legalGuardianName) next.legalGuardianName = patch.nomMandataire;
  }

  if (patch.assuranceMaladie !== undefined) next.insurance = patch.assuranceMaladie;
  if (patch.assurancePrivee !== undefined) {
    next.supplementalInsuranceCompany = patch.assurancePrivee;
  }
  if (patch.numeroPolice !== undefined) next.supplementalPolicyId = patch.numeroPolice;
  if (patch.assuranceVie !== undefined) next.lifeInsuranceCompany = patch.assuranceVie;

  if (patch.revenusMensuels !== undefined) next.monthlyIncome = patch.revenusMensuels;
  if (patch.sourcesRevenus !== undefined) {
    next.governmentAssistance = patch.sourcesRevenus;
    next.incomeOther = patch.sourcesRevenus;
  }
  if (patch.modePaiement !== undefined) next.primaryPayor = patch.modePaiement;
  if (patch.garantFinancier !== undefined) {
    const name = patch.garantFinancier.trim();
    const others = next.familyMembers.filter((c) => !c.isFinancialGuarantor);
    if (name) {
      const prior = next.familyMembers.find((c) => c.isFinancialGuarantor) || null;
      next.familyMembers = [
        ...others,
        touchContact(prior, { name, isFinancialGuarantor: true }),
      ];
    } else {
      next.familyMembers = others;
    }
  }

  if (patch.mobilite !== undefined) next.mobility = patch.mobilite;
  if (patch.aideRepas !== undefined) next.adls = { ...next.adls, eating: patch.aideRepas };
  if (patch.aideHygiene !== undefined) next.adls = { ...next.adls, bathing: patch.aideHygiene };
  if (patch.aideMedication !== undefined) {
    const v = patch.aideMedication.trim();
    next.specialCareNeeds = v
      ? `Aide à la médication: ${v}`
      : next.specialCareNeeds.replace(/^Aide à la médication:.*$/m, "").trim();
  }
  if (patch.allergies !== undefined) next.allergies = patch.allergies;
  if (patch.regimeAlimentaire !== undefined) {
    next.dietaryRequirements = patch.regimeAlimentaire;
  }
  if (patch.services !== undefined && patch.services.trim()) {
    next.specialCareNeeds = [next.specialCareNeeds, `Services: ${patch.services}`]
      .filter((x) => x && String(x).trim())
      .join("\n");
  }

  if (patch.consentPartage !== undefined) {
    next.acknowledgementSigned = Boolean(patch.consentPartage);
  }
  if (patch.signatureNom !== undefined) next.signatureName = patch.signatureNom;
  if (patch.signatureDate !== undefined) next.signatureDate = patch.signatureDate;

  return next;
}
