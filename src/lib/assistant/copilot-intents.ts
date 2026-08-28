import type { FamilyApplication } from "@/lib/family-applications";
import type { VaultDocument } from "@/lib/document-vault";
import { statusLabel } from "@/data/applications";
import { toDisplayApplication } from "@/lib/family-applications";

export type CopilotReply = {
  text: string;
  href?: string;
};

export function answerCopilot(input: {
  question: string;
  applications: FamilyApplication[];
  documents: VaultDocument[];
  seniorName: string;
}): CopilotReply {
  const q = input.question.toLowerCase();
  const apps = input.applications.filter((a) => a.status !== "draft");

  if (q.includes("application") || q.includes("where is") || q.includes("status")) {
    if (!apps.length) {
      return {
        text: "You don't have any submitted applications yet. I can help you search communities and prepare one when you're ready.",
        href: "/find-senior-living",
      };
    }
    const lines = apps.slice(0, 5).map((a) => {
      const d = toDisplayApplication(a);
      return `• ${d.residenceName}: ${statusLabel(d.status)}`;
    });
    return {
      text: `Here's where things stand:\n${lines.join("\n")}`,
      href: "/family/applications",
    };
  }

  if (q.includes("document") || q.includes("missing") || q.includes("paperwork")) {
    const needed = ["Insurance card", "Physician report", "ID"];
    const have = new Set(input.documents.map((d) => d.name.toLowerCase()));
    const missing = needed.filter((n) => ![...have].some((h) => h.includes(n.toLowerCase().split(" ")[0])));
    const fromApps = apps.flatMap((a) => a.requestedDocuments || []);
    const allMissing = [...new Set([...missing, ...fromApps])];
    if (!allMissing.length) {
      return {
        text: `Documents for ${input.seniorName || "your loved one"} look in good shape. You can still add files anytime in the vault.`,
        href: "/family/documents",
      };
    }
    return {
      text: `You may still need:\n${allMissing.map((m) => `• ${m}`).join("\n")}`,
      href: "/family/documents",
    };
  }

  if (q.includes("cheap") || q.includes("budget") || q.includes("price") || q.includes("cost")) {
    return {
      text: "Open search and sort by fit. I can also apply a budget filter if you tell me a monthly maximum, for example “under $7000 near Boston”.",
      href: "/find-senior-living",
    };
  }

  if (q.includes("medication") || q.includes("medicine") || q.includes("meds")) {
    return {
      text: "I can help update care needs. For a full medication list, open Care needs or continue in the profile assistant.",
      href: "/family/care-needs",
    };
  }

  if (q.includes("profile") || q.includes("continue") || q.includes("setup")) {
    return {
      text: "Let's continue building the profile together in your family space.",
      href: "/family/dashboard",
    };
  }

  return {
    text: "I can check application status, missing documents, or help you search. Try asking “Where is my application?” or “What document am I missing?”",
    href: "/family/dashboard",
  };
}
