import type { FamilyApplication } from "@/lib/family-applications";
import type { VaultDocument } from "@/lib/document-vault";
import { statusLabel } from "@/data/applications";
import { toDisplayApplication } from "@/lib/family-applications";

export type CopilotReply = {
  text: string;
  href?: string;
};

const GUARDRAIL =
  "I help with dossier completeness, documents, applications, and messages. I do not provide clinical advice or care decisions.";

export function answerCopilot(input: {
  question: string;
  applications: FamilyApplication[];
  documents: VaultDocument[];
  seniorName: string;
}): CopilotReply {
  const q = input.question.toLowerCase();
  const apps = input.applications.filter((a) => a.status !== "draft");

  if (
    q.includes("clinical") ||
    q.includes("diagnos") ||
    q.includes("prescribe") ||
    q.includes("medical advice") ||
    q.includes("should we treat")
  ) {
    return {
      text: GUARDRAIL,
      href: "/family/dossier",
    };
  }

  if (q.includes("application") || q.includes("where is") || q.includes("status")) {
    if (!apps.length) {
      return {
        text: "You don't have any submitted applications yet. Open Choose communities to send the shared dossier.",
        href: "/family/communities",
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
    const missing = needed.filter(
      (n) => ![...have].some((h) => h.includes(n.toLowerCase().split(" ")[0])),
    );
    const fromApps = apps.flatMap((a) => a.requestedDocuments || []);
    const allMissing = [...new Set([...missing, ...fromApps])];
    if (!allMissing.length) {
      return {
        text: `Documents for ${input.seniorName || "your loved one"} look in good shape. You can still add files in the dossier documents step.`,
        href: "/family/profile?tab=documents",
      };
    }
    return {
      text: `You may still need:\n${allMissing.map((m) => `• ${m}`).join("\n")}`,
      href: "/family/profile?tab=documents",
    };
  }

  if (q.includes("community") || q.includes("apply") || q.includes("send")) {
    return {
      text: "Choose one or more communities and send the same dossier in one click.",
      href: "/family/communities",
    };
  }

  if (q.includes("medication") || q.includes("medicine") || q.includes("meds")) {
    return {
      text: "Add medication details in the resident dossier Health step, or upload a medication list in Documents.",
      href: "/family/dossier",
    };
  }

  if (q.includes("profile") || q.includes("dossier") || q.includes("continue") || q.includes("setup")) {
    return {
      text: "Let's continue the shared resident dossier.",
      href: "/family/dossier",
    };
  }

  return {
    text: `${GUARDRAIL}\n\nTry asking “Where is my application?” or “What document am I missing?”`,
    href: "/assistant",
  };
}
