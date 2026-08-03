/** Resident dossier wizard — fill once, send to many communities */

import type { CareNeeds, AdlActivityId, AdlLevel } from "@/lib/care-needs";
import { emptyCareNeeds } from "@/lib/care-needs";
import type { SeniorProfile } from "@/lib/senior-profile";
import { emptySeniorProfile } from "@/lib/senior-profile";
import type { DocCategoryId, VaultDocument } from "@/lib/document-vault";
import type { ApplicationStatus } from "@/data/applications";

export type ContactPerson = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isEmergency?: boolean;
  isGuardian?: boolean;
  isPoa?: boolean;
};

export type HealthcareProfessional = {
  id: string;
  role:
    | "primary_physician"
    | "social_worker"
    | "hospital"
    | "case_manager"
    | "care_coordinator"
    | "specialist"
    | "other";
  name: string;
  organization: string;
  phone: string;
  email: string;
};

export const LIVING_SITUATION_OPTIONS = [
  { id: "home", label: "Home" },
  { id: "hospital", label: "Hospital" },
  { id: "rehab", label: "Rehabilitation Center" },
  { id: "assisted", label: "Assisted Living" },
  { id: "nursing", label: "Nursing Home" },
  { id: "family", label: "Living with Family" },
  { id: "other", label: "Other" },
] as const;

export const MOBILITY_CARD_OPTIONS = [
  { id: "independent", label: "Independent", hint: "Walks without help" },
  { id: "cane", label: "Cane", hint: "Uses a cane" },
  { id: "walker", label: "Walker", hint: "Uses a walker" },
  { id: "wheelchair", label: "Wheelchair", hint: "Uses a wheelchair" },
  { id: "bedbound", label: "Bedbound", hint: "Mostly in bed" },
] as const;

export const ADL_CARD_ACTIVITIES = [
  { id: "bathing", label: "Bathing" },
  { id: "dressing", label: "Dressing" },
  { id: "toileting", label: "Toileting" },
  { id: "eating", label: "Eating" },
  { id: "transfers", label: "Transfers" },
] as const;

export const ADL_ASSIST_LEVELS = [
  { id: "independent", label: "Independent" },
  { id: "some", label: "Some help" },
  { id: "dependent", label: "Full help" },
] as const;

export const CONTINENCE_OPTIONS = [
  { id: "continent", label: "Continent" },
  { id: "occasional", label: "Occasional accidents" },
  { id: "incontinent", label: "Needs continence care" },
] as const;

export const MEMORY_OPTIONS = [
  { id: "memory_loss", label: "Memory loss" },
  { id: "dementia", label: "Dementia" },
  { id: "alzheimers", label: "Alzheimer's" },
  { id: "confusion", label: "Confusion" },
] as const;

export const NUTRITION_OPTIONS = [
  { id: "normal", label: "Normal diet" },
  { id: "soft", label: "Soft diet" },
  { id: "thickened", label: "Thickened liquids" },
  { id: "feeding_assist", label: "Feeding assistance" },
] as const;

export const COMMUNITY_TYPE_OPTIONS = [
  { id: "independent", label: "Independent Living" },
  { id: "assisted", label: "Assisted Living" },
  { id: "memory", label: "Memory Care" },
  { id: "nursing", label: "Skilled Nursing" },
  { id: "rehab", label: "Rehabilitation" },
  { id: "other", label: "Other" },
] as const;

export const ROOM_PREFERENCE_OPTIONS = [
  { id: "private", label: "Private room" },
  { id: "shared", label: "Shared room" },
  { id: "suite", label: "Suite / apartment" },
  { id: "couples", label: "Couples accommodation" },
  { id: "flexible", label: "Flexible" },
] as const;

export const SPECIAL_PREFERENCE_OPTIONS = [
  { id: "pets", label: "Pets allowed" },
  { id: "french", label: "French speaking" },
  { id: "religious", label: "Religious affiliation" },
  { id: "private_room", label: "Private room" },
  { id: "couples", label: "Couples accommodation" },
  { id: "outdoor", label: "Outdoor spaces" },
] as const;

