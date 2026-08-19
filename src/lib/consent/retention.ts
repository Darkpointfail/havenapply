/**
 * Configurable retention by data category + abandoned application expiry.
 * Durations are defaults — override via env RETENTION_<CATEGORY>_DAYS.
 */

import type { DataCategory, RetentionPolicy } from "@/lib/consent/types";

function envDays(key: string, fallback: number): number {
  if (typeof process === "undefined" || !process.env) return fallback;
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function defaultRetentionPolicies(): RetentionPolicy[] {
  return [
    {
      dataCategory: "account_profile",
      retainDays: envDays("RETENTION_ACCOUNT_PROFILE_DAYS", 365 * 3),
      actionOnExpiry: "anonymize",
      rationalePlaceholder:
        "[LEGAL PLACEHOLDER] Retention for account records after closure — counsel to confirm.",
    },
    {
      dataCategory: "senior_dossier",
      retainDays: envDays("RETENTION_SENIOR_DOSSIER_DAYS", 365 * 2),
      actionOnExpiry: "delete",
      rationalePlaceholder:
        "[LEGAL PLACEHOLDER] Dossier retention after last application activity — counsel to confirm.",
    },
    {
      dataCategory: "documents",
      retainDays: envDays("RETENTION_DOCUMENTS_DAYS", 365 * 2),
      actionOnExpiry: "delete",
      rationalePlaceholder:
        "[LEGAL PLACEHOLDER] Document retention — counsel to confirm clinical record duties.",
    },
    {
      dataCategory: "applications",
      retainDays: envDays("RETENTION_APPLICATIONS_DAYS", 365 * 2),
      actionOnExpiry: "anonymize",
      rationalePlaceholder:
        "[LEGAL PLACEHOLDER] Application packet retention — counsel to confirm.",
    },
    {
      dataCategory: "messages",
      retainDays: envDays("RETENTION_MESSAGES_DAYS", 365),
      actionOnExpiry: "delete",
      rationalePlaceholder: "[LEGAL PLACEHOLDER] Messaging retention — counsel to confirm.",
    },
    {
      dataCategory: "consent_records",
      retainDays: envDays("RETENTION_CONSENT_RECORDS_DAYS", 365 * 7),
      actionOnExpiry: "archive_legal_hold",
      rationalePlaceholder:
        "[LEGAL PLACEHOLDER] Consent evidence retention for accountability — counsel to confirm.",
    },
    {
      dataCategory: "access_logs",
      retainDays: envDays("RETENTION_ACCESS_LOGS_DAYS", 365 * 2),
      actionOnExpiry: "anonymize",
      rationalePlaceholder: "[LEGAL PLACEHOLDER] Access log retention — counsel to confirm.",
    },
    {
      dataCategory: "analytics_events",
      retainDays: envDays("RETENTION_ANALYTICS_EVENTS_DAYS", 90),
      actionOnExpiry: "delete",
      rationalePlaceholder: "[LEGAL PLACEHOLDER] Analytics retention — counsel to confirm.",
    },
  ];
}

/** Days after which a draft/abandoned application expires (configurable). */
export function abandonedApplicationExpireDays(): number {
  return envDays("RETENTION_ABANDONED_APPLICATION_DAYS", 90);
}

export function retentionFor(category: DataCategory): RetentionPolicy {
  const found = defaultRetentionPolicies().find((r) => r.dataCategory === category);
  if (!found) throw new Error(`No retention policy for ${category}`);
  return found;
}

export function isPastRetention(
  lastActivityIso: string,
  category: DataCategory,
  now = new Date(),
): boolean {
  const policy = retentionFor(category);
  const last = new Date(lastActivityIso).getTime();
  const limit = last + policy.retainDays * 24 * 60 * 60 * 1000;
  return now.getTime() > limit;
}

export function isAbandonedApplication(
  status: string,
  lastActivityIso: string,
  now = new Date(),
): boolean {
  const abandonedStatuses = new Set(["draft", "withdrawn", "abandoned"]);
  if (!abandonedStatuses.has(status)) return false;
  const days = abandonedApplicationExpireDays();
  const last = new Date(lastActivityIso).getTime();
  return now.getTime() > last + days * 24 * 60 * 60 * 1000;
}
