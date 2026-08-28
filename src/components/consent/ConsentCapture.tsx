"use client";

import { useMemo, useState } from "react";
import { LEGAL_PLACEHOLDER_BANNER } from "@/lib/consent/policy-versions";
import { purposesByCategory } from "@/lib/consent/purposes";
import type {
  AuthorityProofKind,
  ConsentPurposeId,
  ConsentSubjectRole,
} from "@/lib/consent/types";
import { cn } from "@/lib/utils";

export type ConsentCaptureValue = {
  consenterRole: ConsentSubjectRole;
  acceptedPurposeIds: ConsentPurposeId[];
  authorityKind: AuthorityProofKind;
  authorityDocRef: string;
  acceptedTermsVersion: boolean;
  acceptedPrivacyVersion: boolean;
};

const INITIAL: ConsentCaptureValue = {
  consenterRole: "caregiver",
  acceptedPurposeIds: [],
  authorityKind: "none",
  authorityDocRef: "",
  acceptedTermsVersion: false,
  acceptedPrivacyVersion: false,
};

/**
 * Consent capture UI — NO purpose or legal checkbox is pre-checked.
 * Essential and optional purposes are rendered in separate sections.
 */
export function ConsentCapture({
  mode,
  onChange,
  className,
}: {
  mode: "signup" | "apply" | "preferences";
  onChange?: (value: ConsentCaptureValue, valid: boolean) => void;
  className?: string;
}) {
  const [value, setValue] = useState<ConsentCaptureValue>(INITIAL);

  const essential = useMemo(() => {
    const all = purposesByCategory("essential");
    if (mode === "signup") return all.filter((p) => p.id === "account_operation");
    if (mode === "apply") {
      return all.filter((p) =>
        ["admissions_application", "document_sharing"].includes(p.id),
      );
    }
    return all;
  }, [mode]);

  const optional = useMemo(() => {
    const all = purposesByCategory("optional");
    if (mode === "signup") {
      return all.filter((p) =>
        ["product_updates", "marketing_communications", "analytics_improvement"].includes(
          p.id,
        ),
      );
    }
    if (mode === "apply") {
      return all.filter((p) => p.id === "community_messaging");
    }
    return all;
  }, [mode]);

  const emit = (next: ConsentCaptureValue) => {
    setValue(next);
    const requiredIds = essential.map((p) => p.id);
    const hasRequired = requiredIds.every((id) => next.acceptedPurposeIds.includes(id));
    const legalOk = next.acceptedTermsVersion && next.acceptedPrivacyVersion;
    const authorityOk =
      next.consenterRole !== "legal_representative" ||
      (next.authorityKind !== "none" && next.authorityDocRef.trim().length > 0);
    onChange?.(next, hasRequired && legalOk && authorityOk);
  };

  const togglePurpose = (id: ConsentPurposeId, checked: boolean) => {
    const set = new Set(value.acceptedPurposeIds);
    if (checked) set.add(id);
    else set.delete(id);
    emit({ ...value, acceptedPurposeIds: [...set] });
  };

  return (
    <div className={cn("space-y-6", className)}>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        {LEGAL_PLACEHOLDER_BANNER} Consent disclosures below are drafts for counsel review.
        No box is pre-checked.
      </p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">Your role when consenting</legend>
        {(
          [
            ["resident", "Resident"],
            ["caregiver", "Caregiver / family"],
            ["legal_representative", "Legal representative"],
            ["other", "Other"],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="consenter-role"
              checked={value.consenterRole === id}
              onChange={() =>
                emit({
                  ...value,
                  consenterRole: id,
                  authorityKind: id === "legal_representative" ? value.authorityKind : "none",
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>

      {value.consenterRole === "legal_representative" ? (
        <fieldset className="space-y-2 rounded-lg border border-ink/10 p-3">
          <legend className="text-sm font-semibold">Proof of authority</legend>
          <p className="text-xs text-ink-muted">
            {LEGAL_PLACEHOLDER_BANNER} Counsel must define acceptable proof types and verification.
          </p>
          <select
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
            value={value.authorityKind}
            onChange={(e) =>
              emit({
                ...value,
                authorityKind: e.target.value as AuthorityProofKind,
              })
            }
          >
            <option value="none">Select proof type…</option>
            <option value="power_of_attorney">Power of attorney</option>
            <option value="guardianship">Guardianship</option>
            <option value="healthcare_proxy">Healthcare proxy</option>
            <option value="other_documented">Other documented authority</option>
          </select>
          <input
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
            placeholder="Document reference id (opaque)"
            value={value.authorityDocRef}
            onChange={(e) => emit({ ...value, authorityDocRef: e.target.value })}
          />
        </fieldset>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Essential purposes</h3>
        <p className="text-xs text-ink-muted">
          Required to use this feature. You must opt in explicitly — nothing is pre-selected.
        </p>
        {essential.map((p) => (
          <label key={p.id} className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              checked={value.acceptedPurposeIds.includes(p.id)}
              onChange={(e) => togglePurpose(p.id, e.target.checked)}
            />
            <span>
              <span className="font-medium">{p.uiLabel}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">{p.summaryPlaceholder}</span>
            </span>
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Optional purposes</h3>
        <p className="text-xs text-ink-muted">
          Optional. Left unchecked by default. You may enable or leave disabled.
        </p>
        {optional.map((p) => (
          <label key={p.id} className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              checked={value.acceptedPurposeIds.includes(p.id)}
              onChange={(e) => togglePurpose(p.id, e.target.checked)}
            />
            <span>
              <span className="font-medium">{p.uiLabel}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">{p.summaryPlaceholder}</span>
            </span>
          </label>
        ))}
      </section>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">Policy versions</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={value.acceptedTermsVersion}
            onChange={(e) => emit({ ...value, acceptedTermsVersion: e.target.checked })}
          />
          <span>
            I accept the Terms of Use{" "}
            <a className="text-brand underline" href="/legal/terms" target="_blank" rel="noreferrer">
              (version terms-v0.1-draft)
            </a>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={value.acceptedPrivacyVersion}
            onChange={(e) => emit({ ...value, acceptedPrivacyVersion: e.target.checked })}
          />
          <span>
            I accept the Privacy Notice{" "}
            <a
              className="text-brand underline"
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
            >
              (version privacy-v0.1-draft)
            </a>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
