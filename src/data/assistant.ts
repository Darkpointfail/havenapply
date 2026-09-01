/** Scripted Claire assistant for the family profile wizard. */

export type ProfileStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type AssistantTurn = {
  from: "claire" | "family";
  body: string;
};

const OPENERS_PROCHE: Record<ProfileStepIndex, string> = {
  0: "Hello. Is this file for yourself, or for a loved one you are supporting?",
  1: "Perfect. Let's note the name and contact details of the person looking for a residence.",
  2: "Let's talk about emergency contacts. Who is the main contact, and what is their relationship to the person?",
  3: "About legal status: is there a protection mandate or power of attorney in effect?",
  4: "Next, insurance. Do they have private insurance in addition to RAMQ?",
  5: "For finances, what monthly budget are you considering for the residence?",
  6: "Let's talk about care needs. On a scale of 1 to 10, where would you place their autonomy?",
  7: "Now search criteria: area, budget, size, and your priorities.",
  8: "We're almost there. Would you like me to review the summary before signing?",
};

const OPENERS_SELF: Record<ProfileStepIndex, string> = {
  0: "Hello. Is this file for yourself, or for a loved one you are supporting?",
  1: "Very well. Let's confirm your personal details for the admission file.",
  2: "Add your emergency contacts: who should we reach first?",
  3: "About legal status: do you have a protection mandate or power of attorney?",
  4: "Next, insurance. Do you have private insurance in addition to RAMQ?",
  5: "For finances, what monthly budget are you considering for your residence?",
  6: "Let's talk about your care needs. On a scale of 1 to 10, where would you place your autonomy?",
  7: "Let's note your search criteria: area, budget, size, and what matters most to you.",
  8: "Last step: let's review the summary before signing.",
};

const SUGGESTIONS: Record<ProfileStepIndex, string[]> = {
  0: ["For myself", "For a loved one", "Skip to the next step"],
  1: ["I prefer to dictate later", "Skip to the next step"],
  2: ["I am the main contact", "Add a second contact", "Skip to the next step"],
  3: ["Yes, protection mandate", "Power of attorney only", "I need to check"],
  4: ["Yes, private insurance", "RAMQ only", "I don't know"],
  5: ["Around $3,400", "Up to $3,700", "Flexible depending on services"],
  6: ["Autonomy around 4/10", "Walks with a cane", "Wheelchair"],
  7: ["Priority on care", "Close to Sillery", "Max budget $3,500"],
  8: ["Yes, review it for me", "Everything is ready", "Go back to a step"],
};

function replyFor(step: ProfileStepIndex, message: string, forSelf: boolean): string {
  const m = message.toLowerCase();
  if (step === 0) {
    if (
      m.includes("moi") ||
      m.includes("myself") ||
      m.includes("self") ||
      m.includes("for myself")
    ) {
      return "File for yourself: the next steps will cover your needs and your search.";
    }
    if (
      m.includes("proche") ||
      m.includes("loved one") ||
      m.includes("parent") ||
      m.includes("mère") ||
      m.includes("père") ||
      m.includes("mother") ||
      m.includes("father")
    ) {
      return "File for a loved one: note the relationship, then we will fill in their identity.";
    }
    return 'Choose "For myself" or "For a loved one" to adapt the journey.';
  }
  if (step === 1) {
    return forSelf
      ? "Thank you. Your identity details are noted."
      : "Thank you. I noted the person's identity details.";
  }
  if (step === 2) {
    return "Noted under Contacts. We can complete phones and emails right after.";
  }
  if (step === 3) {
    if (m.includes("mandat") || m.includes("mandate") || m.includes("protection")) {
      return 'I checked "protection mandate". Add the mandate holder\'s name when you have it.';
    }
    return "Legal status updated. You can attach the document in Our file.";
  }
  if (step === 4) {
    return "Insurance updated. If a policy is missing, the residence can still open the file.";
  }
  if (step === 5) {
    if (
      m.includes("3 400") ||
      m.includes("3400") ||
      m.includes("3,400") ||
      m.includes("3 700") ||
      m.includes("3700") ||
      m.includes("3,700")
    ) {
      return "I recorded the monthly budget. That will help me suggest matching residences.";
    }
    return "Finances noted. We can adjust the payment method later.";
  }
  if (step === 6) {
    if (m.includes("/10") || m.includes("autonomie") || m.includes("autonomy")) {
      return "I noted the autonomy level. It will be used for matching with RPA categories.";
    }
    return "Care updated. Also mention allergies and memory if relevant.";
  }
  if (step === 7) {
    return "Search criteria updated. You can adjust the priority sliders anytime.";
  }
  return "Summary ready. When you are comfortable, check the consent and sign at the Signature step.";
}

function clampStep(step: number): ProfileStepIndex {
  return Math.min(8, Math.max(0, step)) as ProfileStepIndex;
}

/** Stub interface for a future real model. */
export async function askAssistant(
  step: number,
  message: string,
  opts?: { forSelf?: boolean },
): Promise<string> {
  const s = clampStep(step);
  await new Promise((r) => setTimeout(r, 180));
  return replyFor(s, message, Boolean(opts?.forSelf));
}

export function assistantOpener(step: number, opts?: { forSelf?: boolean }): string {
  const s = clampStep(step);
  return (opts?.forSelf ? OPENERS_SELF : OPENERS_PROCHE)[s];
}

export function assistantSuggestions(step: number): string[] {
  return SUGGESTIONS[clampStep(step)];
}
