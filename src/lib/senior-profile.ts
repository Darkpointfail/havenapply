/** Senior profile + family onboarding draft types */

export const LIVING_SITUATIONS = [
  { id: "alone", label: "Lives alone" },
  { id: "family", label: "Lives with family" },
  { id: "spouse", label: "Lives with a spouse / partner" },
  { id: "hospital", label: "Currently in hospital" },
  { id: "rehab", label: "In rehabilitation" },
  { id: "facility", label: "Already in a senior living community" },
  { id: "other", label: "Other" },
] as const;

export const HOUSING_TYPES = [
  { id: "independent", label: "Independent Living" },
  { id: "assisted", label: "Assisted Living" },
  { id: "memory", label: "Memory Care" },
  { id: "nursing", label: "Skilled Nursing" },
  { id: "respite", label: "Respite Care" },
  { id: "ccrc", label: "Continuing Care Retirement Community" },
  { id: "unsure", label: "Not sure yet" },
] as const;

export const URGENCY_OPTIONS = [
  { id: "immediate", label: "Immediately" },
  { id: "30days", label: "Within 30 days" },
  { id: "1to3", label: "In 1 to 3 months" },
  { id: "3to6", label: "In 3 to 6 months" },
  { id: "exploring", label: "Exploring, no firm timeline" },
] as const;

export const FUNDING_MODES = [
  { id: "private", label: "Private pay" },
  { id: "ltc", label: "Long-term care insurance" },
  { id: "veterans", label: "Veterans benefits" },
  { id: "medicaid", label: "Medicaid" },
  { id: "medicare", label: "Medicare (limited coverage)" },
  { id: "family", label: "Family support" },
  { id: "unsure", label: "I’m not sure" },
] as const;

export const RELATIONSHIP_OPTIONS = [
  "Daughter",
  "Son",
  "Spouse / partner",
  "Grandchild",
  "Sibling",
  "Niece / nephew",
  "Friend",
  "Professional caregiver",
  "Self (I am the senior)",
  "Other",
];

export const FILLER_OPTIONS = [
  "I am a family member",
  "I am the senior looking for myself",
  "I am a professional (care manager, social worker)",
  "Other",
];

export const RADIUS_OPTIONS = [
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
  { value: 0, label: "Anywhere in this state" },
];

export type SearchZone = {
  id: string;
  query: string;
  radiusMiles: number;
};

export type SeniorProfile = {
  // Step 1, Relationship
  filledBy: string;
  relationship: string;
  seniorParticipates: "" | "yes" | "no" | "sometimes";
  hasAuthorization: "" | "yes" | "no" | "unsure";

  // Step 2, Personal
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  primaryLanguage: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;

  // Step 3, Living
  livingSituation: string;
  livingSituationOther: string;

  // Step 4, Housing
  housingTypes: string[];

  // Step 5, Urgency
  urgency: string;

  // Step 6, Location
  searchZones: SearchZone[];
  proximityToFamily: string;
  openToOtherStates: "" | "yes" | "no" | "unsure";

  // Step 7, Budget
  budgetMin: string;
  budgetMax: string;
  budgetUnsure: boolean;
  fundingModes: string[];
  hasHomeEquity: "" | "yes" | "no" | "unsure";
  hasLtcInsurance: "" | "yes" | "no" | "unsure";
  hasVeteransBenefits: "" | "yes" | "no" | "unsure";
  medicaidMedicare: "" | "medicaid" | "medicare" | "both" | "neither" | "unsure";

  createdAt: string | null;
  updatedAt: string | null;
};

export type OnboardingMeta = {
  /** Index into ONBOARDING_STEPS (0 = intro) */
  stepIndex: number;
  startedAt: string | null;
  lastSavedAt: string | null;
};

export const ONBOARDING_STEPS = [
  { id: "intro", title: "Welcome", short: "Intro" },
  { id: "relationship", title: "Your relationship", short: "Relation" },
  { id: "personal", title: "Personal information", short: "Personal" },
  { id: "living", title: "Current situation", short: "Situation" },
  { id: "housing", title: "Housing type", short: "Housing" },
  { id: "urgency", title: "Timeline", short: "Urgency" },
  { id: "location", title: "Search area", short: "Area" },
  { id: "budget", title: "Budget", short: "Budget" },
  { id: "review", title: "Review & confirm", short: "Review" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export function emptySeniorProfile(): SeniorProfile {
  return {
    filledBy: "",
    relationship: "",
    seniorParticipates: "",
    hasAuthorization: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    primaryLanguage: "English",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    livingSituation: "",
    livingSituationOther: "",
    housingTypes: [],
    urgency: "",
    searchZones: [{ id: "z1", query: "", radiusMiles: 25 }],
    proximityToFamily: "",
    openToOtherStates: "",
    budgetMin: "",
    budgetMax: "",
    budgetUnsure: false,
    fundingModes: [],
    hasHomeEquity: "",
    hasLtcInsurance: "",
    hasVeteransBenefits: "",
    medicaidMedicare: "",
    createdAt: null,
    updatedAt: null,
  };
}

export function emptyOnboardingMeta(): OnboardingMeta {
  return {
    stepIndex: 0,
    startedAt: null,
    lastSavedAt: null,
  };
}

export function seniorDisplayName(s: SeniorProfile) {
  const parts = [s.firstName, s.middleName, s.lastName].filter(Boolean);
  return parts.join(" ").trim();
}

export function seniorAge(s: SeniorProfile): string {
  if (!s.dateOfBirth) return "";
  const dob = new Date(s.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age > 0 ? String(age) : "";
}

export function labelForId<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string,
) {
  return list.find((x) => x.id === id)?.label ?? id;
}
