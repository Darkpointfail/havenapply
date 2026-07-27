import type { FamilyApplication } from "@/lib/family-applications";
import {
  dossierReadyForApply,
  missingRequiredApplyDocs,
  toDisplayApplication,
} from "@/lib/family-applications";
import { statusLabel } from "@/data/applications";
import type { VaultDocument } from "@/lib/document-vault";

export type CopilotReply = {
  text: string;
  href?: string;
};

export function answerCopilot(input: {
  question: string;
  applications: FamilyApplication[];
  documents: VaultDocument[];
  seniorName: string;
  seniorCreated?: boolean;
  completeness?: number;
  careNeedsCompleted?: boolean;
}): CopilotReply {
  const q = input.question.toLowerCase();
  const apps = input.applications.filter((a) => a.status !== "draft");
  const name = input.seniorName || "your loved one";

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

  if (
    q.includes("document") ||
    q.includes("missing") ||
    q.includes("paperwork") ||
    q.includes("ready to apply") ||
    q.includes("dossier")
  ) {
    const missingDocs = missingRequiredApplyDocs(input.documents);
    const fromApps = apps.flatMap((a) => a.requestedDocuments || []);
    const readiness =
      input.seniorCreated != null
        ? dossierReadyForApply({
            seniorCreated: Boolean(input.seniorCreated),
            completeness: input.completeness ?? 0,
            careNeedsCompleted: Boolean(input.careNeedsCompleted),
            documents: input.documents,
          })
        : null;

    if (readiness && !readiness.ok) {
      const docLines = missingDocs.map((d) => `• ${d.label}`);
      const extra = readiness.reasons.filter((r) => !r.toLowerCase().includes("document"));
      return {
        text: `Before applying for ${name}:\n${[...extra.map((r) => `• ${r}`), ...docLines].join("\n") || "• Finish the remaining dossier items."}`,
        href: missingDocs.length ? "/family/documents" : "/assistant?mode=apply",
      };
    }

    const allMissing = [
      ...new Set([...missingDocs.map((d) => d.label), ...fromApps]),
    ];
    if (!allMissing.length) {
      return {
        text: `Documents for ${name} look in good shape. You can still add files anytime in the vault, or prepare an application.`,
        href: "/assistant?mode=apply",
      };
    }
    return {
      text: `You may still need:\n${allMissing.map((m) => `• ${m}`).join("\n")}`,
      href: "/family/documents",
    };
  }

  if (q.includes("cheap") || q.includes("budget") || q.includes("price") || q.includes("cost") || q.includes("fit")) {
    return {
      text: "Open search and sort by fit. I can also apply a budget filter if you tell me a monthly maximum, for example “under $7000 near Boston”.",
      href: "/assistant?mode=search",
    };
  }

  if (q.includes("medication") || q.includes("medicine") || q.includes("meds")) {
    return {
      text: "I can help update care needs. For a full medication list, open Care needs or continue in the profile assistant.",
      href: "/family/care-needs",
    };
  }

  if (q.includes("profile") || q.includes("continue") || q.includes("setup") || q.includes("next step")) {
    return {
      text: "Let's continue building the profile together in the assistant.",
      href: "/assistant?mode=setup",
    };
  }

  if (q.includes("apply") || q.includes("submit")) {
    return {
      text: "I can check whether the dossier is ready, then guide you to communities to apply.",
      href: "/assistant?mode=apply",
    };
  }

  return {
    text: "I can check application status, missing documents, or help you search. Try asking “Where is my application?” or “What document am I missing?”",
    href: "/assistant?mode=setup",
  };
}
