/** Care needs assessment, search aid, not a medical diagnosis */

export const ADL_LEVELS = [
  { id: "independent", label: "Independent" },
  { id: "reminders", label: "Needs reminders" },
  { id: "some", label: "Needs some assistance" },
  { id: "dependent", label: "Fully dependent" },
] as const;

export type AdlLevel = (typeof ADL_LEVELS)[number]["id"] | "";

export const ADL_ACTIVITIES = [
  { id: "bathing", label: "Bathing" },
  { id: "dressing", label: "Dressing" },
  { id: "toileting", label: "Toileting" },
  { id: "eating", label: "Eating" },
  { id: "grooming", label: "Grooming" },
  { id: "transferring", label: "Transferring" },
  { id: "walking", label: "Walking" },
] as const;

export type AdlActivityId = (typeof ADL_ACTIVITIES)[number]["id"];

export const MOBILITY_OPTIONS = [
  { id: "walks_alone", label: "Walks without help" },
  { id: "cane", label: "Uses a cane" },
  { id: "walker", label: "Uses a walker" },
  { id: "wheelchair", label: "Uses a wheelchair" },
  { id: "transfer_assist", label: "Needs help with transfers" },
  { id: "fall_risk", label: "Fall risk" },
  { id: "bedbound", label: "Mostly bedbound" },
] as const;

export const COGNITION_OPTIONS = [
  { id: "none", label: "No known concerns" },
  { id: "mild", label: "Mild forgetfulness" },
  { id: "dementia", label: "Dementia diagnosis" },
  { id: "alzheimers", label: "Alzheimer’s" },
  { id: "disorientation", label: "Disorientation" },
  { id: "wandering", label: "Wandering" },
  { id: "behaviors", label: "Challenging behaviors" },
  { id: "sundowning", label: "Sundowning" },
  { id: "secure", label: "Needs a secure environment" },
] as const;

export const HEALTH_OPTIONS = [
  { id: "conditions", label: "Significant medical conditions" },
  { id: "allergies", label: "Allergies" },
  { id: "diabetes", label: "Diabetes" },
  { id: "oxygen", label: "Oxygen" },
  { id: "dialysis", label: "Dialysis" },
  { id: "wounds", label: "Wounds / wound care" },
  { id: "special_diet", label: "Special diet" },
  { id: "swallowing", label: "Swallowing difficulties" },
  { id: "incontinence", label: "Incontinence" },
  { id: "pt", label: "Physical therapy" },
  { id: "hospice", label: "Palliative care or hospice" },
] as const;

export const MENTAL_OPTIONS = [
  { id: "anxiety", label: "Anxiety" },
  { id: "depression", label: "Depression" },
  { id: "aggression", label: "Aggression" },
  { id: "agitation", label: "Agitation" },
  { id: "hallucinations", label: "Hallucinations" },
  { id: "substance", label: "Problematic substance use" },
  { id: "risk", label: "Risk to self or others" },
] as const;

export const PREFERENCE_FIELDS = [
  { id: "pets", label: "Pets", placeholder: "e.g. Wants to keep a small dog" },
  { id: "religion", label: "Religion / faith", placeholder: "e.g. Weekly services important" },
  { id: "diet", label: "Food preferences", placeholder: "e.g. Kosher, vegetarian" },
  { id: "activities", label: "Activities", placeholder: "e.g. Music, gardening, cards" },
  {
    id: "familyProximity",
    label: "Family proximity",
    placeholder: "e.g. Within 20 minutes of daughter",
  },
  {
    id: "environment",
    label: "Urban or quiet setting",
    placeholder: "e.g. Quiet campus preferred",
  },
  {
    id: "room",
    label: "Room preference",
    placeholder: "e.g. Private room with window",
  },
  {
    id: "communityType",
    label: "Mixed or specialized community",
    placeholder: "e.g. Memory care specialized",
  },
  {
    id: "language",
    label: "Staff language",
    placeholder: "e.g. Mandarin or Cantonese preferred",
  },
] as const;

export type CareNeeds = {
  mobility: string[];
  adls: Record<AdlActivityId, AdlLevel>;
  medication: {
    takesMeds: "" | "yes" | "no" | "unsure";
    approximateCount: string;
    needsReminders: "" | "yes" | "no" | "unsure";
    needsAdministration: "" | "yes" | "no" | "unsure";
    injections: "" | "yes" | "no" | "unsure";
    controlledSubstances: "" | "yes" | "no" | "unsure";
    fullListAvailable: "" | "yes" | "no" | "unsure";
    notes: string;
  };
  cognition: string[];
  cognitionNotes: string;
  health: string[];
  healthConditions: string;
  allergiesDetail: string;
  healthNotes: string;
  mental: string[];
  mentalNotes: string;
  preferences: Record<(typeof PREFERENCE_FIELDS)[number]["id"], string>;
  updatedAt: string | null;
  completedAt: string | null;
};

export type SupportLevel =
  | "mostly_independent"
  | "light_assisted"
  | "assisted_living"
  | "memory_care"
  | "skilled_nursing";

