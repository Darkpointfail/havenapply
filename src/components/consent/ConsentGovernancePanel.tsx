"use client";

import { useState } from "react";
import { LEGAL_PLACEHOLDER_BANNER } from "@/lib/consent/policy-versions";
import { useConsentGovernance } from "@/lib/consent/store";
import { useFamilyData } from "@/lib/family-data";
import { usePrivacySecurityOptional } from "@/lib/privacy-security-store";
import { formatPrivacyTime } from "@/lib/privacy-security";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/** Governance panel: ledger, export, rectification, erasure, retention, legal holds. */
export function ConsentGovernancePanel() {
  const {
    ready,
    workspace,
    withdraw,
    requestExport,
    requestRectify,
    requestErase,
    advanceErase,
    addLegalHold,
    clearLegalHold,
  } = useConsentGovernance();
  const family = useFamilyData();
  const privacy = usePrivacySecurityOptional();
  const [rectField, setRectField] = useState("");
  const [rectValue, setRectValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  if (!ready || !workspace) {
    return <p className="text-sm text-ink-muted">Loading consent governance…</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
        {LEGAL_PLACEHOLDER_BANNER} Retention periods and legal notices are drafts for counsel.
        Policy bundle: <code>{workspace.policyBundleVersionId}</code>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Verifiable consent records</h3>
        {workspace.records.length === 0 ? (
          <p className="text-sm text-ink-muted">No consent grants yet.</p>
        ) : (
          workspace.records.map((r) => (
            <Card key={r.id} className="space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.active ? "success" : "danger"}>
                  {r.active ? "Active" : "Withdrawn/expired"}
                </Badge>
                <span className="font-medium">{r.consenterDisplayName}</span>
                <span className="text-ink-muted">({r.consenterRole})</span>
              </div>
              <p className="text-xs text-ink-muted">
                Subject: {r.subjectDisplayName} · Granted {formatPrivacyTime(r.grantedAt)}
                {r.expiresAt ? ` · Expires ${formatPrivacyTime(r.expiresAt)}` : ""}
              </p>
              <p className="text-xs">
                Policy bundle: {r.policyBundleVersionId}
              </p>
              <ul className="text-xs text-ink-muted">
                {r.purposes
                  .filter((p) => p.accepted)
                  .map((p) => (
                    <li key={p.purposeId}>
                      ✓ {p.purposeId} ({p.category}) · text {p.policyVersionId}
                    </li>
                  ))}
              </ul>
              {r.establishments.length ? (
                <div className="text-xs">
                  <p className="font-medium">Establishments transmitted</p>
                  <ul>
                    {r.establishments.map((e) => (
                      <li key={`${e.establishmentId}-${e.transmittedAt}`}>
                        {e.establishmentName} · {formatPrivacyTime(e.transmittedAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {r.authorityProof ? (
                <p className="text-xs text-ink-muted">
                  Authority: {r.authorityProof.kind} · ref {r.authorityProof.documentRef || "—"}
                </p>
              ) : null}
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">Modification history</summary>
                <ul className="mt-1 space-y-1 text-ink-muted">
                  {r.history.map((h) => (
                    <li key={h.id}>
                      {formatPrivacyTime(h.at)} · {h.type} · {h.actorDisplayName}: {h.detail}
                    </li>
                  ))}
                </ul>
              </details>
              {r.active ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => {
                    const reason = window.prompt("Withdrawal reason") || "withdrawn_by_user";
                    withdraw(r.id, reason);
                  }}
                >
                  Withdraw consent
                </Button>
              ) : null}
            </Card>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Minimization & retention</h3>
        <p className="text-xs text-ink-muted">
          Abandoned applications expire after {workspace.abandonedApplicationExpireDays} days
          (configurable).
        </p>
        <ul className="space-y-1 text-xs text-ink-muted">
          {workspace.retention.map((ret) => (
            <li key={ret.dataCategory}>
              <span className="font-medium text-ink">{ret.dataCategory}</span>: {ret.retainDays} days
              → {ret.actionOnExpiry}. {ret.rationalePlaceholder}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Access & rectification</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-md border border-ink/15 px-3 py-2 text-sm"
            placeholder="Field path (e.g. senior.firstName)"
            value={rectField}
            onChange={(e) => setRectField(e.target.value)}
          />
          <input
            className="flex-1 rounded-md border border-ink/15 px-3 py-2 text-sm"
            placeholder="Requested correction summary"
            value={rectValue}
            onChange={(e) => setRectValue(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!rectField.trim() || !rectValue.trim()) return;
              requestRectify(rectField.trim(), rectValue.trim());
              setRectField("");
              setRectValue("");
              setMsg("Rectification request recorded.");
            }}
          >
            Request rectification
          </Button>
        </div>
        {workspace.rectifications.slice(0, 5).map((r) => (
          <p key={r.id} className="text-xs text-ink-muted">
            {r.status} · {r.fieldPath} · {r.requestedValueSummary}
          </p>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Structured export</h3>
        <Button
          size="sm"
          onClick={() => {
            const json = requestExport(family.data, privacy?.workspace);
            if (!json) return;
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `haven-data-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMsg("Structured export downloaded.");
          }}
        >
          Download structured export
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Erasure / anonymization</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const res = requestErase("anonymize");
              setMsg(
                res?.status === "blocked_legal_hold"
                  ? res.blockedReasonPlaceholder || "Blocked by legal hold"
                  : `Erasure status: ${res?.status}`,
              );
            }}
          >
            Request anonymization
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            onClick={() => {
              if (!confirm("Request deletion? Legal holds may block this.")) return;
              const res = requestErase("delete");
              setMsg(
                res?.status === "blocked_legal_hold"
                  ? res.blockedReasonPlaceholder || "Blocked by legal hold"
                  : `Erasure status: ${res?.status}`,
              );
            }}
          >
            Request deletion
          </Button>
        </div>
        {workspace.erasureRequests.slice(0, 3).map((er) => (
          <Card key={er.id} className="space-y-1 p-3 text-xs">
            <p>
              {er.mode} · <Badge>{er.status}</Badge>
            </p>
            {er.blockedReasonPlaceholder ? <p>{er.blockedReasonPlaceholder}</p> : null}
            <ul>
              {er.propagation.map((p) => (
                <li key={p.target}>
                  {p.target}: {p.status} — {p.detail}
                </li>
              ))}
            </ul>
            {er.status === "propagating" ? (
              <Button size="sm" onClick={() => advanceErase(er.id)}>
                Advance propagation
              </Button>
            ) : null}
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Legal holds</h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            addLegalHold("Litigation hold example — counsel to confirm", [
              "documents",
              "applications",
              "consent_records",
            ])
          }
        >
          Place example legal hold
        </Button>
        {workspace.legalHolds.map((h) => (
          <div key={h.id} className="flex items-center justify-between text-xs">
            <span>
              {h.releasedAt ? "Released" : "Active"} · {h.dataCategories.join(", ")} ·{" "}
              {h.reasonPlaceholder}
            </span>
            {!h.releasedAt ? (
              <Button size="sm" variant="ghost" onClick={() => clearLegalHold(h.id)}>
                Release
              </Button>
            ) : null}
          </div>
        ))}
      </section>

      {msg ? <p className="text-sm text-brand">{msg}</p> : null}
    </div>
  );
}
