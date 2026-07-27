/**
 * Deterministic conversational intake engine.
 * Maps chat replies → SeniorProfile / CareNeeds patches (no LLM).
 */

import type { CareNeeds } from "@/lib/care-needs";
import { COGNITION_OPTIONS, MOBILITY_OPTIONS } from "@/lib/care-needs";
import type { SeniorProfile } from "@/lib/senior-profile";
import {
  HOUSING_TYPES,
  LIVING_SITUATIONS,
  RELATIONSHIP_OPTIONS,
  URGENCY_OPTIONS,
  isSelfApplicant,
  seniorDisplayName,
} from "@/lib/senior-profile";

export type AssistantPhase =
  | "welcome"
  | "relationship"
  | "personal_name"
  | "personal_city"
  | "living"
  | "housing"
  | "urgency"
  | "location"
  | "budget"
  | "care_mobility"
  | "care_cognition"
  | "care_meds"
  | "summary"
  | "done";

export type ProgressItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  suggestions?: string[];
};

export type EngineResult = {
  phase: AssistantPhase;
  reply: string;
  suggestions: string[];
  seniorPatch?: Partial<SeniorProfile>;
  carePatch?: Partial<CareNeeds> | ((prev: CareNeeds) => CareNeeds);
  setOnboardingStep?: number;
  finalize?: boolean;
  markCareComplete?: boolean;
  handoffSearch?: boolean;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchOption<T extends { id: string; label: string }>(
  list: readonly T[],
  text: string,
): T | undefined {
  const n = normalize(text);
  return list.find(
    (o) =>
      n === o.id ||
      n === o.label.toLowerCase() ||
      n.includes(o.label.toLowerCase()) ||
      o.label.toLowerCase().includes(n),
  );
}

function matchHousing(text: string): string[] {
  const n = normalize(text);
  const hits = HOUSING_TYPES.filter(
    (h) =>
      n.includes(h.id) ||
      n.includes(h.label.toLowerCase()) ||
      (h.id === "memory" && (n.includes("alzheimer") || n.includes("dementia") || n.includes("memory"))) ||
      (h.id === "assisted" && n.includes("assisted")) ||
      (h.id === "independent" && n.includes("independent")) ||
      (h.id === "nursing" && (n.includes("nursing") || n.includes("skilled"))),
  ).map((h) => h.id);
  if (hits.length) return [...new Set(hits)];
  if (n.includes("not sure") || n.includes("unsure")) return ["unsure"];
  return [];
}

function parseBudget(text: string): { min?: string; max?: string; unsure?: boolean } {
  const n = normalize(text);
  if (n.includes("unsure") || n.includes("not sure") || n.includes("don't know")) {
    return { unsure: true };
  }
  const nums = [...text.replace(/,/g, "").matchAll(/\$?\s*(\d{3,5})\s*k?/gi)].map((m) => {
    let v = Number(m[1]);
    if (/k/i.test(m[0]) || v < 100) v = v * 1000;
    if (v < 500) v = v * 1000;
    return v;
  });
  if (nums.length >= 2) return { min: String(Math.min(...nums)), max: String(Math.max(...nums)) };
  if (nums.length === 1) {
    const max = nums[0];
    return { min: String(Math.round(max * 0.7)), max: String(max) };
  }
  return {};
}

function parseName(text: string): { firstName?: string; lastName?: string } {
  const cleaned = text.replace(/^(her|his|their|my|mom'?s?|dad'?s?|name is|she's|he's)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  if (parts.length === 1) return { firstName: parts[0] };
  return {};
}

function parseCityState(text: string): { city?: string; state?: string; query?: string; radius?: number } {
  const miles = text.match(/(\d+)\s*miles?/i);
  const radius = miles ? Number(miles[1]) : 25;
  const near = text.match(/(?:in|near|around)\s+([A-Za-z .]+?)(?:,\s*([A-Z]{2})|$)/i);
  if (near) {
    return {
      city: near[1].trim(),
      state: near[2]?.trim().toUpperCase() || "",
      query: near[2] ? `${near[1].trim()}, ${near[2].trim()}` : near[1].trim(),
      radius,
    };
  }
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length >= 2 && /^[A-Za-z]{2}$/.test(parts[1])) {
    return { city: parts[0], state: parts[1].toUpperCase(), query: `${parts[0]}, ${parts[1]}`, radius };
  }
  return { city: text.trim(), query: text.trim(), radius };
}

export function progressFromState(
  senior: SeniorProfile,
  care: CareNeeds,
  phase: AssistantPhase,
): ProgressItem[] {
  const nameOk = Boolean(senior.firstName && senior.lastName);
  const livingOk = Boolean(senior.livingSituation);
  const housingOk = senior.housingTypes.length > 0;
  const urgencyOk = Boolean(senior.urgency);
  const locationOk = senior.searchZones.some((z) => z.query.trim());
  const budgetOk = senior.budgetUnsure || Boolean(senior.budgetMax);
  const careOk = Boolean(care.completedAt) || care.mobility.length > 0 || care.cognition.length > 0;
  const reviewOk = phase === "done" || phase === "summary";

  return [
    { id: "personal", label: "Personal information", done: nameOk && Boolean(senior.relationship) },
    { id: "situation", label: "Living & housing", done: livingOk && housingOk },
    { id: "timeline", label: "Timeline & location", done: urgencyOk && locationOk },
    { id: "budget", label: "Budget", done: budgetOk },
    { id: "care", label: "Care needs", done: careOk },
    { id: "review", label: "Review", done: reviewOk && nameOk },
  ];
}

export function welcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    text: "Hi, I'm Haven. I'll help you build a care profile, for yourself or someone you love. This usually takes about 15 minutes, and you'll only need to do it once. Who is this profile for?",
    suggestions: ["Myself", "My mother", "My father", "My spouse"],
  };
}

