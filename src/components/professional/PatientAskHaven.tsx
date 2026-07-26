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

type ChatTurn = { role: "user" | "assistant"; text: string };

const PROMPTS = [
  "Summarize this dossier",
  "What information is missing?",
  "Which documents do I still need?",
  "Is this dossier ready to send?",
  "Which communities fit best?",
  "Generate a clinical summary",
  "Prepare a family summary",
  "Prepare a community summary",
  "Draft a message asking for the medication list",
  "What are the blockers?",
  "Check dossier consistency",
  "What risks do you see before sending?",
];

function answerFor(prompt: string, patient: Patient): string {
  const name = patientName(patient);
  const completeness = dossierCompleteness(patient);
  const readiness = patientDossierReadyForApply(patient);
  const missingDocs = missingPatientDocuments(patient);
  const missingCare = missingPatientCare(patient);
  const missingProfile = missingPatientProfile(patient);
  const q = prompt.toLowerCase();

  if (q.includes("summarize this dossier") || q.includes("clinical summary")) {
    return `${name} (${patient.age}) is currently at ${patient.hospital}${patient.unit ? `, ${patient.unit}` : ""}. Care needs: ${patient.care.requiredCareLevel || "not set"} · Mobility: ${patient.care.mobility || "—"} · Memory: ${patient.care.memory || "—"}. Primary diagnosis: ${patient.care.diagnosis || "not recorded"}. Insurance: ${patient.care.insurance || "—"}. Next action: ${patient.nextAction}.`;
  }
  if (q.includes("missing") || q.includes("still need") || q.includes("documents")) {
    const parts = [
      ...missingProfile.map((m) => `Profile · ${m}`),
      ...missingCare.map((m) => `Care · ${m}`),
      ...missingDocs.map((m) => `Document · ${m.label}`),
    ];
    return parts.length
      ? `Here’s what’s still open for ${name}:\n• ${parts.join("\n• ")}`
      : `No critical gaps found for ${name}. You can generate an application package.`;
  }
  if (q.includes("ready to send") || q.includes("ready to apply")) {
    return readiness.ok
      ? `${name}'s dossier is ready to send. Completeness ${completeness.percent}%.`
      : `${name} is not ready yet (${completeness.percent}% complete). ${readiness.reasons.join(" ")}`;
  }
  if (q.includes("communities") || q.includes("fit best") || q.includes("matching")) {
    return `Based on ${patient.care.requiredCareLevel || "care needs"}, ${patient.care.preferredRegion || "preferred region"}, and ${patient.care.insurance || "payer"}, open Find matching communities to shortlist residences. Prioritize communities that accept ${patient.care.requiredCareLevel || "this care level"} near ${patient.care.preferredRegion || patient.hospital}.`;
  }
  if (q.includes("family summary")) {
    return `Family summary for ${name}: We are coordinating senior living placement from ${patient.hospital}. Current focus: ${patient.nextAction}. Please help us collect any outstanding documents and confirm preferred communities in ${patient.care.preferredRegion || "your area"}.`;
  }
  if (q.includes("community summary") || q.includes("résidence") || q.includes("residence")) {
    return `Community packet summary — ${name}, ${patient.age}. Diagnosis: ${patient.care.diagnosis || "—"}. Care level: ${patient.care.requiredCareLevel || "—"}. Mobility: ${patient.care.mobility || "—"}. Memory: ${patient.care.memory || "—"}. Fall risk: ${patient.care.fallRisk || "—"}. Payer: ${patient.care.insurance || "—"}. Documents on file: ${patient.documents.length}.`;
  }
  if (q.includes("medication")) {
    return `Hi — to complete ${name}'s admission packet, could you please send the current medication list (name, dose, frequency)? You can reply here or upload it in HavenApply. Thank you.`;
  }
  if (q.includes("blocker") || q.includes("risk") || q.includes("consistency")) {
    const risks: string[] = [];
    if (missingDocs.length) risks.push(`Hard documents missing (${missingDocs.map((d) => d.label).join(", ")})`);
    if (!patient.primaryPhysician?.trim()) risks.push("No treating physician on file");
    if (!patient.care.fallRisk.trim()) risks.push("Fall risk not assessed");
    if (!patient.allergies?.trim()) risks.push("Allergies not documented");
    if (patient.documents.some((d) => !d.verified)) risks.push("Some documents still need verification");
    return risks.length
      ? `Risks / blockers before send:\n• ${risks.join("\n• ")}`
      : `No major blockers detected for ${name}. Double-check family consent before transmitting.`;
  }
  return dossierAiSuggestions(patient).join("\n\n");
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
  const suggestions = useMemo(() => dossierAiSuggestions(patient), [patient]);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      text: `I’m working on ${patientName(patient)}'s dossier. Ask me what’s missing, what to send next, or to draft a summary.`,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Sparkles size={16} className="text-brand" />
              AI Assistant
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Context: {patientName(patient)} · live dossier
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-muted hover:bg-bg-soft"
            aria-label="Close assistant"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 border-b border-line bg-brand-soft/30 px-5 py-3">
          {suggestions.slice(0, 3).map((tip) => (
            <p key={tip} className="text-xs leading-relaxed text-ink-secondary">
              {tip}
            </p>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {turns.map((t, i) => (
            <div
              key={`${t.role}-${i}`}
              className={cn(
                "max-w-[92%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm",
                t.role === "user"
                  ? "ml-auto bg-brand text-white"
                  : "bg-bg-soft text-ink",
              )}
            >
              {t.text}
            </div>
          ))}
        </div>

        <div className="border-t border-line px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PROMPTS.slice(0, 6).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ask(p)}
                className="rounded-lg bg-bg-soft px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:text-ink"
              >
                {p}
              </button>
            ))}
          </div>
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
              placeholder="Ask about this patient…"
              className="flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <Button type="submit" size="sm" disabled={!input.trim()}>
              Ask
            </Button>
          </form>
        </div>
      </aside>
    </div>
  );
}
