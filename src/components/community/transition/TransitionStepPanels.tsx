"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { CommunityApplication, CommunityProfile } from "@/lib/community-portal";
import {
  AGREEMENT_TEMPLATES,
  PAYMENT_METHODS,
  agreementStatusLabel,
  buildAgreementPreviewHtml,
  downloadHtmlAsFile,
  familyStatusLabel,
  moveInStatusLabel,
  newId,
  paymentStatusLabel,
  type AgreementWork,
  type EmailTemplateId,
  type FamilyDetailsSections,
  type FamilyDetailsWork,
  type MoveInWork,
  type PaymentWork,
  type TransitionEmailRecord,
  type TransitionStepId,
  type TransitionWork,
} from "@/lib/community-transition";
import { TransitionEmailComposer } from "@/components/community/transition/TransitionEmailComposer";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

type SaveFn = (
  updater: (prev: TransitionWork) => TransitionWork,
  timelineAction?: string,
  timelineDetail?: string,
) => void;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

export function TransitionStepPanel({
  stepId,
  app,
  work,
  profile,
  onSave,
  onClose,
}: {
  stepId: TransitionStepId;
  app: CommunityApplication;
  work: TransitionWork;
  profile: CommunityProfile | null;
  onSave: SaveFn;
  onClose: () => void;
}) {
  if (stepId === "contract")
    return (
      <AgreementPanel app={app} work={work} profile={profile} onSave={onSave} onClose={onClose} />
    );
  if (stepId === "payment")
    return <PaymentPanel app={app} work={work} onSave={onSave} onClose={onClose} />;
  if (stepId === "familyDetails")
    return <FamilyPanel app={app} work={work} onSave={onSave} onClose={onClose} />;
  return <MoveInPanel app={app} work={work} onSave={onSave} onClose={onClose} />;
}

