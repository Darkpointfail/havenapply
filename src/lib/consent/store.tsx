"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  amendPurposes,
  emptyGovernanceWorkspace,
  expireConsentIfNeeded,
  grantConsent,
  recordEstablishmentTransmission,
  withdrawConsent,
} from "@/lib/consent/ledger";
import {
  advanceErasurePropagation,
  buildStructuredExport,
  placeLegalHold,
  releaseLegalHold,
  requestErasure,
  requestRectification,
  completeRectification,
} from "@/lib/consent/rights";
import type {
  AuthorityProof,
  ConsentGovernanceWorkspace,
  ConsentPurposeId,
  ConsentRecordV2,
  ConsentSubjectRole,
  DataCategory,
} from "@/lib/consent/types";

const STORAGE_KEY = "haven-consent-gov-v2";

type ConsentGovContextValue = {
  ready: boolean;
  workspace: ConsentGovernanceWorkspace | null;
  grant: (input: {
    subjectDisplayName: string;
    subjectRoleHint: ConsentSubjectRole;
    consenterRole: ConsentSubjectRole;
    acceptedPurposeIds: ConsentPurposeId[];
    contextSurface: string;
    expiresAt?: string | null;
    authorityProof?: AuthorityProof | null;
  }) => ConsentRecordV2 | null;
  withdraw: (recordId: string, reason: string) => void;
  amend: (recordId: string, acceptedPurposeIds: ConsentPurposeId[]) => void;
  transmit: (input: {
    recordId: string;
    establishmentId: string;
    establishmentName: string;
    applicationId?: string;
    purposeIds: ConsentPurposeId[];
  }) => void;
  requestExport: (familyData?: unknown, privacyLegacy?: unknown) => string | null;
  requestRectify: (fieldPath: string, requestedValueSummary: string, note?: string) => void;
  resolveRectify: (id: string, status: "completed" | "rejected") => void;
  requestErase: (mode: "delete" | "anonymize") => {
    status: string;
    blockedReasonPlaceholder: string | null;
  } | null;
  advanceErase: (requestId: string) => void;
  addLegalHold: (reasonPlaceholder: string, categories: DataCategory[]) => void;
  clearLegalHold: (holdId: string) => void;
};

const ConsentGovContext = createContext<ConsentGovContextValue | null>(null);

function keyFor(email: string) {
  return `${STORAGE_KEY}-${email.toLowerCase()}`;
}

function read(email: string): ConsentGovernanceWorkspace | null {
  try {
    const raw = localStorage.getItem(keyFor(email));
    if (!raw) return null;
    return JSON.parse(raw) as ConsentGovernanceWorkspace;
  } catch {
    return null;
  }
}

function write(email: string, ws: ConsentGovernanceWorkspace) {
  localStorage.setItem(keyFor(email), JSON.stringify(ws));
}