export function initialPhase(): AssistantPhase {
  return "relationship";
}

export function processTurn(
  phase: AssistantPhase,
  userText: string,
  senior: SeniorProfile,
): EngineResult {
  const text = userText.trim();
  const n = normalize(text);

  switch (phase) {
    case "welcome":
    case "relationship": {
      let relationship = text;
      if (n.includes("mother") || n.includes("mom")) relationship = "Daughter";
      if (n.includes("father") || n.includes("dad")) relationship = "Son";
      if (n.includes("spouse") || n.includes("husband") || n.includes("wife")) {
        relationship = "Spouse / partner";
      }
      if (n.includes("myself") || n.includes("for myself") || n === "me") {
        relationship = "Myself (I'm the one looking)";
      }
      const matched = RELATIONSHIP_OPTIONS.find((r) => normalize(r) === n);
      if (matched) relationship = matched;

      const forSelf =
        relationship === "Myself (I'm the one looking)" ||
        relationship.toLowerCase().includes("myself") ||
        relationship.toLowerCase().includes("self");

      return {
        phase: "personal_name",
        reply: forSelf
          ? "Thank you. What is your full name?"
          : "Thank you. What is their full name?",
        suggestions: [],
        seniorPatch: {
          relationship,
          filledBy: forSelf ? "I'm looking for myself" : "I'm a family member or friend",
        },
        setOnboardingStep: 2,
      };
    }

    case "personal_name": {
      const names = parseName(text);
      const firstName = names.firstName || senior.firstName;
      const lastName = names.lastName || senior.lastName || "";
      return {
        phase: "personal_city",
        reply: firstName
          ? `Nice to meet ${firstName}. Which city and state do they live in now?`
          : "Which city and state do they live in now?",
        suggestions: ["Boston, MA", "Austin, TX", "Miami, FL"],
        seniorPatch: { firstName, lastName },
        setOnboardingStep: 2,
      };
    }

    case "personal_city": {
      const loc = parseCityState(text);
      return {
        phase: "living",
        reply: "Got it. What is their living situation today?",
        suggestions: LIVING_SITUATIONS.slice(0, 4).map((l) => l.label),
        seniorPatch: {
          city: loc.city || text,
          state: loc.state || "",
        },
        setOnboardingStep: 3,
      };
    }

    case "living": {
      const match = matchOption(LIVING_SITUATIONS, text);
      const livingSituation = match?.id || "other";
      return {
        phase: "housing",
        reply: "What type of senior living are you considering?",
        suggestions: ["Assisted Living", "Memory Care", "Independent Living", "Not sure yet"],
        seniorPatch: {
          livingSituation,
          livingSituationOther: livingSituation === "other" ? text : "",
        },
        setOnboardingStep: 4,
      };
    }

    case "housing": {
      let housingTypes = matchHousing(text);
      if (!housingTypes.length) housingTypes = ["unsure"];
      const needsMemory =
        housingTypes.includes("memory") ||
        n.includes("alzheimer") ||
        n.includes("dementia") ||
        n.includes("memory");
      return {
        phase: "urgency",
        reply: "How soon are you hoping to move?",
        suggestions: URGENCY_OPTIONS.map((u) => u.label),
        seniorPatch: { housingTypes },
        carePatch: needsMemory
          ? (prev) => ({
              ...prev,
              cognition: prev.cognition.includes("alzheimers")
                ? prev.cognition
                : [...prev.cognition.filter((c) => c !== "none"), "alzheimers"],
            })
          : undefined,
        setOnboardingStep: 5,
      };
    }

    case "urgency": {
      const match = matchOption(URGENCY_OPTIONS, text);
      const urgency =
        match?.id ||
        (n.includes("immediate") || n.includes("asap")
          ? "immediate"
          : n.includes("explor")
            ? "exploring"
            : "1to3");
      return {
        phase: "location",
        reply: "Where should we search, and about how many miles from there?",
        suggestions: ["Within 20 miles of Boston", "Near Austin, TX · 25 miles", "Anywhere in Florida"],
        seniorPatch: { urgency },
        setOnboardingStep: 6,
      };
    }

    case "location": {
      const loc = parseCityState(text);
      const query = loc.query || text;
      const radiusMiles = loc.radius ?? 25;
      return {
        phase: "budget",
        reply: "What monthly budget range feels realistic? You can say something like “under $7,000” or “not sure yet.”",
        suggestions: ["Under $5,000", "Around $6,000–$8,000", "Not sure yet"],
        seniorPatch: {
          searchZones: [{ id: "z1", query, radiusMiles }],
          city: senior.city || loc.city || "",
          state: senior.state || loc.state || "",
        },
        setOnboardingStep: 7,
      };
    }

    case "budget": {
      const b = parseBudget(text);
      return {
        phase: "care_mobility",
        reply: "Almost there. How do they get around day to day?",
        suggestions: MOBILITY_OPTIONS.slice(0, 4).map((m) => m.label),
        seniorPatch: {
          budgetMin: b.min || "",
          budgetMax: b.max || "",
          budgetUnsure: Boolean(b.unsure),
        },
        setOnboardingStep: 7,
      };
    }

    case "care_mobility": {
      const match = MOBILITY_OPTIONS.find(
        (m) => n.includes(m.id.replace(/_/g, " ")) || n.includes(m.label.toLowerCase()),
      );
      const mobility = match ? [match.id] : n.includes("no help") || n.includes("walks") ? ["walks_alone"] : ["walker"];
      return {
        phase: "care_cognition",
        reply: "Any memory or cognition concerns we should know about?",
        suggestions: ["No known concerns", "Mild forgetfulness", "Alzheimer’s", "Needs a secure environment"],
        carePatch: (prev) => ({ ...prev, mobility }),
      };
    }

    case "care_cognition": {
      const match = COGNITION_OPTIONS.find(
        (c) => n.includes(c.label.toLowerCase()) || n.includes(c.id),
      );
      let cognition = match ? [match.id] : ["none"];
      if (n.includes("alzheimer")) cognition = ["alzheimers"];
      if (n.includes("no") && (n.includes("concern") || n.includes("issue") || n.includes("problem"))) {
        cognition = ["none"];
      }
      const skipMeds = cognition.includes("none") && !n.includes("medication");
      return {
        phase: skipMeds ? "summary" : "care_meds",
        reply: skipMeds
          ? buildSummaryPrompt({ ...senior })
          : "Do they take medications that need reminders or help to administer?",
        suggestions: skipMeds
          ? ["Looks good, confirm profile", "Change the budget", "Change the search area"]
          : ["Yes, needs reminders", "Yes, needs help administering", "No medications"],
        carePatch: (prev) => ({ ...prev, cognition }),
      };
    }

    case "care_meds": {
      const takes =
        n.includes("no med") || n.includes("none") || n === "no"
          ? "no"
          : n.includes("administ")
            ? "yes"
            : "yes";
      const needsReminders = n.includes("remind") || takes === "yes" ? "yes" : "no";
      const needsAdministration = n.includes("administ") ? "yes" : "no";
      return {
        phase: "summary",
        reply: buildSummaryPrompt(senior),
        suggestions: ["Looks good, confirm profile", "Change the name", "Change housing type"],
        carePatch: (prev) => ({
          ...prev,
          medication: {
            ...prev.medication,
            takesMeds: takes as CareNeeds["medication"]["takesMeds"],
            needsReminders: needsReminders as CareNeeds["medication"]["needsReminders"],
            needsAdministration: needsAdministration as CareNeeds["medication"]["needsAdministration"],
          },
        }),
      };
    }

    case "summary": {
      if (
        n.includes("confirm") ||
        n.includes("looks good") ||
        n.includes("yes") ||
        n.includes("done") ||
        n.includes("validate")
      ) {
        const name = seniorDisplayName(senior) || "your loved one";
        return {
          phase: "done",
          reply: `Perfect. ${name}'s profile is ready. Next, I can help you find communities that fit. Tell me what you're looking for, or open the search map.`,
          suggestions: [
            "Find communities near me",
            "I'd like something within 20 miles under $7,000",
            "Go to my dashboard",
          ],
          finalize: true,
          markCareComplete: true,
          handoffSearch: true,
          setOnboardingStep: 8,
        };
      }
      if (n.includes("budget")) {
        return {
          phase: "budget",
          reply: "Sure. What monthly budget should we use?",
          suggestions: ["Under $5,000", "Around $6,000–$8,000", "Not sure yet"],
        };
      }
      if (n.includes("area") || n.includes("location") || n.includes("miles")) {
        return {
          phase: "location",
          reply: "Where should we search, and how many miles?",
          suggestions: ["Within 20 miles of Boston", "Near Austin, TX"],
        };
      }
      if (n.includes("name")) {
        return {
          phase: "personal_name",
          reply: "What is their full name?",
          suggestions: [],
        };
      }
      if (n.includes("housing")) {
        return {
          phase: "housing",
          reply: "What type of senior living are you considering?",
          suggestions: ["Assisted Living", "Memory Care", "Independent Living"],
        };
      }
      return {
        phase: "summary",
        reply: buildSummaryPrompt(senior) + "\n\nSay “confirm profile” when you're ready, or tell me what to change.",
        suggestions: ["Looks good, confirm profile", "Change the budget", "Change the search area"],
      };
    }

    case "done": {
      return {
        phase: "done",
        reply: "Your profile is ready. You can search communities, prepare applications, or ask me anything from the dashboard.",
        suggestions: ["Find communities near me", "Go to my dashboard", "Open documents"],
        handoffSearch: true,
      };
    }

    default:
      return {
        phase: "relationship",
        reply: "Who is this profile for?",
        suggestions: ["Myself", "My mother", "My father", "My spouse"],
      };
  }
}