/** Dossier document categories (mapped to vault categories) */
export const DOSSIER_DOC_CATEGORIES: {
  id: string;
  label: string;
  vault: DocCategoryId;
  recommended: boolean;
}[] = [
  { id: "insurance", label: "Insurance", vault: "insurance_card", recommended: true },
  { id: "id", label: "ID", vault: "identification", recommended: true },
  { id: "medication_list", label: "Medication List", vault: "medication_list", recommended: true },
  { id: "physician_orders", label: "Physician Orders", vault: "physician_report", recommended: true },
  { id: "hospital_records", label: "Hospital Records", vault: "discharge", recommended: false },
  { id: "assessment", label: "Assessment", vault: "care_assessment", recommended: false },
  { id: "financial", label: "Financial Documents", vault: "financial", recommended: false },
  { id: "legal", label: "Legal Documents", vault: "power_of_attorney", recommended: false },
  { id: "other", label: "Other", vault: "other", recommended: false },
];

export const DOSSIER_STEPS = [
  { id: "resident", title: "Resident Information", short: "Resident", minutes: 2 },
  { id: "health", title: "Health Information", short: "Health", minutes: 2 },
  { id: "care", title: "Daily Living & Care Needs", short: "Care", minutes: 2 },
  { id: "looking", title: "What They're Looking For", short: "Looking for", minutes: 2 },
  { id: "financial", title: "Financial Information", short: "Financial", minutes: 1 },
  { id: "documents", title: "Documents", short: "Documents", minutes: 2 },
  { id: "team", title: "Healthcare Team", short: "Team", minutes: 1 },
  { id: "review", title: "Review", short: "Review", minutes: 1 },
  { id: "submit", title: "Submit Applications", short: "Submit", minutes: 2 },
] as const;

export type DossierStepId = (typeof DOSSIER_STEPS)[number]["id"];

export type ResidentDossier = {
  stepIndex: number;
  startedAt: string | null;
  lastSavedAt: string | null;
  completedAt: string | null;

  // 1. Resident
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  primaryLanguage: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  livingSituation: string;
  livingSituationOther: string;
  emergencyContact: ContactPerson | null;
  familyMembers: ContactPerson[];
  hasGuardianOrPoa: "" | "yes" | "no" | "unsure";
  legalContacts: ContactPerson[];

  // 2. Health
  medicalConditions: string;
  diagnoses: string;
  allergies: string;
  currentMedications: string;
  pastSurgeries: string;
  recentHospitalizations: string;
  vaccinationStatus: string;
  height: string;
  weight: string;
  medicalNotes: string;

  // 3. Care needs
  mobility: string;
  adls: Record<(typeof ADL_CARD_ACTIVITIES)[number]["id"], string>;
  continence: string;
  memoryCognition: string[];
  behavioralConcerns: string;
  nutrition: string[];
  fallRisk: "" | "yes" | "no" | "unsure";
  specialCareNeeds: string;

  // 4. Looking for
  communityTypes: string[];
  desiredMoveIn: string;
  preferredCities: string;
  maxDistanceMiles: number;
  budgetMin: string;
  budgetMax: string;
  roomPreference: string;
  specialPreferences: string[];
  specialPreferencesNotes: string;

  // 5. Financial
  monthlyIncome: string;
  insurance: string;
  governmentAssistance: string;
  veteransBenefits: "" | "yes" | "no" | "unsure";
  longTermCareInsurance: "" | "yes" | "no" | "unsure";
  maxMonthlyBudget: string;
  financialNotes: string;

  // 7. Team
  healthcareTeam: HealthcareProfessional[];

  // Selection for multi-submit
  selectedCommunityIds: string[];
};

export function newContact(partial?: Partial<ContactPerson>): ContactPerson {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    relationship: "",
    phone: "",
    email: "",
    ...partial,
  };
}

