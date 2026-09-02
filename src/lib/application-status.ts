import type { ApplicationStatus, Role } from "@prisma/client";

/**
 * Server-authoritative admissions status machine (MVP).
 *
 * Staff (OWNER/EDITOR): review & decision transitions.
 * Family (OWNER/EDITOR): DRAFT→SUBMITTED, withdraw, NEEDS_DOCUMENTS→UNDER_REVIEW (response).
 * ADMIN/PLATFORM_ADMIN: staff+family edges + audited reopen of terminals.
 */

export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_DOCUMENTS",
  "WAITLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const satisfies readonly ApplicationStatus[];

export type TransitionActor = "FAMILY" | "STAFF" | "ADMIN";

const FAMILY_TRANSITIONS: ReadonlyArray<readonly [ApplicationStatus, ApplicationStatus]> = [
  ["DRAFT", "SUBMITTED"],
  ["SUBMITTED", "WITHDRAWN"],
  ["UNDER_REVIEW", "WITHDRAWN"],
  ["NEEDS_DOCUMENTS", "WITHDRAWN"],
  ["WAITLISTED", "WITHDRAWN"],
  // Family marks document request as answered → back to review.
  ["NEEDS_DOCUMENTS", "UNDER_REVIEW"],
];

const STAFF_TRANSITIONS: ReadonlyArray<readonly [ApplicationStatus, ApplicationStatus]> = [
  ["SUBMITTED", "UNDER_REVIEW"],
  ["SUBMITTED", "NEEDS_DOCUMENTS"],
  ["SUBMITTED", "WAITLISTED"],
  ["SUBMITTED", "ACCEPTED"],
  ["SUBMITTED", "REJECTED"],
  ["UNDER_REVIEW", "NEEDS_DOCUMENTS"],
  ["UNDER_REVIEW", "WAITLISTED"],
  ["UNDER_REVIEW", "ACCEPTED"],
  ["UNDER_REVIEW", "REJECTED"],
  ["NEEDS_DOCUMENTS", "UNDER_REVIEW"],
  ["WAITLISTED", "UNDER_REVIEW"],
  ["WAITLISTED", "ACCEPTED"],
  ["WAITLISTED", "REJECTED"],
];

/** Explicit reopen of terminal decisions — ADMIN or staff OWNER only, with mandatory reason. */
const REOPEN_TRANSITIONS: ReadonlyArray<readonly [ApplicationStatus, ApplicationStatus]> = [
  ["ACCEPTED", "UNDER_REVIEW"],
  ["REJECTED", "UNDER_REVIEW"],
];

function includesTransition(
  table: ReadonlyArray<readonly [ApplicationStatus, ApplicationStatus]>,
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return table.some(([a, b]) => a === from && b === to);
}

export function isReopenTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return includesTransition(REOPEN_TRANSITIONS, from, to);
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor,
  options?: { allowReopen?: boolean },
): boolean {
  if (from === to) return false;
  if (options?.allowReopen && isReopenTransition(from, to)) {
    return actor === "ADMIN" || actor === "STAFF";
  }
  if (actor === "ADMIN") {
    return (
      includesTransition(FAMILY_TRANSITIONS, from, to) ||
      includesTransition(STAFF_TRANSITIONS, from, to) ||
      (options?.allowReopen === true && includesTransition(REOPEN_TRANSITIONS, from, to))
    );
  }
  if (actor === "FAMILY") return includesTransition(FAMILY_TRANSITIONS, from, to);
  if (actor === "STAFF") {
    return (
      includesTransition(STAFF_TRANSITIONS, from, to) ||
      (options?.allowReopen === true && includesTransition(REOPEN_TRANSITIONS, from, to))
    );
  }
  return false;
}

export function assertTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor,
  options?: { allowReopen?: boolean },
): void {
  if (!canTransition(from, to, actor, options)) {
    throw new Error(`INVALID_TRANSITION:${from}->${to}:${actor}`);
  }
}

export function transitionActorForRole(role: Role): TransitionActor {
  if (role === "ADMIN") return "ADMIN";
  if (role === "STAFF") return "STAFF";
  return "FAMILY";
}

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return status === "ACCEPTED" || status === "REJECTED" || status === "WITHDRAWN";
}

export function isEditableDraft(status: ApplicationStatus): boolean {
  return status === "DRAFT";
}

/** Staff queues never include family drafts. */
export function staffVisibleStatuses(): ApplicationStatus[] {
  return APPLICATION_STATUSES.filter((s) => s !== "DRAFT" && s !== "WITHDRAWN");
}

export function allowedStaffTargets(from: ApplicationStatus): ApplicationStatus[] {
  return STAFF_TRANSITIONS.filter(([a]) => a === from).map(([, b]) => b);
}