export function ConsentGovernanceProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [workspace, setWorkspace] = useState<ConsentGovernanceWorkspace | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setWorkspace(null);
      setReady(true);
      return;
    }
    const existing = read(user.email);
    if (existing) {
      const records = existing.records.map((r) => expireConsentIfNeeded(r));
      const next = { ...existing, records, updatedAt: new Date().toISOString() };
      write(user.email, next);
      setWorkspace(next);
    } else {
      const empty = emptyGovernanceWorkspace();
      write(user.email, empty);
      setWorkspace(empty);
    }
    setReady(true);
  }, [authReady, user]);

  const persist = useCallback(
    (updater: (prev: ConsentGovernanceWorkspace) => ConsentGovernanceWorkspace) => {
      setWorkspace((prev) => {
        if (!prev || !user) return prev;
        const next = updater(prev);
        write(user.email, next);
        return next;
      });
    },
    [user],
  );

  const grant = useCallback(
    (input: {
      subjectDisplayName: string;
      subjectRoleHint: ConsentSubjectRole;
      consenterRole: ConsentSubjectRole;
      acceptedPurposeIds: ConsentPurposeId[];
      contextSurface: string;
      expiresAt?: string | null;
      authorityProof?: AuthorityProof | null;
    }) => {
      if (!user) return null;
      const record = grantConsent({
        ...input,
        consenterDisplayName: user.name || user.email,
        consenterEmail: user.email,
        consenterUserId: user.id,
        userAgentHint:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : undefined,
      });
      persist((ws) => ({
        ...ws,
        records: [record, ...ws.records],
        updatedAt: new Date().toISOString(),
      }));
      return record;
    },
    [persist, user],
  );

  const withdraw = useCallback(
    (recordId: string, reason: string) => {
      if (!user) return;
      persist((ws) => ({
        ...ws,
        records: ws.records.map((r) =>
          r.id === recordId
            ? withdrawConsent(r, { userId: user.id, displayName: user.name || user.email }, reason)
            : r,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist, user],
  );

  const amend = useCallback(
    (recordId: string, acceptedPurposeIds: ConsentPurposeId[]) => {
      if (!user) return;
      persist((ws) => ({
        ...ws,
        records: ws.records.map((r) =>
          r.id === recordId
            ? amendPurposes(
                r,
                { userId: user.id, displayName: user.name || user.email },
                acceptedPurposeIds,
              )
            : r,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist, user],
  );

  const transmit = useCallback(
    (input: {
      recordId: string;
      establishmentId: string;
      establishmentName: string;
      applicationId?: string;
      purposeIds: ConsentPurposeId[];
    }) => {
      if (!user) return;
      persist((ws) => ({
        ...ws,
        records: ws.records.map((r) =>
          r.id === input.recordId
            ? recordEstablishmentTransmission(
                r,
                {
                  establishmentId: input.establishmentId,
                  establishmentName: input.establishmentName,
                  applicationId: input.applicationId,
                  purposeIds: input.purposeIds,
                },
                { userId: user.id, displayName: user.name || user.email },
              )
            : r,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist, user],
  );

  const requestExport = useCallback(
    (familyData?: unknown, privacyLegacy?: unknown) => {
      if (!user || !workspace) return null;
      const { json, manifest } = buildStructuredExport({
        account: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        consentRecords: workspace.records,
        familyData,
        privacyLegacy,
      });
      persist((ws) => ({
        ...ws,
        exports: [manifest, ...ws.exports],
        updatedAt: new Date().toISOString(),
      }));
      return json;
    },
    [persist, user, workspace],
  );

  const requestRectify = useCallback(
    (fieldPath: string, requestedValueSummary: string, note?: string) => {
      persist((ws) => requestRectification(ws, { fieldPath, requestedValueSummary, note }));
    },
    [persist],
  );

  const resolveRectify = useCallback(
    (rectId: string, status: "completed" | "rejected") => {
      persist((ws) => completeRectification(ws, rectId, status));
    },
    [persist],
  );

  const requestErase = useCallback(
    (mode: "delete" | "anonymize") => {
      let result: { status: string; blockedReasonPlaceholder: string | null } | null = null;
      persist((ws) => {
        const { workspace: next, request } = requestErasure(ws, mode);
        result = {
          status: request.status,
          blockedReasonPlaceholder: request.blockedReasonPlaceholder,
        };
        return next;
      });
      return result;
    },
    [persist],
  );

  const advanceErase = useCallback(
    (requestId: string) => {
      persist((ws) => advanceErasurePropagation(ws, requestId));
    },
    [persist],
  );

  const addLegalHold = useCallback(
    (reasonPlaceholder: string, categories: DataCategory[]) => {
      if (!user) return;
      persist((ws) =>
        placeLegalHold(ws, {
          reasonPlaceholder,
          placedBy: user.id,
          dataCategories: categories,
        }),
      );
    },
    [persist, user],
  );

  const clearLegalHold = useCallback(
    (holdId: string) => {
      persist((ws) => releaseLegalHold(ws, holdId));
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      ready,
      workspace,
      grant,
      withdraw,
      amend,
      transmit,
      requestExport,
      requestRectify,
      resolveRectify,
      requestErase,
      advanceErase,
      addLegalHold,
      clearLegalHold,
    }),
    [
      ready,
      workspace,
      grant,
      withdraw,
      amend,
      transmit,
      requestExport,
      requestRectify,
      resolveRectify,
      requestErase,
      advanceErase,
      addLegalHold,
      clearLegalHold,
    ],
  );

  return (
    <ConsentGovContext.Provider value={value}>{children}</ConsentGovContext.Provider>
  );
}

export function useConsentGovernance() {
  const ctx = useContext(ConsentGovContext);
  if (!ctx) throw new Error("useConsentGovernance requires ConsentGovernanceProvider");
  return ctx;
}

export function useConsentGovernanceOptional() {
  return useContext(ConsentGovContext);
}