function PanelShell({
  title,
  status,
  onClose,
  children,
}: {
  title: string;
  status: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/35">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-surface shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted">Status: {status}</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function AgreementPanel({
  app,
  work,
  profile,
  onSave,
  onClose,
}: {
  app: CommunityApplication;
  work: TransitionWork;
  profile: CommunityProfile | null;
  onSave: SaveFn;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AgreementWork>(work.agreement);
  const [emailTpl, setEmailTpl] = useState<EmailTemplateId | null>(null);
  const communityName = profile?.name || "Community";

  const patch = (partial: Partial<AgreementWork>) => setDraft((d) => ({ ...d, ...partial }));

  const persist = (next: AgreementWork, action?: string, detail?: string) => {
    onSave((prev) => ({ ...prev, agreement: next }), action, detail);
  };

  const generate = () => {
    const next = {
      ...draft,
      status: draft.status === "not_started" ? ("draft" as const) : draft.status,
      version: Math.max(1, draft.version + (draft.status === "not_started" ? 1 : 0)),
    };
    if (draft.status !== "not_started") next.version = draft.version + 1;
    setDraft(next);
    persist(next, "Contract generated", `Version ${next.version} · ${next.templateId}`);
    const html = buildAgreementPreviewHtml(app, next, communityName);
    downloadHtmlAsFile(
      `${app.seniorName.replace(/\s+/g, "-")}-residency-agreement-v${next.version}.html`,
      html,
    );
  };

  const preview = () => {
    const html = buildAgreementPreviewHtml(app, draft, communityName);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <PanelShell
      title="Residency agreement"
      status={agreementStatusLabel(draft.status)}
      onClose={onClose}
    >
      <Field label="Contract template">
        <select
          className={inputClass}
          value={draft.templateId}
          onChange={(e) => patch({ templateId: e.target.value })}
        >
          {AGREEMENT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Suite / room type">
          <input
            className={inputClass}
            value={draft.roomType}
            onChange={(e) => patch({ roomType: e.target.value })}
          />
        </Field>
        <Field label="Monthly rate">
          <input
            className={inputClass}
            value={draft.monthlyRate}
            onChange={(e) => patch({ monthlyRate: e.target.value })}
            placeholder="e.g. 5200"
          />
        </Field>
      </div>
      <Field label="Anticipated move-in date">
        <input
          type="date"
          className={inputClass}
          value={draft.moveInDate?.slice(0, 10) || ""}
          onChange={(e) => patch({ moveInDate: e.target.value })}
        />
      </Field>
      <Field label="Signers">
        <input
          className={inputClass}
          value={draft.signers.join(", ")}
          onChange={(e) =>
            patch({
              signers: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
      <Field label="Additional clauses">
        <textarea
          rows={3}
          className={inputClass}
          value={draft.clauses}
          onChange={(e) => patch({ clauses: e.target.value })}
        />
      </Field>
      <Field label="Internal notes">
        <textarea
          rows={2}
          className={inputClass}
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={generate}>
          Generate agreement
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={preview}>
          Preview
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={draft.status === "not_started"}
          onClick={() => setEmailTpl("agreement_send")}
        >
          Send for signature
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!["sent", "viewed", "partially_signed"].includes(draft.status)}
          onClick={() => setEmailTpl("agreement_reminder")}
        >
          Reminder
        </Button>
      </div>

      <div className="rounded-xl border border-line bg-bg px-3 py-3 text-sm">
        <p className="font-medium text-ink">Family / signature actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!["sent", "viewed"].includes(draft.status)}
            onClick={() => {
              const next = { ...draft, status: "viewed" as const };
              setDraft(next);
              persist(next, "Contract opened by family");
            }}
          >
            Mark viewed
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!["sent", "viewed", "partially_signed"].includes(draft.status)}
            onClick={() => {
              const next = {
                ...draft,
                status: "signed" as const,
                signedAt: new Date().toISOString(),
              };
              setDraft(next);
              persist(next, "Contract signed");
            }}
          >
            Mark signed
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const name = `signed-agreement-v${draft.version || 1}.pdf`;
              const next = {
                ...draft,
                uploadedSignedName: name,
                status: "signed" as const,
                signedAt: new Date().toISOString(),
              };
              setDraft(next);
              persist(next, "Signed contract uploaded", name);
            }}
          >
            Upload signed copy
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={draft.status !== "signed" && draft.status !== "verified"}
            onClick={() => {
              const next = {
                ...draft,
                status: "verified" as const,
                verifiedAt: new Date().toISOString(),
              };
              setDraft(next);
              persist(next, "Contract verified");
            }}
          >
            Mark verified
          </Button>
        </div>
        {draft.uploadedSignedName ? (
          <p className="mt-2 text-xs text-ink-faint">Uploaded: {draft.uploadedSignedName}</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          persist(draft, "Agreement draft saved");
        }}
      >
        Save changes
      </Button>

      {emailTpl && (
        <TransitionEmailComposer
          to={app.family.email}
          templateId={emailTpl}
          onCancel={() => setEmailTpl(null)}
          onSend={({ to, subject, body, template }) => {
            const email: TransitionEmailRecord = {
              id: newId("em"),
              at: new Date().toISOString(),
              template,
              to,
              subject,
              body,
              stepId: "contract",
              status: "sent",
            };
            const next = {
              ...draft,
              status:
                draft.status === "draft" || draft.status === "not_started"
                  ? ("sent" as const)
                  : draft.status,
              lastSentAt: email.at,
              version: Math.max(1, draft.version),
            };
            setDraft(next);
            onSave(
              (prev) => ({
                ...prev,
                agreement: next,
                emails: [email, ...prev.emails],
              }),
              "Contract sent for signature",
              subject,
            );
            setEmailTpl(null);
          }}
        />
      )}
    </PanelShell>
  );
}

function PaymentPanel({
  app,
  work,
  onSave,
  onClose,
}: {
  app: CommunityApplication;
  work: TransitionWork;
  onSave: SaveFn;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PaymentWork>(work.payment);
  const [emailTpl, setEmailTpl] = useState<EmailTemplateId | null>(null);
  const balance = Math.max(0, draft.amountDue - draft.amountReceived);

  const patch = (partial: Partial<PaymentWork>) => setDraft((d) => ({ ...d, ...partial }));
  const persist = (next: PaymentWork, action?: string, detail?: string) => {
    onSave((prev) => ({ ...prev, payment: next }), action, detail);
  };

  return (
    <PanelShell title="Deposit & payment" status={paymentStatusLabel(draft.status)} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-bg px-3 py-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-faint">Requested</p>
          <p className="font-semibold tabular-nums">${draft.amountDue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Received</p>
          <p className="font-semibold tabular-nums">${draft.amountReceived.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Balance</p>
          <p className="font-semibold tabular-nums">${balance.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Due</p>
          <p className="font-semibold">{draft.dueDate || "-"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Deposit amount">
          <input
            type="number"
            className={inputClass}
            value={draft.amountDue}
            onChange={(e) => patch({ amountDue: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Due date">
          <input
            type="date"
            className={inputClass}
            value={draft.dueDate}
            onChange={(e) => patch({ dueDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="What the deposit covers">
        <textarea
          rows={2}
          className={inputClass}
          value={draft.covers}
          onChange={(e) => patch({ covers: e.target.value })}
        />
      </Field>
      <Field label="Accepted payment methods">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => {
            const on = draft.acceptedMethods.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() =>
                  patch({
                    acceptedMethods: on
                      ? draft.acceptedMethods.filter((x) => x !== m)
                      : [...draft.acceptedMethods, m],
                  })
                }
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  on ? "bg-brand-soft text-brand-strong" : "bg-bg text-ink-muted",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Responsible payer">
          <input
            className={inputClass}
            value={draft.payerName}
            onChange={(e) => patch({ payerName: e.target.value })}
          />
        </Field>
        <Field label="Billing email">
          <input
            className={inputClass}
            value={draft.billingEmail}
            onChange={(e) => patch({ billingEmail: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Confirmed ongoing payment method">
        <input
          className={inputClass}
          value={draft.methodConfirmed}
          onChange={(e) => patch({ methodConfirmed: e.target.value })}
          placeholder="Private pay · ACH monthly"
        />
      </Field>
      <Field label="Billing notes / payment plan">
        <textarea
          rows={2}
          className={inputClass}
          value={draft.billingNotes}
          onChange={(e) => patch({ billingNotes: e.target.value })}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const link = `https://pay.havenapply.com/deposit/${app.id.slice(0, 8)}`;
            const next = {
              ...draft,
              status: "request_created" as const,
              paymentLink: link,
            };
            setDraft(next);
            persist(next, "Payment request created", `$${next.amountDue}`);
          }}
        >
          Request deposit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={draft.status === "not_started"}
          onClick={() => setEmailTpl("deposit_request")}
        >
          Send payment link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!draft.paymentLink}
          onClick={() => setEmailTpl("deposit_reminder")}
        >
          Payment reminder
        </Button>
      </div>

      {draft.paymentLink ? (
        <p className="rounded-xl bg-brand-soft/40 px-3 py-2 text-xs text-ink-secondary">
          Secure link: {draft.paymentLink}
        </p>
      ) : null}

      <div className="rounded-xl border border-line bg-bg px-3 py-3">
        <p className="text-sm font-medium text-ink">Record payment</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Amount received">
            <input
              type="number"
              className={inputClass}
              value={draft.amountReceived}
              onChange={(e) => patch({ amountReceived: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Method used">
            <select
              className={inputClass}
              value={draft.methodConfirmed}
              onChange={(e) => patch({ methodConfirmed: e.target.value })}
            >
              <option value="">Select…</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const received = draft.amountReceived;
              const status =
                received <= 0
                  ? draft.status
                  : received < draft.amountDue
                    ? ("partially_paid" as const)
                    : ("paid" as const);
              const next = {
                ...draft,
                status,
                proofName: draft.proofName || "payment-proof.pdf",
                receiptNote: `Receipt for $${received}`,
              };
              setDraft(next);
              persist(next, "Payment recorded", `$${received} · ${next.methodConfirmed || "method TBD"}`);
            }}
          >
            Record payment
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              draft.amountReceived < draft.amountDue ||
              draft.amountDue <= 0 ||
              !draft.methodConfirmed.trim()
            }
            onClick={() => {
              const next = {
                ...draft,
                status: "verified" as const,
                verifiedAt: new Date().toISOString(),
              };
              setDraft(next);
              persist(next, "Deposit verified · payment method confirmed");
            }}
          >
            Verify deposit
          </Button>
        </div>
      </div>

      <Button type="button" size="sm" variant="secondary" onClick={() => persist(draft, "Payment details saved")}>
        Save changes
      </Button>

      {emailTpl && (
        <TransitionEmailComposer
          to={draft.billingEmail || app.family.email}
          templateId={emailTpl}
          onCancel={() => setEmailTpl(null)}
          onSend={({ to, subject, body, template }) => {
            const email: TransitionEmailRecord = {
              id: newId("em"),
              at: new Date().toISOString(),
              template,
              to,
              subject,
              body,
              stepId: "payment",
              status: "sent",
            };
            const next = {
              ...draft,
              status:
                draft.status === "request_created" || draft.status === "not_started"
                  ? ("sent" as const)
                  : draft.status === "sent"
                    ? ("pending" as const)
                    : draft.status,
              lastSentAt: email.at,
              paymentLink:
                draft.paymentLink || `https://pay.havenapply.com/deposit/${app.id.slice(0, 8)}`,
            };
            setDraft(next);
            onSave(
              (prev) => ({
                ...prev,
                payment: next,
                emails: [email, ...prev.emails],
              }),
              "Deposit request emailed",
              subject,
            );
            setEmailTpl(null);
          }}
        />
      )}
    </PanelShell>
  );
}

const SECTION_LABELS: Record<keyof FamilyDetailsSections, string> = {
  contacts: "Contacts",
  health: "Health & pharmacy",
  belongings: "Personal belongings",
  preferences: "Preferences & habits",
  logistics: "Logistics",
};

const SECTION_FIELDS: Record<keyof FamilyDetailsSections, { key: string; label: string }[]> = {
  contacts: [
    { key: "primaryContact", label: "Primary contact" },
    { key: "emergencyContact", label: "Emergency contact" },
    { key: "authorizedInfo", label: "Authorized for information" },
    { key: "authorizedPickup", label: "Authorized pickup" },
    { key: "billingContact", label: "Billing contact" },
    { key: "decisionMaker", label: "Decision maker" },
  ],
  health: [
    { key: "pharmacy", label: "Pharmacy" },
    { key: "pharmacyPhone", label: "Pharmacy phone" },
    { key: "primaryPhysician", label: "Primary physician" },
    { key: "physicianPhone", label: "Physician phone" },
    { key: "allergies", label: "Allergies" },
    { key: "medications", label: "Final medication list" },
    { key: "medManagement", label: "Medication management" },
    { key: "prescriptionsNeeded", label: "Prescriptions needed" },
    { key: "arrivalMedicalNeeds", label: "Arrival-day medical needs" },
  ],
  belongings: [
    { key: "furniture", label: "Furniture" },
    { key: "clothing", label: "Clothing" },
    { key: "medicalDevices", label: "Medical devices" },
    { key: "valuables", label: "Valuables" },
    { key: "specialEquipment", label: "Special equipment" },
    { key: "inventory", label: "Inventory" },
    { key: "labelingNeeds", label: "Labeling needs" },
  ],
  preferences: [
    { key: "diet", label: "Diet" },
    { key: "foodAllergies", label: "Food allergies" },
    { key: "dailyRoutine", label: "Daily routine" },
    { key: "sleepPreferences", label: "Sleep preferences" },
    { key: "socialHabits", label: "Social habits" },
    { key: "faith", label: "Faith / practices" },
    { key: "interests", label: "Interests" },
    { key: "communicationPrefs", label: "Communication preferences" },
    { key: "specialNeeds", label: "Special needs" },
  ],
  logistics: [
    { key: "presentOnMoveIn", label: "Present on move-in day" },
    { key: "movingCompany", label: "Moving company" },
    { key: "preferredArrivalTime", label: "Preferred arrival time" },
    { key: "buildingAccess", label: "Building access" },
    { key: "parking", label: "Parking" },
    { key: "medicalTransport", label: "Medical transport" },
    { key: "equipmentToPrepare", label: "Equipment to prepare" },
    { key: "specialInstructions", label: "Special instructions" },
  ],
};

function FamilyPanel({
  app,
  work,
  onSave,
  onClose,
}: {
  app: CommunityApplication;
  work: TransitionWork;
  onSave: SaveFn;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FamilyDetailsWork>(work.familyDetails);
  const [emailTpl, setEmailTpl] = useState<EmailTemplateId | null>(null);
  const [openSection, setOpenSection] = useState<keyof FamilyDetailsSections>("contacts");

  const missing = useMemo(() => {
    const keys = draft.sectionsRequested;
    const gaps: string[] = [];
    for (const section of keys) {
      for (const field of SECTION_FIELDS[section]) {
        if (!draft.data[section][field.key]?.trim()) gaps.push(`${SECTION_LABELS[section]} · ${field.label}`);
      }
    }
    return gaps;
  }, [draft]);

  const persist = (next: FamilyDetailsWork, action?: string, detail?: string) => {
    onSave((prev) => ({ ...prev, familyDetails: next }), action, detail);
  };

  return (
    <PanelShell
      title="Final family details"
      status={familyStatusLabel(draft.status)}
      onClose={onClose}
    >
      <p className="text-sm text-ink-muted">
        Prefill from the dossier. Send only the sections the family still needs to complete.
      </p>

      <div>
        <p className="text-sm font-medium text-ink">Sections to request</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(SECTION_LABELS) as (keyof FamilyDetailsSections)[]).map((key) => {
            const on = draft.sectionsRequested.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    sectionsRequested: on
                      ? d.sectionsRequested.filter((x) => x !== key)
                      : [...d.sectionsRequested, key],
                  }))
                }
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  on ? "bg-brand-soft text-brand-strong" : "bg-bg text-ink-muted",
                )}
              >
                {SECTION_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {(Object.keys(SECTION_LABELS) as (keyof FamilyDetailsSections)[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpenSection(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              openSection === key ? "bg-ink text-white" : "bg-bg-soft text-ink-muted",
            )}
          >
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {SECTION_FIELDS[openSection].map((field) => (
          <Field key={field.key} label={field.label}>
            <input
              className={inputClass}
              value={draft.data[openSection][field.key] || ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  data: {
                    ...d.data,
                    [openSection]: {
                      ...d.data[openSection],
                      [field.key]: e.target.value,
                    },
                  },
                }))
              }
            />
          </Field>
        ))}
      </div>

      {missing.length > 0 ? (
        <div className="rounded-xl border border-warn/30 bg-warn-soft/40 px-3 py-2 text-xs text-ink-secondary">
          <p className="font-medium text-ink">Missing ({missing.length})</p>
          <p className="mt-1">{missing.slice(0, 6).join(" · ")}{missing.length > 6 ? "…" : ""}</p>
        </div>
      ) : (
        <Badge tone="success">Required fields complete for selected sections</Badge>
      )}

      <Field label="Internal notes">
        <textarea
          rows={2}
          className={inputClass}
          value={draft.internalNotes}
          onChange={(e) => setDraft((d) => ({ ...d, internalNotes: e.target.value }))}
        />
      </Field>
      <Field label="Correction request (if sending back)">
        <textarea
          rows={2}
          className={inputClass}
          value={draft.correctionRequest}
          onChange={(e) => setDraft((d) => ({ ...d, correctionRequest: e.target.value }))}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setEmailTpl("family_details_request")}
        >
          Request family details
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const next = {
              ...draft,
              status: "submitted" as const,
              submittedAt: new Date().toISOString(),
            };
            setDraft(next);
            persist(next, "Family details submitted");
          }}
        >
          Mark submitted
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!draft.correctionRequest.trim()}
          onClick={() => {
            setEmailTpl("family_details_correction");
          }}
        >
          Request correction
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={missing.length > 0}
          onClick={() => {
            const next = {
              ...draft,
              status: "verified" as const,
              verifiedAt: new Date().toISOString(),
            };
            setDraft(next);
            persist(next, "Family details verified");
          }}
        >
          Mark verified
        </Button>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => persist(draft, "Family details saved")}
      >
        Save changes
      </Button>

      {emailTpl && (
        <TransitionEmailComposer
          to={app.family.email}
          templateId={emailTpl}
          onCancel={() => setEmailTpl(null)}
          onSend={({ to, subject, body, template }) => {
            const email: TransitionEmailRecord = {
              id: newId("em"),
              at: new Date().toISOString(),
              template,
              to,
              subject,
              body,
              stepId: "familyDetails",
              status: "sent",
            };
            const next = {
              ...draft,
              status:
                template === "family_details_correction"
                  ? ("changes_requested" as const)
                  : ("requested" as const),
              lastSentAt: email.at,
            };
            setDraft(next);
            onSave(
              (prev) => ({
                ...prev,
                familyDetails: next,
                emails: [email, ...prev.emails],
              }),
              template === "family_details_correction"
                ? "Correction requested from family"
                : "Family details form emailed",
              subject,
            );
            setEmailTpl(null);
          }}
        />
      )}
    </PanelShell>
  );
}

function MoveInPanel({
  app,
  work,
  onSave,
  onClose,
}: {
  app: CommunityApplication;
  work: TransitionWork;
  onSave: SaveFn;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MoveInWork>(work.moveIn);
  const [emailTpl, setEmailTpl] = useState<EmailTemplateId | null>(null);
  const [proposeDate, setProposeDate] = useState("");

  const patch = (partial: Partial<MoveInWork>) => setDraft((d) => ({ ...d, ...partial }));
  const persist = (next: MoveInWork, action?: string, detail?: string) => {
    onSave((prev) => ({ ...prev, moveIn: next }), action, detail);
  };

  return (
    <PanelShell title="Move-in date" status={moveInStatusLabel(draft.status)} onClose={onClose}>
      <div className="rounded-xl border border-line bg-bg px-3 py-3 text-sm">
        <p>
          <span className="text-ink-faint">Confirmed:</span>{" "}
          <span className="font-medium text-ink">
            {draft.confirmedDate
              ? `${draft.confirmedDate}${draft.confirmedTime ? ` · ${draft.confirmedTime}` : ""}`
              : "Not confirmed yet"}
          </span>
        </p>
        <p className="mt-1">
          <span className="text-ink-faint">Unit:</span> {draft.unit || "-"}
        </p>
        <p className="mt-1">
          <span className="text-ink-faint">Host:</span> {draft.hostStaff || "-"}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Propose a date">
          <input
            type="date"
            className={inputClass}
            value={proposeDate}
            onChange={(e) => setProposeDate(e.target.value)}
          />
        </Field>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!proposeDate}
          onClick={() => {
            if (!proposeDate) return;
            const next = {
              ...draft,
              proposedDates: Array.from(new Set([...draft.proposedDates, proposeDate])),
              status: "proposed" as const,
            };
            setDraft(next);
            persist(next, "Move-in date proposed", proposeDate);
            setProposeDate("");
          }}
        >
          Add proposed date
        </Button>
      </div>

      {draft.proposedDates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {draft.proposedDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => patch({ confirmedDate: d })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium",
                draft.confirmedDate === d
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-line text-ink-muted",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Confirmed date">
          <input
            type="date"
            className={inputClass}
            value={draft.confirmedDate?.slice(0, 10) || ""}
            onChange={(e) => patch({ confirmedDate: e.target.value })}
          />
        </Field>
        <Field label="Time">
          <input
            type="time"
            className={inputClass}
            value={draft.confirmedTime}
            onChange={(e) => patch({ confirmedTime: e.target.value })}
          />
        </Field>
        <Field label="Unit / room">
          <input
            className={inputClass}
            value={draft.unit}
            onChange={(e) => patch({ unit: e.target.value })}
          />
        </Field>
        <Field label="Arrival window">
          <input
            className={inputClass}
            value={draft.arrivalWindow}
            onChange={(e) => patch({ arrivalWindow: e.target.value })}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={draft.unitAvailable}
          onChange={(e) => patch({ unitAvailable: e.target.checked })}
        />
        Unit availability confirmed
      </label>

      <Field label="Host staff">
        <input
          className={inputClass}
          value={draft.hostStaff}
          onChange={(e) => patch({ hostStaff: e.target.value })}
        />
      </Field>
      <Field label="Services to notify">
        <input
          className={inputClass}
          value={draft.notifyServices}
          onChange={(e) => patch({ notifyServices: e.target.value })}
        />
      </Field>
      <Field label="People present">
        <input
          className={inputClass}
          value={draft.attendees}
          onChange={(e) => patch({ attendees: e.target.value })}
        />
      </Field>
      <Field label="Special arrival needs">
        <textarea
          rows={2}
          className={inputClass}
          value={draft.specialNeeds}
          onChange={(e) => patch({ specialNeeds: e.target.value })}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setEmailTpl("movein_propose")}>
          Propose move-in date
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!draft.confirmedDate || !draft.unitAvailable}
          onClick={() => {
            const next = {
              ...draft,
              status: "confirmed" as const,
              confirmedAt: new Date().toISOString(),
            };
            setDraft(next);
            persist(next, "Move-in date confirmed", `${next.confirmedDate} ${next.confirmedTime}`);
            setEmailTpl("movein_confirm");
          }}
        >
          Confirm move-in
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={draft.status !== "confirmed" && draft.status !== "ready"}
          onClick={() => setEmailTpl("movein_reminder")}
        >
          Send reminder
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={draft.status !== "confirmed"}
          onClick={() => {
            const next = { ...draft, status: "ready" as const };
            setDraft(next);
            persist(next, "Ready for move-in · arrival checklist prepared");
          }}
        >
          Ready for move-in
        </Button>
      </div>

      <Button type="button" size="sm" variant="secondary" onClick={() => persist(draft, "Move-in plan saved")}>
        Save changes
      </Button>

      {emailTpl && (
        <TransitionEmailComposer
          to={app.family.email}
          templateId={emailTpl}
          onCancel={() => setEmailTpl(null)}
          onSend={({ to, subject, body, template }) => {
            const email: TransitionEmailRecord = {
              id: newId("em"),
              at: new Date().toISOString(),
              template,
              to,
              subject,
              body,
              stepId: "moveInDate",
              status: "sent",
            };
            const next = {
              ...draft,
              status:
                template === "movein_propose"
                  ? ("waiting_family" as const)
                  : template === "movein_confirm"
                    ? ("confirmed" as const)
                    : draft.status,
              lastSentAt: email.at,
              confirmedAt:
                template === "movein_confirm"
                  ? draft.confirmedAt || new Date().toISOString()
                  : draft.confirmedAt,
            };
            setDraft(next);
            onSave(
              (prev) => ({
                ...prev,
                moveIn: next,
                emails: [email, ...prev.emails],
              }),
              template === "movein_propose"
                ? "Move-in proposal emailed"
                : template === "movein_confirm"
                  ? "Move-in confirmation emailed"
                  : "Move-in reminder emailed",
              subject,
            );
            setEmailTpl(null);
          }}
        />
      )}
    </PanelShell>
  );
}
