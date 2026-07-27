"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  APPLICATION_STATUS_LABEL,
  DOC_CATEGORY_LABEL,
  DOC_WORKSPACE_CATEGORIES,
  PATIENT_STATUS_LABEL,
  dossierCompleteness,
  dossierAiSuggestions,
  patientName,
  statusTone,
  type CareProfile,
  type DocCategory,
  type Patient,
} from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { formatRelative } from "@/lib/format-relative";
import { PatientAskHaven } from "@/components/professional/PatientAskHaven";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "patient", label: "Patient information" },
  { id: "care", label: "Care information" },
  { id: "documents", label: "Documents" },
  { id: "timeline", label: "Timeline" },
  { id: "applications", label: "Applications" },
  { id: "messages", label: "Messages" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const fieldClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm outline-none focus:border-brand";

function EditableField({
  label,
  value,
  onChange,
  onBlur,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : (
        <input
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
    </label>
  );
}

export function PatientWorkspace() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const {
    getPatient,
    updatePatient,
    updatePatientCare,
    updatePatientStatus,
    addMessage,
    pushTimeline,
    addDocument,
    updateDocument,
    removeDocument,
    replaceDocument,
  } = useProfessional();
  const patient = getPatient(id);

  const initial = (params.get("tab") as TabId | null) || "overview";
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initial) ? initial : "overview",
  );
  const [aiOpen, setAiOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [msgAudience, setMsgAudience] = useState<"family" | "community" | "professional">(
    "family",
  );
  const [uploadCategory, setUploadCategory] = useState<DocCategory>("identity");
  const [dragOver, setDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const completeness = useMemo(
    () => (patient ? dossierCompleteness(patient) : null),
    [patient],
  );
  const suggestions = useMemo(
    () => (patient ? dossierAiSuggestions(patient) : []),
    [patient],
  );

  if (!patient || !completeness) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-ink-muted">Patient not found.</p>
        <Button href="/professional/patients" className="mt-4" variant="secondary">
          Back to patients
        </Button>
      </div>
    );
  }

  const notify = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  };

  const setTabAndUrl = (next: TabId) => {
    setTab(next);
    router.replace(`/professional/patients/${patient.id}?tab=${next}`, { scroll: false });
  };

  const saveCare = (patch: Partial<CareProfile>) => {
    updatePatientCare(patient.id, patch);
    notify("Care information saved");
  };

  const ingestFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    list.forEach((file) => {
      addDocument(patient.id, {
        category: uploadCategory,
        name: file.name,
        previewHint: `${file.type || "file"} · ${Math.round(file.size / 1024)} KB`,
      });
    });
    if (list.length) notify(`${list.length} document${list.length > 1 ? "s" : ""} added`);
  };

  const onSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addMessage(
      patient.id,
      draft,
      msgAudience === "professional" ? "professional" : msgAudience,
    );
    setDraft("");
    notify("Message sent");
  };

  const careFields: { key: keyof CareProfile; label: string }[] = [
    { key: "diagnosis", label: "Diagnoses" },
    { key: "requiredCareLevel", label: "Care level / autonomy" },
    { key: "mobility", label: "Mobility" },
    { key: "memory", label: "Memory / cognition" },
    { key: "behaviour", label: "Behaviours" },
    { key: "fallRisk", label: "Fall risk" },
    { key: "continence", label: "Continence" },
    { key: "medicationAssistance", label: "Medication assistance" },
    { key: "adls", label: "ADLs" },
    { key: "specialEquipment", label: "Special equipment" },
    { key: "diet", label: "Diet / nutrition" },
    { key: "language", label: "Preferred language" },
    { key: "insurance", label: "Insurance / payer" },
    { key: "budget", label: "Budget" },
    { key: "preferredRegion", label: "Preferred region" },
    { key: "notes", label: "Clinical notes" },
  ];

  return (
    <div className="min-h-full bg-bg">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8">
          <Link
            href="/professional/patients"
            className="text-sm text-ink-muted transition hover:text-ink"
          >
            ← Patients
          </Link>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-ink">
                  {patientName(patient)}
                </h1>
                <Badge tone={statusTone(patient.status)}>
                  {PATIENT_STATUS_LABEL[patient.status]}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                {patient.age} years
                <span className="mx-1.5">·</span>
                {patient.hospital || "Hospital not set"}
                {patient.unit ? ` · ${patient.unit}` : ""}
                <span className="mx-1.5">·</span>
                Owner: {patient.assignedProfessional}
              </p>

              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <span>Dossier completeness</span>
                  <span className="font-semibold tabular-nums text-ink">
                    {completeness.percent}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="soft" onClick={() => setAiOpen(true)}>
                Open AI Assistant
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setTabAndUrl("messages");
                  setMsgAudience("family");
                  pushTimeline(patient.id, "Family invited to collaborate", "Share with family");
                  notify("Open Messages to share with family");
                }}
              >
                Share with family
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  pushTimeline(
                    patient.id,
                    "Application package prepared",
                    `${completeness.percent}% complete`,
                  );
                  notify("Application package ready to generate from Applications");
                  setTabAndUrl("applications");
                }}
              >
                Generate application package
              </Button>
              <Button href={`/professional/communities?patient=${patient.id}`} size="sm">
                Find matching communities
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1180px] px-5 md:px-8">
          <nav className="flex gap-1 overflow-x-auto pb-px" aria-label="Patient dossier">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabAndUrl(t.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3.5 py-3 text-sm font-medium transition",
                  tab === t.id
                    ? "border-brand text-brand-strong"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8">
        {flash ? (
          <p className="mb-5 rounded-xl bg-success-soft px-3 py-2 text-sm font-medium text-success">
            {flash}
          </p>
        ) : null}

        {tab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-4 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Overview
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-ink-faint">Identity</p>
                  <p className="mt-1 font-medium text-ink">
                    {patientName(patient)} · {patient.age}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Status</p>
                  <p className="mt-1 font-medium text-ink">
                    {PATIENT_STATUS_LABEL[patient.status]}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-ink-faint">Next objective</p>
                  <input
                    className={fieldClass}
                    value={patient.nextAction}
                    onChange={(e) => updatePatient(patient.id, { nextAction: e.target.value })}
                    onBlur={() => notify("Next objective saved")}
                  />
                </div>
              </div>
              <label className="block text-sm font-medium text-ink">
                Placement status
                <select
                  className={fieldClass}
                  value={patient.status}
                  onChange={(e) => {
                    updatePatientStatus(patient.id, e.target.value as Patient["status"]);
                    pushTimeline(
                      patient.id,
                      "Status updated",
                      PATIENT_STATUS_LABEL[e.target.value as Patient["status"]],
                    );
                    notify("Status updated");
                  }}
                >
                  {(Object.keys(PATIENT_STATUS_LABEL) as Array<keyof typeof PATIENT_STATUS_LABEL>).map(
                    (s) => (
                      <option key={s} value={s}>
                        {PATIENT_STATUS_LABEL[s]}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </Card>

            <Card className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                AI snapshot
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {completeness.percent}% complete
              </p>
              <ul className="mt-4 space-y-2">
                {suggestions.slice(0, 4).map((tip) => (
                  <li
                    key={tip}
                    className="rounded-xl bg-brand-soft/40 px-3 py-2.5 text-sm text-ink-secondary"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                variant="soft"
                onClick={() => setAiOpen(true)}
              >
                Open AI Assistant
              </Button>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Latest activity
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-brand"
                  onClick={() => setTabAndUrl("timeline")}
                >
                  Full timeline
                </button>
              </div>
              <ol className="mt-4 space-y-3">
                {[...patient.timeline]
                  .sort((a, b) => +new Date(b.at) - +new Date(a.at))
                  .slice(0, 5)
                  .map((event) => (
                    <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-ink">{event.label}</p>
                        {event.detail ? (
                          <p className="text-ink-muted">{event.detail}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {formatRelative(event.at)}
                      </span>
                    </li>
                  ))}
              </ol>
            </Card>
          </div>
        ) : null}

        {tab === "patient" ? (
          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-ink">Identity</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <EditableField
                  label="First name"
                  value={patient.firstName}
                  onChange={(v) => updatePatient(patient.id, { firstName: v })}
                  onBlur={() => {
                    pushTimeline(patient.id, "Patient information updated", "Name");
                    notify("Saved");
                  }}
                />
                <EditableField
                  label="Last name"
                  value={patient.lastName}
                  onChange={(v) => updatePatient(patient.id, { lastName: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Date of birth"
                  value={patient.dateOfBirth}
                  onChange={(v) => updatePatient(patient.id, { dateOfBirth: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Gender"
                  value={patient.gender}
                  onChange={(v) => updatePatient(patient.id, { gender: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Language"
                  value={patient.language}
                  onChange={(v) => updatePatient(patient.id, { language: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Phone"
                  value={patient.phone || ""}
                  onChange={(v) => updatePatient(patient.id, { phone: v })}
                  onBlur={() => notify("Saved")}
                />
                <div className="sm:col-span-2">
                  <EditableField
                    label="Address"
                    value={patient.address || ""}
                    onChange={(v) => updatePatient(patient.id, { address: v })}
                    onBlur={() => notify("Saved")}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-ink">Hospital & ownership</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <EditableField
                  label="Current hospital"
                  value={patient.hospital}
                  onChange={(v) => updatePatient(patient.id, { hospital: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Unit / service"
                  value={patient.unit}
                  onChange={(v) => updatePatient(patient.id, { unit: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Current location"
                  value={patient.currentLocation}
                  onChange={(v) => updatePatient(patient.id, { currentLocation: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Case owner"
                  value={patient.assignedProfessional}
                  onChange={(v) => updatePatient(patient.id, { assignedProfessional: v })}
                  onBlur={() => notify("Saved")}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-ink">Family & contacts</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <EditableField
                  label="Family contact"
                  value={patient.familyContact}
                  onChange={(v) => updatePatient(patient.id, { familyContact: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Relationship"
                  value={patient.familyRelation}
                  onChange={(v) => updatePatient(patient.id, { familyRelation: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Emergency contact"
                  value={patient.emergencyContact}
                  onChange={(v) => updatePatient(patient.id, { emergencyContact: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Emergency phone"
                  value={patient.emergencyPhone}
                  onChange={(v) => updatePatient(patient.id, { emergencyPhone: v })}
                  onBlur={() => notify("Saved")}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-ink">Physician, pharmacy & insurance</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <EditableField
                  label="Primary physician"
                  value={patient.primaryPhysician || ""}
                  onChange={(v) => updatePatient(patient.id, { primaryPhysician: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Physician phone"
                  value={patient.physicianPhone || ""}
                  onChange={(v) => updatePatient(patient.id, { physicianPhone: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Pharmacy"
                  value={patient.pharmacy || ""}
                  onChange={(v) => updatePatient(patient.id, { pharmacy: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Pharmacy phone"
                  value={patient.pharmacyPhone || ""}
                  onChange={(v) => updatePatient(patient.id, { pharmacyPhone: v })}
                  onBlur={() => notify("Saved")}
                />
                <EditableField
                  label="Insurance / payer"
                  value={patient.care.insurance}
                  onChange={(v) => saveCare({ insurance: v })}
                />
                <EditableField
                  label="Allergies"
                  value={patient.allergies || ""}
                  onChange={(v) => updatePatient(patient.id, { allergies: v })}
                  onBlur={() => notify("Saved")}
                />
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "care" ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">Care information</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Update clinical details as the stay evolves. Nothing is shared until you apply.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {careFields.map(({ key, label }) => (
                <EditableField
                  key={key}
                  label={label}
                  value={patient.care[key] || ""}
                  onChange={(v) => updatePatientCare(patient.id, { [key]: v })}
                  onBlur={() => {
                    pushTimeline(patient.id, "Care information updated", label);
                    notify("Saved");
                  }}
                  multiline={key === "notes" || key === "diagnosis" || key === "adls"}
                />
              ))}
            </div>
          </Card>
        ) : null}

        {tab === "documents" ? (
          <div className="space-y-5">
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Documents</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Drag & drop, browse, or scan into the right folder.
                  </p>
                </div>
                <label className="text-sm font-medium text-ink">
                  Upload to
                  <select
                    className={fieldClass}
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as DocCategory)}
                  >
                    {DOC_WORKSPACE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {DOC_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                className={cn(
                  "mt-4 rounded-2xl border border-dashed px-5 py-10 text-center transition",
                  dragOver ? "border-brand bg-brand-soft/40" : "border-line bg-bg",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
                }}
              >
                <p className="text-sm font-medium text-ink">Drop files here</p>
                <p className="mt-1 text-xs text-ink-faint">PDF, images, or scans</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" size="sm" onClick={() => fileRef.current?.click()}>
                    Browse files
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      addDocument(patient.id, {
                        category: uploadCategory,
                        name: `Scan ${new Date().toLocaleString()}`,
                        previewHint: "scanned/image",
                        note: "Captured via scan",
                      });
                      notify("Scan added");
                    }}
                  >
                    Scan document
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      addDocument(patient.id, {
                        category: uploadCategory,
                        name: `New folder note · ${DOC_CATEGORY_LABEL[uploadCategory]}`,
                        note: "Placeholder for a document still to collect",
                      });
                      notify("Folder placeholder created");
                    }}
                  >
                    Create in folder
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) ingestFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            </Card>

            {DOC_WORKSPACE_CATEGORIES.map((cat) => {
              const docs = patient.documents.filter((d) => d.category === cat);
              const hard = ["identity", "insurance", "medication_list", "consent_forms"].includes(
                cat,
              );
              const complete = docs.length > 0 && docs.every((d) => d.verified);
              const incomplete = hard && docs.length === 0;
              return (
                <Card key={cat} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{DOC_CATEGORY_LABEL[cat]}</h3>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {docs.length} document{docs.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge tone={complete ? "success" : incomplete ? "warn" : "neutral"}>
                      {complete ? "Complete" : incomplete ? "Incomplete" : docs.length ? "In review" : "Empty"}
                    </Badge>
                  </div>
                  {docs.length === 0 ? (
                    <p className="mt-3 text-sm text-ink-muted">No documents in this folder yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {docs.map((d) => (
                        <li
                          key={d.id}
                          className="rounded-xl border border-line bg-bg px-3 py-3 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <input
                                className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-medium text-ink hover:border-line focus:border-brand"
                                value={d.name}
                                onChange={(e) =>
                                  updateDocument(patient.id, d.id, { name: e.target.value })
                                }
                              />
                              <p className="mt-0.5 text-xs text-ink-faint">
                                {d.uploadedBy} · {formatRelative(d.uploadedAt)}
                                {d.previewHint ? ` · ${d.previewHint}` : ""}
                              </p>
                              <input
                                className="mt-2 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
                                placeholder="Add a note…"
                                value={d.note || ""}
                                onChange={(e) =>
                                  updateDocument(patient.id, d.id, { note: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge tone={d.verified ? "success" : "warn"}>
                                {d.verified ? "Verified" : "Needs review"}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewDoc(d.id)}
                              >
                                Preview
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  updateDocument(patient.id, d.id, { verified: !d.verified });
                                  notify(d.verified ? "Marked needs review" : "Verified");
                                }}
                              >
                                {d.verified ? "Unverify" : "Verify"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  replaceDocument(patient.id, d.id, {
                                    name: `${d.name.replace(/\.[^.]+$/, "")}-updated.pdf`,
                                    previewHint: "replaced copy",
                                  });
                                  notify("Document replaced");
                                }}
                              >
                                Replace
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  removeDocument(patient.id, d.id);
                                  notify("Document deleted");
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                          {previewDoc === d.id ? (
                            <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-3 text-xs text-ink-secondary">
                              <p className="font-medium text-ink">Preview · {d.name}</p>
                              <p className="mt-1">
                                {d.previewHint ||
                                  "PDF preview placeholder, file stays attached to this dossier."}
                              </p>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => notify("Download started (demo)")}
                                >
                                  Download
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPreviewDoc(null)}
                                >
                                  Close preview
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        ) : null}

        {tab === "timeline" ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">Timeline</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Every meaningful change on this living dossier.
            </p>
            <ol className="mt-6 space-y-0">
              {[...patient.timeline]
                .sort((a, b) => +new Date(b.at) - +new Date(a.at))
                .map((event, i, arr) => (
                  <li key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                      {i < arr.length - 1 ? (
                        <span className="my-1 w-px flex-1 bg-line" />
                      ) : null}
                    </div>
                    <div className="pb-6">
                      <p className="text-sm font-medium text-ink">{event.label}</p>
                      {event.detail ? (
                        <p className="mt-0.5 text-sm text-ink-muted">{event.detail}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-ink-faint">{formatRelative(event.at)}</p>
                    </div>
                  </li>
                ))}
            </ol>
          </Card>
        ) : null}

        {tab === "applications" ? (
          <div className="space-y-4">
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Applications</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Track every community submission from this dossier.
                </p>
              </div>
              <Button href={`/professional/communities?patient=${patient.id}`} size="sm">
                Send new application
              </Button>
            </Card>
            {patient.applications.length === 0 ? (
              <Card className="p-6 text-sm text-ink-muted">
                No applications yet. Find matching communities to transmit this dossier.
              </Card>
            ) : (
              patient.applications.map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{a.communityName}</p>
                      <p className="mt-1 text-sm text-ink-muted">{a.nextAction}</p>
                    </div>
                    <Badge tone={statusTone(a.status)}>
                      {APPLICATION_STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-ink-secondary sm:grid-cols-2 lg:grid-cols-4">
                    <p>
                      Sent · {a.submittedAt ? formatRelative(a.submittedAt) : "Not sent"}
                    </p>
                    <p>Owner · {a.assignedStaff}</p>
                    <p className="truncate">Last message · {a.lastMessage}</p>
                    <p>Updated · {formatRelative(a.updatedAt)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      href={`/professional/messages?patient=${patient.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      Open messages
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setTabAndUrl("documents")}
                    >
                      Documents sent
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "messages" ? (
          <Card className="flex min-h-[480px] flex-col p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="font-semibold text-ink">Messages</p>
                <p className="text-sm text-ink-muted">
                  Family, communities, and care team, all tied to this dossier.
                </p>
              </div>
              <div className="flex gap-1 rounded-lg bg-bg-soft p-1">
                {(
                  [
                    ["family", "Family"],
                    ["community", "Communities"],
                    ["professional", "Care team"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMsgAudience(id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium",
                      msgAudience === id
                        ? "bg-surface text-ink shadow-xs"
                        : "text-ink-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {patient.messages.length === 0 ? (
                <p className="text-sm text-ink-muted">No messages yet on this dossier.</p>
              ) : (
                patient.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.from === "professional"
                        ? "ml-auto bg-brand text-white"
                        : "bg-bg-soft text-ink",
                    )}
                  >
                    <p className="text-[11px] opacity-80">{m.fromName}</p>
                    <p className="mt-1">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">{formatRelative(m.at)}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={onSendMessage} className="flex gap-2 border-t border-line p-4">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  msgAudience === "family"
                    ? "Message the family…"
                    : msgAudience === "community"
                      ? "Message a community…"
                      : "Note for the care team…"
                }
                className="flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
              <Button type="submit" disabled={!draft.trim()}>
                Send
              </Button>
            </form>
          </Card>
        ) : null}
      </div>

      <PatientAskHaven patient={patient} open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
