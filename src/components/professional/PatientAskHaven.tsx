"use client";

import { useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  dossierAiSuggestions,
  dossierCompleteness,
  missingPatientCare,
  missingPatientDocuments,
  missingPatientProfile,
  patientDossierReadyForApply,
  patientName,
  type Patient,
} from "@/lib/professional-data";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

type ChatTurn = { role: "user" | "assistant"; text: string };

/** Administrative assistance only — never clinical decisions or risk judgments. */
const PROMPTS = [
  "What information is missing?",
  "Which documents do I still need?",
  "Is this dossier ready to send?",
  "Prepare a family update",
  "Prepare an admissions packet summary",
  "Draft a message asking for the medication list",
  "What are the administrative blockers?",
];

const GUARDRAIL =
  "I help with dossier completeness, documents, and admissions messaging. I do not provide clinical advice, diagnoses, or care decisions.";

function answerFor(prompt: string, patient: Patient): string {
  const name = patientName(patient);
  const completeness = dossierCompleteness(patient);
  const readiness = patientDossierReadyForApply(patient);
  const missingDocs = missingPatientDocuments(patient);
  const missingCare = missingPatientCare(patient);
  const missingProfile = missingPatientProfile(patient);
  const q = prompt.toLowerCase();

  if (
    q.includes("clinical") ||
    q.includes("diagnos") ||
    q.includes("prescribe") ||
    q.includes("treat") ||
    q.includes("medical advice") ||
    (q.includes("risk") && !q.includes("blocker"))
  ) {
    return `${GUARDRAIL}\n\nI can list missing fields and documents, draft administrative messages, and check whether the packet is ready to send.`;
  }

  if (q.includes("missing") || q.includes("still need") || q.includes("documents")) {
    const parts = [
      ...missingProfile.map((m) => `Profile · ${m}`),
      ...missingCare.map((m) => `Care · ${m}`),
      ...missingDocs.map((m) => `Document · ${m.label}`),
    ];
    return parts.length
      ? `Here’s what’s still open for ${name}:\n• ${parts.join("\n• ")}`
      : `No critical administrative gaps found for ${name}. You can generate an application package.`;
  }
  if (q.includes("ready to send") || q.includes("ready to apply")) {
    return readiness.ok
      ? `${name}'s dossier is ready to send. Completeness ${completeness.percent}%.`
      : `${name} is not ready yet (${completeness.percent}% complete). ${readiness.reasons.join(" ")}`;
  }
  if (q.includes("family")) {
    return `Family update for ${name}: We are coordinating the senior living admission packet from ${patient.hospital}. Current administrative focus: ${patient.nextAction}. Please help collect any outstanding documents and confirm preferred communities in ${patient.care.preferredRegion || "your area"}.`;
  }
  if (q.includes("community") || q.includes("admissions packet") || q.includes("packet summary") || q.includes("résidence") || q.includes("residence")) {
    return `Admissions packet overview for ${name} (${patient.age}). Care level requested: ${patient.care.requiredCareLevel || "—"}. Mobility noted: ${patient.care.mobility || "—"}. Memory notes: ${patient.care.memory || "—"}. Payer: ${patient.care.insurance || "—"}. Documents on file: ${patient.documents.length}. This is an administrative summary for admissions coordination, not a clinical assessment.`;
  }
  if (q.includes("medication")) {
    return `Hi, to complete ${name}'s admission packet, could you please send the current medication list (name, dose, frequency)? You can reply here or upload it in HavenApply. Thank you.`;
  }
  if (q.includes("blocker") || q.includes("consistency")) {
    const blockers: string[] = [];
    if (missingDocs.length) blockers.push(`Documents missing (${missingDocs.map((d) => d.label).join(", ")})`);
    if (!patient.primaryPhysician?.trim()) blockers.push("No treating physician contact on file");
    if (!patient.care.fallRisk.trim()) blockers.push("Fall-risk field not filled (administrative)");
    if (!patient.allergies?.trim()) blockers.push("Allergies field not documented");
    if (patient.documents.some((d) => !d.verified)) blockers.push("Some documents still need verification");
    return blockers.length
      ? `Administrative blockers before send:\n• ${blockers.join("\n• ")}`
      : `No major administrative blockers detected for ${name}. Confirm family consent before transmitting.`;
  }
  return `${GUARDRAIL}\n\n${dossierAiSuggestions(patient).join("\n\n")}`;
}

export function PatientAskHaven({
  patient,
  open,
  onClose,
}: {
  patient: Patient;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const suggestions = useMemo(() => dossierAiSuggestions(patient), [patient]);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      text: `I’m helping with ${patientName(patient)}'s admission dossier. I can check what’s missing, draft document requests, and confirm readiness to send. ${GUARDRAIL}`,
    },
  ]);

  if (!open) return null;

  const ask = (prompt: string) => {
    const cleaned = prompt.trim();
    if (!cleaned) return;
    setTurns((prev) => [
      ...prev,
      { role: "user", text: cleaned },
      { role: "assistant", text: answerFor(cleaned, patient) },
    ]);
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-white">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold">{t("Ask Haven")}</p>
              <p className="text-xs text-ink-muted">{t("Administrative help only")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink-muted hover:bg-bg-soft"
            aria-label={t("Close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {turns.map((turn, i) => (
            <div
              key={`${turn.role}-${i}`}
              className={cn(
                "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                turn.role === "user"
                  ? "ml-auto bg-ink text-white"
                  : "bg-bg-soft text-ink",
              )}
            >
              {turn.text}
            </div>
          ))}
        </div>

        <div className="border-t border-line px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PROMPTS.slice(0, 4).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ask(p)}
                className="rounded-full bg-bg-soft px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:bg-brand-soft hover:text-brand-strong"
              >
                {t(p)}
              </button>
            ))}
          </div>
          {suggestions.length ? (
            <p className="mb-2 text-[11px] text-ink-faint">{suggestions[0]}</p>
          ) : null}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Ask about documents, readiness, or drafts…")}
              className="flex-1 rounded-xl border border-line bg-bg-soft px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <Button type="submit" size="sm">
              {t("Send")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
