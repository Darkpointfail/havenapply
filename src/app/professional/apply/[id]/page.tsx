"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, use, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  MapPin,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getResidence } from "@/data/residences";
import {
  CHECKLIST_LABEL,
  DOC_CATEGORY_LABEL,
  patientDossierReadyForApply,
  patientName,
  type ChecklistKey,
} from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { getCommunityDetail } from "@/lib/residence-detail";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

function ApplyReviewInner({ communityId }: { communityId: string }) {
  const t = useT();
  const { patients, submitApplication } = useProfessional();
  const params = useSearchParams();
  const patientFromQuery = params.get("patient") || "";

  const [selectedPatientId, setSelectedPatientId] = useState(patientFromQuery);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const residence = getResidence(communityId);
  const detail = getCommunityDetail(communityId);
  const patient = patients.find((p) => p.id === selectedPatientId);

  const readiness = useMemo(
    () => (patient ? patientDossierReadyForApply(patient) : null),
    [patient],
  );

  const already = patient
    ? patient.applications.some(
        (a) => a.communityId === communityId && a.status !== "declined",
      )
    : false;

  if (!residence || !detail) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">Community not found</h1>
        <Button href="/professional/communities" className="mt-6">
          {t("Browse communities")}
        </Button>
      </div>
    );
  }

  if (!selectedPatientId || !patient) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <Link
          href={`/find-senior-living/${communityId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to community
        </Link>
        <Card className="mt-6 p-6">
          <h1 className="text-xl font-semibold tracking-tight">Choose a patient</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Select whose dossier will be reviewed and transmitted to {residence.name}.
          </p>
          {patients.length === 0 ? (
            <div className="mt-6">
              <p className="text-sm text-ink-secondary">No patients yet.</p>
              <Button href="/professional/patients" className="mt-4">
                {t("Add a patient")}
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatientId(p.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-bg px-4 py-3 text-left text-sm transition hover:border-brand"
                >
                  <span className="font-medium text-ink">{patientName(p)}</span>
                  <span className="text-xs text-ink-faint">{p.status.replaceAll("_", " ")}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (readiness && !readiness.ok) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <Link
          href={`/find-senior-living/${communityId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to community
        </Link>
        <Card className="mt-6 p-6">
          <h1 className="text-xl font-semibold tracking-tight">Finish the dossier first</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Before applying to {residence.name}, complete {patientName(patient)}’s profile and
            required documents. Everything checked here will be shared with admissions.
          </p>
          {readiness.reasons.length > 0 && (
            <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-ink-secondary">
              {readiness.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {(readiness.missingProfile.length > 0 ||
            readiness.missingCare.length > 0 ||
            readiness.missingChecklist.length > 0 ||
            readiness.missingDocs.length > 0) && (
            <div className="mt-4 space-y-3 rounded-xl bg-bg-soft/80 p-3 text-sm">
              {readiness.missingProfile.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t("Profile")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-ink-secondary">
                    {readiness.missingProfile.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {readiness.missingCare.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t("Care needs")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-ink-secondary">
                    {readiness.missingCare.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {readiness.missingChecklist.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Checklist
                  </p>
                  <ul className="mt-1 list-inside list-disc text-ink-secondary">
                    {readiness.missingChecklist.map((k) => (
                      <li key={k}>{CHECKLIST_LABEL[k]}</li>
                    ))}
                  </ul>
                </div>
              )}
              {readiness.missingDocs.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t("Documents")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-ink-secondary">
                    {readiness.missingDocs.map((d) => (
                      <li key={d.category}>{d.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={`/professional/patients/${patient.id}`}>Complete dossier</Button>
            <Button href={`/find-senior-living/${communityId}`} variant="secondary">
              {t("Back")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const submit = () => {
    if (!consent || sending || already) return;
    setSending(true);
    setError(null);
    const result = submitApplication(patient.id, residence.id, residence.name);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDoneId(result.applicationId);
  };

  if (doneId || already) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <CheckCircle2 size={40} className="mx-auto text-success" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Application submitted</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {residence.name} has been notified with {patientName(patient)}’s dossier. Track progress
          from Applications.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button href="/professional/applications">Track applications</Button>
          <Button href="/professional/communities" variant="secondary">
            {t("Browse more")}
          </Button>
        </div>
      </div>
    );
  }

  const checklistKeys = Object.keys(CHECKLIST_LABEL) as ChecklistKey[];

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[920px] space-y-8 px-5 py-8 md:px-8 md:py-10">
        <div>
          <Link
            href={`/find-senior-living/${communityId}`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={14} /> Back to listing
          </Link>
          <p className="mt-4 text-sm font-medium text-ink-muted">Apply as care professional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-[2.1rem]">
            {t("Review before you send")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Confirm the patient profile and documents that will be transmitted to{" "}
            {residence.name}, then authorize the share.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <Card className="overflow-hidden p-0">
              <div className="relative h-48 md:h-56">
                <Image
                  src={residence.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 560px"
                  priority
                />
              </div>
              <div className="space-y-4 p-5 md:p-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{residence.name}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} />
                      {residence.city}, {residence.state}
                    </span>
                    <span>·</span>
                    <span>{residence.distanceMiles} mi</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {residence.careLevels.map((c) => (
                    <Badge key={c} tone="neutral">
                      {c}
                    </Badge>
                  ))}
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-bg-soft/80 px-3.5 py-3">
                    <dt className="text-xs text-ink-faint">From</dt>
                    <dd className="mt-0.5 text-sm font-semibold">
                      {residence.priceAvailable && residence.priceFrom != null
                        ? `${formatCurrency(residence.priceFrom)} / mo`
                        : "Price on request"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-bg-soft/80 px-3.5 py-3">
                    <dt className="text-xs text-ink-faint">Availability</dt>
                    <dd className="mt-0.5 text-sm font-semibold">
                      {detail.availabilityDetail.label}
                    </dd>
                  </div>
                </dl>
                <Button href={`/find-senior-living/${communityId}`} variant="secondary" size="sm">
                  {t("Full community profile")}
                </Button>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <UserRound size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Patient profile to transmit</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">{patientName(patient)}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-faint">Date of birth</dt>
                  <dd className="mt-0.5 text-sm">{patient.dateOfBirth}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Location</dt>
                  <dd className="mt-0.5 text-sm">{patient.currentLocation}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Diagnosis</dt>
                  <dd className="mt-0.5 text-sm">{patient.care.diagnosis}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Required care</dt>
                  <dd className="mt-0.5 text-sm">{patient.care.requiredCareLevel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Mobility</dt>
                  <dd className="mt-0.5 text-sm">{patient.care.mobility}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Insurance</dt>
                  <dd className="mt-0.5 text-sm">{patient.care.insurance}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Family contact</dt>
                  <dd className="mt-0.5 text-sm">
                    {patient.familyContact || patient.emergencyContact}
                    {patient.familyRelation ? ` (${patient.familyRelation})` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Preferred region</dt>
                  <dd className="mt-0.5 text-sm">{patient.care.preferredRegion}</dd>
                </div>
              </dl>
              <Button
                href={`/professional/patients/${patient.id}`}
                variant="secondary"
                size="sm"
                className="mt-4"
              >
                {t("Edit patient dossier")}
              </Button>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bg-soft text-ink">
                  <FileText size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Documents to transmit</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {patient.documents.length} file
                    {patient.documents.length === 1 ? "" : "s"} attached to this dossier
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {patient.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-ink">{doc.name}</span>
                    <Badge tone="neutral">{DOC_CATEGORY_LABEL[doc.category]}</Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  {t("Checklist complete")}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {checklistKeys.map((k) => (
                    <li key={k}>
                      <Badge tone="success">{CHECKLIST_LABEL[k]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">Send application</h3>
              <p className="mt-1.5 text-sm text-ink-muted">
                Submits {patientName(patient)}’s complete dossier to {residence.name} and notifies
                their admissions team.
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line text-brand"
                />
                <span>
                  {t("I confirm this dossier is accurate and authorize Haven to share the patient")}
                  profile and documents with {residence.name}.
                </span>
              </label>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <Button
                type="button"
                className="mt-4 w-full"
                disabled={!consent || sending}
                onClick={submit}
              >
                {sending ? "Sending…" : "Send application"}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-faint">
                Applying as{" "}
                <button
                  type="button"
                  className="font-medium text-brand hover:underline"
                  onClick={() => {
                    setSelectedPatientId("");
                    setConsent(false);
                    setError(null);
                  }}
                >
                  {patientName(patient)}
                </button>
                {" · "}
                <Link
                  href={`/professional/communities?patient=${patient.id}`}
                  className="hover:underline"
                >
                  {t("Other communities")}
                </Link>
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfessionalApplyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const t = useT();  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <ApplyReviewInner communityId={id} />
    </Suspense>
  );
}