export type CareNeedsSummary = {
  supportLevel: SupportLevel;
  supportLabel: string;
  supportBlurb: string;
  priorities: string[];
  mustHaves: string[];
  preferences: string[];
  missing: string[];
  disclaimer: string;
};

export function emptyCareNeeds(): CareNeeds {
  const adls = {} as Record<AdlActivityId, AdlLevel>;
  ADL_ACTIVITIES.forEach((a) => {
    adls[a.id] = "";
  });
  const preferences = {} as CareNeeds["preferences"];
  PREFERENCE_FIELDS.forEach((p) => {
    preferences[p.id] = "";
  });
  return {
    mobility: [],
    adls,
    medication: {
      takesMeds: "",
      approximateCount: "",
      needsReminders: "",
      needsAdministration: "",
      injections: "",
      controlledSubstances: "",
      fullListAvailable: "",
      notes: "",
    },
    cognition: [],
    cognitionNotes: "",
    health: [],
    healthConditions: "",
    allergiesDetail: "",
    healthNotes: "",
    mental: [],
    mentalNotes: "",
    preferences,
    updatedAt: null,
    completedAt: null,
  };
}

function labelOf<T extends { id: string; label: string }>(list: readonly T[], id: string) {
  return list.find((x) => x.id === id)?.label ?? id;
}

function adlScore(level: AdlLevel): number {
  if (level === "dependent") return 3;
  if (level === "some") return 2;
  if (level === "reminders") return 1;
  if (level === "independent") return 0;
  return -1; // unanswered
}