function buildSummaryPrompt(senior: SeniorProfile) {
  const forSelf = isSelfApplicant(senior);
  const name = forSelf
    ? "you"
    : seniorDisplayName(senior) || "your loved one";
  const housing =
    senior.housingTypes.map((id) => HOUSING_TYPES.find((h) => h.id === id)?.label || id).join(", ") ||
    "to be confirmed";
  const zone = senior.searchZones[0]?.query || "your search area";
  const budget = senior.budgetUnsure
    ? "budget still open"
    : senior.budgetMax
      ? `about $${Number(senior.budgetMin || 0).toLocaleString()}–$${Number(senior.budgetMax).toLocaleString()}/month`
      : "budget to confirm";

  const header = forSelf
    ? "Here's what I have for your profile:"
    : `Here's what I have for ${name}:`;

  return `${header}\n\n• Lives in ${[senior.city, senior.state].filter(Boolean).join(", ") || ","}\n• Looking for: ${housing}\n• Searching near: ${zone}\n• Budget: ${budget}\n\nDoes this look right? You can confirm the profile or ask me to change anything.`;
}

export function resumePhase(senior: SeniorProfile, care: CareNeeds): AssistantPhase {
  if (senior.firstName && senior.lastName && senior.housingTypes.length && senior.urgency && senior.searchZones[0]?.query && (senior.budgetUnsure || senior.budgetMax) && (care.mobility.length || care.completedAt)) {
    return senior.createdAt ? "done" : "summary";
  }
  if (!senior.relationship) return "relationship";
  if (!senior.firstName) return "personal_name";
  if (!senior.city) return "personal_city";
  if (!senior.livingSituation) return "living";
  if (!senior.housingTypes.length) return "housing";
  if (!senior.urgency) return "urgency";
  if (!senior.searchZones[0]?.query) return "location";
  if (!senior.budgetUnsure && !senior.budgetMax) return "budget";
  if (!care.mobility.length) return "care_mobility";
  if (!care.cognition.length) return "care_cognition";
  return "summary";
}
