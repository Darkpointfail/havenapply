import type { ApplicationStatus, Role } from "@prisma/client";

/**
 * Server-authoritative application status machine.
 *
 * Family (OWNER/EDITOR): DRAFT → SUBMITTED; any open status → WITHDRAWN.
 * Staff (MANAGE_APPLICATIONS): review / decision transitions after SUBMITTED.
 * ADMIN: union of both.
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
];

const STAFF_TRANSITIONS: ReadonlyArray<readonly [ApplicationStatus, ApplicationStatus]> = [
  ["SUBMITTED", "UNDER_REVIEW"],
  ["UNDER_REVIEW", "NEEDS_DOCUMENTS"],
  ["UNDER_REVIEW", "WAITLISTED"],
  ["UNDER_REVIEW", "ACCEPTED"],
  ["UNDER_REVIEW", "REJECTED"],
  ["NEEDS_DOCUMENTS", "UNDER_REVIEW"],
  ["NEEDS_DOCUMENTS", "WAITLISTED"],
  ["NEEDS_DOCUMENTS", "ACCEPTED"],
  ["NEEDS_DOCUMENTS", "REJECTED"],
  ["WAITLISTED", "UNDER_REVIEW"],
  ["WAITLISTED", "ACCEPTED"],
  ["WAITLISTED", "REJECTED"],
];

function includesTransition(
  table: ReadonlyArray<readonly [ApplicationStatus, ApplicationStatus]>,
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return table.some(([a, b]) => a === from && b === to);
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor,
): boolean {
  if (from === to) return false;
  if (actor === "ADMIN") {
    return (
      includesTransition(FAMILY_TRANSITIONS, from, to) ||
      includesTransition(STAFF_TRANSITIONS, from, to)
    );
  }
  if (actor === "FAMILY") return includesTransition(FAMILY_TRANSITIONS, from, to);
  if (actor === "STAFF") return includesTransition(STAFF_TRANSITIONS, from, to);
  return false;
}

export function assertTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor,
): void {
  if (!canTransition(from, to, actor)) {
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
  return APPLICATION_STATUSES.filter((s) => s !== "DRAFT");
}