export function buildCareNeedsSummary(care: CareNeeds): CareNeedsSummary {
  const priorities: string[] = [];
  const mustHaves: string[] = [];
  const preferences: string[] = [];
  const missing: string[] = [];

  const adlScores = ADL_ACTIVITIES.map((a) => adlScore(care.adls[a.id]));
  const answeredAdls = adlScores.filter((s) => s >= 0);
  const avgAdl =
    answeredAdls.length > 0
      ? answeredAdls.reduce((a, b) => a + b, 0) / answeredAdls.length
      : -1;
  const anyDependent = answeredAdls.some((s) => s === 3);
  const anySome = answeredAdls.some((s) => s >= 2);

  if (answeredAdls.length < ADL_ACTIVITIES.length) {
    missing.push("Some daily activities are not rated yet.");
  }
  if (!care.mobility.length) missing.push("Mobility supports not selected.");
  if (!care.medication.takesMeds) missing.push("Medication needs not answered.");
  if (!care.cognition.length) missing.push("Memory and cognition not described.");
  if (!care.health.length && !care.healthConditions.trim()) {
    missing.push("General health details are still light.");
  }

  // Cognition-driven
  const cog = new Set(care.cognition);
  const memoryHeavy =
    cog.has("dementia") ||
    cog.has("alzheimers") ||
    cog.has("wandering") ||
    cog.has("secure") ||
    cog.has("sundowning") ||
    cog.has("behaviors");

  if (memoryHeavy) {
    priorities.push("Memory and cognitive support is a top priority.");
    mustHaves.push("Memory Care or a secure cognitive-support environment");
  }
  if (cog.has("wandering") || cog.has("secure")) {
    mustHaves.push("Secure / locked campus or memory unit");
  }
  if (cog.has("sundowning") || cog.has("behaviors")) {
    priorities.push("Staff experienced with sundowning and behavioral support.");
  }
  if (cog.has("mild") && !memoryHeavy) {
    priorities.push("Mild memory changes, look for gentle cueing and routines.");
  }

  // Mobility
  if (care.mobility.includes("bedbound")) {
    priorities.push("High mobility support, largely bedbound.");
    mustHaves.push("Skilled nursing or high-acuity nursing support");
  } else if (care.mobility.includes("wheelchair") || care.mobility.includes("transfer_assist")) {
    priorities.push("Transfer and wheelchair accessibility matter.");
    mustHaves.push("Wheelchair-accessible rooms and transfer support");
  } else if (care.mobility.includes("fall_risk") || care.mobility.includes("walker")) {
    priorities.push("Fall prevention and walker-friendly layouts.");
  }

  // ADLs
  if (anyDependent || avgAdl >= 2.2) {
    priorities.push("Substantial help with daily activities is needed.");
  } else if (anySome || avgAdl >= 1.2) {
    priorities.push("Partial assistance with bathing, dressing, or transfers.");
  } else if (answeredAdls.length && avgAdl >= 0 && avgAdl < 1) {
    priorities.push("Mostly independent with occasional reminders.");
  }

  // Medication
  const med = care.medication;
  if (med.takesMeds === "yes") {
    if (med.needsAdministration === "yes") {
      priorities.push("Medications need staff administration.");
      mustHaves.push("Medication administration by licensed staff");
    } else if (med.needsReminders === "yes") {
      priorities.push("Medication reminders would help.");
    }
    if (med.injections === "yes") mustHaves.push("Ability to support injections");
    if (med.controlledSubstances === "yes") {
      mustHaves.push("Facility able to manage controlled medications");
    }
    if (med.fullListAvailable === "no") {
      missing.push("A complete medication list is not available yet.");
    }
  }

  // Health
  const health = new Set(care.health);
  if (health.has("dialysis")) mustHaves.push("Dialysis coordination or nearby access");
  if (health.has("oxygen")) mustHaves.push("Oxygen-capable community");
  if (health.has("swallowing")) {
    priorities.push("Swallowing support / texture-modified meals.");
    mustHaves.push("Dining support for swallowing difficulties");
  }
  if (health.has("hospice")) {
    priorities.push("Palliative or hospice coordination.");
    mustHaves.push("Hospice / palliative partnership");
  }
  if (health.has("incontinence")) priorities.push("Incontinence care support.");
  if (health.has("wounds")) mustHaves.push("Wound care capability");
  if (care.healthConditions.trim()) {
    priorities.push(`Notable conditions: ${care.healthConditions.trim()}`);
  }
  if (care.allergiesDetail.trim() || health.has("allergies")) {
    mustHaves.push(
      care.allergiesDetail.trim()
        ? `Allergy awareness: ${care.allergiesDetail.trim()}`
        : "Documented allergy protocols",
    );
  }

  // Mental
  const mental = new Set(care.mental);
  if (mental.has("risk")) {
    priorities.push("Safety planning, risk to self or others noted.");
    mustHaves.push("Community equipped for behavioral safety support");
  }
  if (mental.has("aggression") || mental.has("agitation")) {
    priorities.push("Behavioral support for agitation or aggression.");
  }
  if (mental.has("anxiety") || mental.has("depression")) {
    priorities.push("Mental health support and calm routines.");
  }

  // Preferences
  PREFERENCE_FIELDS.forEach((f) => {
    const v = care.preferences[f.id]?.trim();
    if (v) preferences.push(`${f.label}: ${v}`);
  });

  // Support level estimate
  let supportLevel: SupportLevel = "mostly_independent";
  if (
    care.mobility.includes("bedbound") ||
    health.has("dialysis") ||
    (anyDependent && health.has("oxygen"))
  ) {
    supportLevel = "skilled_nursing";
  } else if (memoryHeavy) {
    supportLevel = "memory_care";
  } else if (anyDependent || avgAdl >= 2 || med.needsAdministration === "yes") {
    supportLevel = "assisted_living";
  } else if (anySome || avgAdl >= 1 || med.needsReminders === "yes" || care.mobility.includes("walker")) {
    supportLevel = "light_assisted";
  } else if (answeredAdls.length === 0 && !care.mobility.length) {
    supportLevel = "light_assisted"; // unknown → gentle mid default for search
  }

  const supportCopy: Record<SupportLevel, { label: string; blurb: string }> = {
    mostly_independent: {
      label: "Mostly independent",
      blurb:
        "Based on what you’ve shared, Independent Living or light-support Assisted Living may be a useful starting filter, not a clinical determination.",
    },
    light_assisted: {
      label: "Light to moderate support",
      blurb:
        "Assisted Living with cueing and some hands-on help looks like a practical search band from these answers.",
    },
    assisted_living: {
      label: "Assisted living level support",
      blurb:
        "Daily assistance with activities and/or medications suggests focusing on Assisted Living communities that can match that intensity.",
    },
    memory_care: {
      label: "Memory care oriented",
      blurb:
        "Cognitive and safety needs point toward Memory Care or secure Assisted Living with strong dementia programming.",
    },
    skilled_nursing: {
      label: "Higher clinical support",
      blurb:
        "Acuity signals (mobility, medical complexity) suggest including Skilled Nursing or high-acuity options in your shortlist.",
    },
  };

  if (!priorities.length) {
    priorities.push("Keep gathering details, more answers will sharpen the search filters.");
  }

  return {
    supportLevel,
    supportLabel: supportCopy[supportLevel].label,
    supportBlurb: supportCopy[supportLevel].blurb,
    priorities: [...new Set(priorities)],
    mustHaves: [...new Set(mustHaves)],
    preferences,
    missing,
    disclaimer:
      "This summary is a search aid based on your answers. It is not a medical diagnosis, clinical assessment, or official care recommendation. Always consult qualified professionals for clinical decisions.",
  };
}

export function careNeedsProgress(care: CareNeeds): number {
  let score = 0;
  let total = 0;

  total += 1;
  if (care.mobility.length) score += 1;

  ADL_ACTIVITIES.forEach((a) => {
    total += 1;
    if (care.adls[a.id]) score += 1;
  });

  total += 1;
  if (care.medication.takesMeds) score += 1;

  total += 1;
  if (care.cognition.length) score += 1;

  total += 1;
  if (care.health.length || care.healthConditions.trim()) score += 1;

  total += 1;
  if (care.mental.length || care.mentalNotes.trim()) score += 1;

  total += 1;
  if (Object.values(care.preferences).some((v) => v.trim())) score += 1;

  return Math.round((score / total) * 100);
}

export { labelOf };