export function newProfessional(
  role: HealthcareProfessional["role"] = "specialist",
): HealthcareProfessional {
  return {
    id: `hp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    name: "",
    organization: "",
    phone: "",
    email: "",
  };
}

export function emptyResidentDossier(): ResidentDossier {
  const adls = {} as ResidentDossier["adls"];
  ADL_CARD_ACTIVITIES.forEach((a) => {
    adls[a.id] = "";
  });
  return {
    stepIndex: 0,
    startedAt: null,
    lastSavedAt: null,
    completedAt: null,
    firstName: "",
    lastName: "",
    preferredName: "",
    dateOfBirth: "",
    gender: "",
    primaryLanguage: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    livingSituation: "",
    livingSituationOther: "",
    emergencyContact: null,
    familyMembers: [],
    hasGuardianOrPoa: "",
    legalContacts: [],
    medicalConditions: "",
    diagnoses: "",
    allergies: "",
    currentMedications: "",
    pastSurgeries: "",
    recentHospitalizations: "",
    vaccinationStatus: "",
    height: "",
    weight: "",
    medicalNotes: "",
    mobility: "",
    adls,
    continence: "",
    memoryCognition: [],
    behavioralConcerns: "",
    nutrition: [],
    fallRisk: "",
    specialCareNeeds: "",
    communityTypes: [],
    desiredMoveIn: "",
    preferredCities: "",
    maxDistanceMiles: 25,
    budgetMin: "",
    budgetMax: "",
    roomPreference: "",
    specialPreferences: [],
    specialPreferencesNotes: "",
    monthlyIncome: "",
    insurance: "",
    governmentAssistance: "",
    veteransBenefits: "",
    longTermCareInsurance: "",
    maxMonthlyBudget: "",
    financialNotes: "",
    healthcareTeam: [],
    selectedCommunityIds: [],
  };
}

export function migrateResidentDossier(raw?: Partial<ResidentDossier> | null): ResidentDossier {
  const base = emptyResidentDossier();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    adls: { ...base.adls, ...(raw.adls || {}) },
    familyMembers: Array.isArray(raw.familyMembers) ? raw.familyMembers : [],
    legalContacts: Array.isArray(raw.legalContacts) ? raw.legalContacts : [],
    memoryCognition: Array.isArray(raw.memoryCognition) ? raw.memoryCognition : [],
    nutrition: Array.isArray(raw.nutrition) ? raw.nutrition : [],
    communityTypes: Array.isArray(raw.communityTypes) ? raw.communityTypes : [],
    specialPreferences: Array.isArray(raw.specialPreferences) ? raw.specialPreferences : [],
    healthcareTeam: Array.isArray(raw.healthcareTeam) ? raw.healthcareTeam : [],
    selectedCommunityIds: Array.isArray(raw.selectedCommunityIds)
      ? raw.selectedCommunityIds
      : [],
    emergencyContact: raw.emergencyContact ?? null,
  };
}

/** Seed dossier from existing senior + care needs when opening wizard. */
export function seedDossierFromFamily(
  senior: SeniorProfile,
  care: CareNeeds,
  existing?: ResidentDossier | null,
): ResidentDossier {
  const d = existing && (existing.firstName || existing.startedAt)
    ? migrateResidentDossier(existing)
    : emptyResidentDossier();

  if (!d.firstName && senior.firstName) d.firstName = senior.firstName;
  if (!d.lastName && senior.lastName) d.lastName = senior.lastName;
  if (!d.preferredName && senior.firstName) d.preferredName = senior.firstName;
  if (!d.dateOfBirth && senior.dateOfBirth) d.dateOfBirth = senior.dateOfBirth;
  if (!d.gender && senior.gender) d.gender = senior.gender;
  if (!d.primaryLanguage && senior.primaryLanguage) d.primaryLanguage = senior.primaryLanguage;
  if (!d.phone && senior.phone) d.phone = senior.phone;
  if (!d.email && senior.email) d.email = senior.email;
  if (!d.address && senior.address) d.address = senior.address;
  if (!d.city && senior.city) d.city = senior.city;
  if (!d.state && senior.state) d.state = senior.state;
  if (!d.zip && senior.zip) d.zip = senior.zip;

  if (!d.livingSituation && senior.livingSituation) {
    const map: Record<string, string> = {
      alone: "home",
      family: "family",
      spouse: "home",
      hospital: "hospital",
      rehab: "rehab",
      facility: "assisted",
      other: "other",
    };
    d.livingSituation = map[senior.livingSituation] || senior.livingSituation;
  }

  if (!d.communityTypes.length && senior.housingTypes.length) {
    d.communityTypes = [...senior.housingTypes];
  }
  if (!d.budgetMin && senior.budgetMin) d.budgetMin = senior.budgetMin;
  if (!d.budgetMax && senior.budgetMax) d.budgetMax = senior.budgetMax;
  if (!d.maxMonthlyBudget && senior.budgetMax) d.maxMonthlyBudget = senior.budgetMax;
  if (!d.preferredCities && senior.searchZones[0]?.query) {
    d.preferredCities = senior.searchZones.map((z) => z.query).join(", ");
  }
  if (senior.searchZones[0]?.radiusMiles) {
    d.maxDistanceMiles = senior.searchZones[0].radiusMiles || 25;
  }
  if (!d.veteransBenefits && senior.hasVeteransBenefits) {
    d.veteransBenefits = senior.hasVeteransBenefits;
  }
  if (!d.longTermCareInsurance && senior.hasLtcInsurance) {
    d.longTermCareInsurance = senior.hasLtcInsurance;
  }

  if (!d.mobility && care.mobility.length) {
    if (care.mobility.includes("bedbound")) d.mobility = "bedbound";
    else if (care.mobility.includes("wheelchair")) d.mobility = "wheelchair";
    else if (care.mobility.includes("walker")) d.mobility = "walker";
    else if (care.mobility.includes("cane")) d.mobility = "cane";
    else if (care.mobility.includes("walks_alone")) d.mobility = "independent";
  }

  if (!d.allergies && care.allergiesDetail) d.allergies = care.allergiesDetail;
  if (!d.medicalConditions && care.healthConditions) d.medicalConditions = care.healthConditions;
  if (!d.medicalNotes && care.healthNotes) d.medicalNotes = care.healthNotes;
  if (!d.currentMedications && care.medication.notes) {
    d.currentMedications = care.medication.notes;
  }

  if (!d.memoryCognition.length && care.cognition.length) {
    const map: Record<string, string> = {
      mild: "memory_loss",
      dementia: "dementia",
      alzheimers: "alzheimers",
      disorientation: "confusion",
    };
    d.memoryCognition = care.cognition
      .map((c) => map[c])
      .filter(Boolean) as string[];
  }

  if (care.mobility.includes("fall_risk") && !d.fallRisk) d.fallRisk = "yes";

  return d;
}

export type SectionCompleteness = {
  id: DossierStepId;
  label: string;
  done: boolean;
  score: number;
  missing: string[];
};

export type DossierCompleteness = {
  percent: number;
  sections: SectionCompleteness[];
  missingDocs: string[];
  readyToSubmit: boolean;
};

function filled(...vals: (string | undefined | null)[]) {
  return vals.some((v) => Boolean(v && String(v).trim()));
}

export function computeDossierCompleteness(
  d: ResidentDossier,
  documents: { category: DocCategoryId | string }[],
): DossierCompleteness {
  const present = new Set(documents.map((x) => x.category));
  const missingDocs: string[] = [];
  for (const cat of DOSSIER_DOC_CATEGORIES.filter((c) => c.recommended)) {
    if (!present.has(cat.vault)) missingDocs.push(cat.label);
  }

  const sections: SectionCompleteness[] = [];

  const residentMissing: string[] = [];
  if (!filled(d.firstName)) residentMissing.push("First name");
  if (!filled(d.lastName)) residentMissing.push("Last name");
  if (!filled(d.dateOfBirth)) residentMissing.push("Date of birth");
  if (!filled(d.livingSituation)) residentMissing.push("Living situation");
  if (!d.emergencyContact?.name) residentMissing.push("Emergency contact");
  const residentScore =
    [
      filled(d.firstName, d.lastName),
      filled(d.dateOfBirth),
      filled(d.gender),
      filled(d.city, d.state, d.zip),
      filled(d.phone),
      filled(d.livingSituation),
      Boolean(d.emergencyContact?.name),
      d.familyMembers.some((m) => m.name.trim()),
    ].filter(Boolean).length / 8;
  sections.push({
    id: "resident",
    label: "Resident Information",
    done: residentScore >= 0.6,
    score: residentScore,
    missing: residentMissing,
  });

  const healthScore =
    [
      filled(d.medicalConditions, d.diagnoses),
      filled(d.allergies),
      filled(d.currentMedications),
      filled(d.height, d.weight),
      filled(d.vaccinationStatus),
    ].filter(Boolean).length / 5;
  const healthMissing: string[] = [];
  if (!filled(d.medicalConditions, d.diagnoses)) healthMissing.push("Conditions or diagnoses");
  if (!filled(d.allergies)) healthMissing.push("Allergies");
  if (!filled(d.currentMedications)) healthMissing.push("Medications");
  sections.push({
    id: "health",
    label: "Health",
    done: healthScore >= 0.4,
    score: healthScore,
    missing: healthMissing,
  });

  const adlFilled = ADL_CARD_ACTIVITIES.filter((a) => filled(d.adls[a.id])).length;
  const careScore =
    [
      filled(d.mobility),
      adlFilled >= 3,
      filled(d.continence),
      d.memoryCognition.length > 0 || filled(d.behavioralConcerns),
      d.nutrition.length > 0,
      filled(d.fallRisk),
    ].filter(Boolean).length / 6;
  const careMissing: string[] = [];
  if (!filled(d.mobility)) careMissing.push("Mobility");
  if (adlFilled < 3) careMissing.push("Daily living activities");
  sections.push({
    id: "care",
    label: "Care Needs",
    done: careScore >= 0.5,
    score: careScore,
    missing: careMissing,
  });

  const lookingScore =
    [
      d.communityTypes.length > 0,
      filled(d.desiredMoveIn),
      filled(d.preferredCities),
      filled(d.budgetMin, d.budgetMax, d.maxMonthlyBudget),
    ].filter(Boolean).length / 4;
  sections.push({
    id: "looking",
    label: "Preferences",
    done: lookingScore >= 0.5,
    score: lookingScore,
    missing: d.communityTypes.length ? [] : ["Community type"],
  });

  const financialScore =
    [
      filled(d.monthlyIncome, d.maxMonthlyBudget, d.budgetMax),
      filled(d.insurance),
      filled(d.veteransBenefits),
      filled(d.longTermCareInsurance),
    ].filter(Boolean).length / 4;
  sections.push({
    id: "financial",
    label: "Financial",
    done: financialScore >= 0.4,
    score: financialScore,
    missing: filled(d.insurance) ? [] : ["Insurance"],
  });

  const docsScore = missingDocs.length === 0 ? 1 : Math.max(0, 1 - missingDocs.length / 4);
  sections.push({
    id: "documents",
    label: "Documents",
    done: missingDocs.length === 0,
    score: docsScore,
    missing: missingDocs.map((m) => `Missing ${m}`),
  });

  const teamScore = d.healthcareTeam.some((p) => p.name.trim()) ? 1 : 0.2;
  sections.push({
    id: "team",
    label: "Healthcare Team",
    done: teamScore >= 0.5,
    score: teamScore,
    missing: teamScore >= 0.5 ? [] : ["Primary physician"],
  });

  // review + submit don't count toward profile completeness the same way
  const weighted = sections.reduce((sum, s) => sum + s.score, 0) / sections.length;
  const percent = Math.min(100, Math.round(weighted * 100));
  const coreDone = sections
    .filter((s) => ["resident", "health", "care", "looking", "financial"].includes(s.id))
    .every((s) => s.done);

  return {
    percent,
    sections,
    missingDocs,
    readyToSubmit: coreDone && percent >= 60 && missingDocs.length <= 2,
  };
}

/** Sync dossier → SeniorProfile + CareNeeds so search/apply keep working. */
export function syncDossierToFamily(d: ResidentDossier): {
  senior: Partial<SeniorProfile>;
  careNeeds: CareNeeds;
} {
  const livingMap: Record<string, string> = {
    home: "alone",
    hospital: "hospital",
    rehab: "rehab",
    assisted: "facility",
    nursing: "facility",
    family: "family",
    other: "other",
  };

  const mobility: string[] = [];
  if (d.mobility === "independent") mobility.push("walks_alone");
  if (d.mobility === "cane") mobility.push("cane");
  if (d.mobility === "walker") mobility.push("walker");
  if (d.mobility === "wheelchair") mobility.push("wheelchair");
  if (d.mobility === "bedbound") mobility.push("bedbound");
  if (d.fallRisk === "yes") mobility.push("fall_risk");

  const adls = emptyCareNeeds().adls;
  const adlMap: Record<string, AdlActivityId> = {
    bathing: "bathing",
    dressing: "dressing",
    toileting: "toileting",
    eating: "eating",
    transfers: "transferring",
  };
  for (const [k, v] of Object.entries(d.adls)) {
    const target = adlMap[k];
    if (!target || !v) continue;
    adls[target] = (v === "some" ? "some" : v === "dependent" ? "dependent" : "independent") as AdlLevel;
  }

  const cognition: string[] = [];
  if (d.memoryCognition.includes("memory_loss")) cognition.push("mild");
  if (d.memoryCognition.includes("dementia")) cognition.push("dementia");
  if (d.memoryCognition.includes("alzheimers")) cognition.push("alzheimers");
  if (d.memoryCognition.includes("confusion")) cognition.push("disorientation");

  const health: string[] = [];
  if (filled(d.allergies)) health.push("allergies");
  if (filled(d.medicalConditions, d.diagnoses)) health.push("conditions");
  if (d.nutrition.includes("soft") || d.nutrition.includes("thickened")) health.push("special_diet");
  if (d.nutrition.includes("feeding_assist")) health.push("swallowing");
  if (d.continence === "incontinent" || d.continence === "occasional") health.push("incontinence");

  const cities = d.preferredCities
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const senior: Partial<SeniorProfile> = {
    firstName: d.firstName,
    lastName: d.lastName,
    dateOfBirth: d.dateOfBirth,
    gender: d.gender,
    primaryLanguage: d.primaryLanguage,
    phone: d.phone,
    email: d.email,
    address: d.address,
    city: d.city,
    state: d.state,
    zip: d.zip,
    livingSituation: livingMap[d.livingSituation] || d.livingSituation || "",
    livingSituationOther: d.livingSituationOther,
    housingTypes: d.communityTypes.filter((t) => t !== "rehab" && t !== "other"),
    searchZones: cities.length
      ? cities.map((query, i) => ({
          id: `dz-${i}`,
          query,
          radiusMiles: d.maxDistanceMiles || 25,
        }))
      : d.city
        ? [{ id: "dz-0", query: `${d.city}${d.state ? `, ${d.state}` : ""}`, radiusMiles: d.maxDistanceMiles || 25 }]
        : [],
    budgetMin: d.budgetMin,
    budgetMax: d.budgetMax || d.maxMonthlyBudget,
    budgetUnsure: !d.budgetMin && !d.budgetMax && !d.maxMonthlyBudget,
    hasLtcInsurance: d.longTermCareInsurance || "",
    hasVeteransBenefits: d.veteransBenefits || "",
    urgency: d.desiredMoveIn
      ? d.desiredMoveIn <= new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
        ? "30days"
        : "1to3"
      : "",
  };

  const careNeeds: CareNeeds = {
    ...emptyCareNeeds(),
    mobility,
    adls,
    cognition,
    cognitionNotes: d.behavioralConcerns,
    health,
    healthConditions: [d.medicalConditions, d.diagnoses].filter(Boolean).join("\n"),
    allergiesDetail: d.allergies,
    healthNotes: [d.medicalNotes, d.specialCareNeeds, d.pastSurgeries, d.recentHospitalizations]
      .filter(Boolean)
      .join("\n"),
    medication: {
      ...emptyCareNeeds().medication,
      takesMeds: filled(d.currentMedications) ? "yes" : "",
      notes: d.currentMedications,
      fullListAvailable: filled(d.currentMedications) ? "yes" : "",
    },
    preferences: {
      ...emptyCareNeeds().preferences,
      pets: d.specialPreferences.includes("pets") ? "Pets allowed preferred" : "",
      language: d.specialPreferences.includes("french")
        ? "French speaking"
        : d.primaryLanguage || "",
      religion: d.specialPreferences.includes("religious") ? "Religious affiliation preferred" : "",
      room: d.roomPreference || (d.specialPreferences.includes("private_room") ? "Private room" : ""),
      environment: d.specialPreferences.includes("outdoor") ? "Outdoor spaces preferred" : "",
      communityType: d.communityTypes.join(", "),
      familyProximity: d.preferredCities,
      diet: d.nutrition.join(", "),
      activities: "",
    },
    updatedAt: new Date().toISOString(),
    completedAt: d.mobility && adlFilledEnough(d) ? new Date().toISOString() : null,
  };

  return { senior, careNeeds };
}

function adlFilledEnough(d: ResidentDossier) {
  return ADL_CARD_ACTIVITIES.filter((a) => filled(d.adls[a.id])).length >= 3;
}

/** Heuristic AI-style document category detection from filename / mime. */
export function detectDocumentCategory(
  fileName: string,
  mimeType = "",
): { dossierId: string; vault: DocCategoryId; label: string; confidence: "high" | "medium" | "low" } {
  const n = fileName.toLowerCase();
  const rules: { re: RegExp; id: string; confidence: "high" | "medium" }[] = [
    { re: /(insurance|medicare|medicaid|assure|carte\s*vitale)/i, id: "insurance", confidence: "high" },
    { re: /(passport|driver|licence|license|id[_-\s]?card|identity|piece\s*ident)/i, id: "id", confidence: "high" },
    { re: /(med(ication)?[_-\s]?list|ordonnance|prescription|rx[_-\s]?list)/i, id: "medication_list", confidence: "high" },
    { re: /(physician|doctor|order|h&p|history\s*and\s*physical|ordre\s*medical)/i, id: "physician_orders", confidence: "high" },
    { re: /(hospital|discharge|admission|urgences)/i, id: "hospital_records", confidence: "medium" },
    { re: /(assess|mds|interrai|evaluation)/i, id: "assessment", confidence: "medium" },
    { re: /(bank|tax|income|financial|budget|releve)/i, id: "financial", confidence: "medium" },
    { re: /(poa|power\s*of\s*attorney|guardian|mandat|tutelle|curatelle|legal)/i, id: "legal", confidence: "high" },
  ];
  for (const rule of rules) {
    if (rule.re.test(n)) {
      const cat = DOSSIER_DOC_CATEGORIES.find((c) => c.id === rule.id)!;
      return { dossierId: cat.id, vault: cat.vault, label: cat.label, confidence: rule.confidence };
    }
  }
  if (mimeType.startsWith("image/")) {
    const other = DOSSIER_DOC_CATEGORIES.find((c) => c.id === "other")!;
    return { dossierId: other.id, vault: other.vault, label: other.label, confidence: "low" };
  }
  const other = DOSSIER_DOC_CATEGORIES.find((c) => c.id === "other")!;
  return { dossierId: other.id, vault: other.vault, label: other.label, confidence: "low" };
}

export function documentsByDossierCategory(documents: VaultDocument[]) {
  return DOSSIER_DOC_CATEGORIES.map((cat) => ({
    ...cat,
    docs: documents.filter((d) => d.category === cat.vault),
  }));
}

/** Friendly status labels for the submit/tracking board */
export const TRACKING_STATUSES: {
  id: ApplicationStatus | "viewed";
  label: string;
  match: (status: ApplicationStatus, hasViewed?: boolean) => boolean;
}[] = [
  { id: "draft", label: "Draft", match: (s) => s === "draft" || s === "ready" },
  {
    id: "submitted",
    label: "Submitted",
    match: (s) => s === "submitted" || s === "received",
  },
  {
    id: "viewed",
    label: "Viewed",
    match: (s, viewed) => Boolean(viewed) || s === "under_review",
  },
  { id: "more_info", label: "Need More Information", match: (s) => s === "more_info" },
  {
    id: "assessment_requested",
    label: "Assessment Scheduled",
    match: (s) => s === "assessment_requested" || s === "tour_requested",
  },
  { id: "waitlisted", label: "Waitlisted", match: (s) => s === "waitlisted" },
  {
    id: "approved",
    label: "Accepted",
    match: (s) =>
      s === "approved" || s === "conditionally_approved" || s === "offer_received",
  },
  { id: "declined", label: "Declined", match: (s) => s === "declined" },
  {
    id: "move_in_scheduled",
    label: "Move-in Scheduled",
    match: (s) => s === "move_in_scheduled",
  },
];

export function trackingLabel(status: ApplicationStatus): string {
  const row = TRACKING_STATUSES.find((t) => t.match(status));
  return row?.label || status;
}

export { emptySeniorProfile };
