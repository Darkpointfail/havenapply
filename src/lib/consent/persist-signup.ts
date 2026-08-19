/**
 * Persist a signup consent grant directly to localStorage (pre-provider).
 */

import { grantConsent, emptyGovernanceWorkspace } from "@/lib/consent/ledger";
import type { ConsentCaptureValue } from "@/components/consent/ConsentCapture";
import type { ConsentPurposeId } from "@/lib/consent/types";

const STORAGE_KEY = "haven-consent-gov-v2";

export function persistSignupConsentGrant(opts: {
  email: string;
  userId: string;
  displayName: string;
  capture: ConsentCaptureValue;
}): void {
  if (typeof localStorage === "undefined") return;
  const key = `${STORAGE_KEY}-${opts.email.toLowerCase()}`;
  let ws = emptyGovernanceWorkspace();
  try {
    const raw = localStorage.getItem(key);
    if (raw) ws = JSON.parse(raw);
  } catch {
    /* fresh */
  }
  const record = grantConsent({
    subjectDisplayName: opts.displayName,
    subjectRoleHint: opts.capture.consenterRole === "resident" ? "resident" : "other",
    consenterDisplayName: opts.displayName,
    consenterEmail: opts.email,
    consenterUserId: opts.userId,
    consenterRole: opts.capture.consenterRole,
    acceptedPurposeIds: opts.capture.acceptedPurposeIds as ConsentPurposeId[],
    contextSurface: "get_started_signup",
    authorityProof:
      opts.capture.consenterRole === "legal_representative"
        ? {
            kind: opts.capture.authorityKind,
            documentRef: opts.capture.authorityDocRef || null,
            notedAt: new Date().toISOString(),
            verificationNotePlaceholder:
              "[LEGAL PLACEHOLDER] Authority proof at signup — counsel to define verification.",
          }
        : null,
  });
  ws = {
    ...ws,
    records: [record, ...ws.records],
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(ws));
}
