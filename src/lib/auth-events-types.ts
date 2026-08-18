/** Shared auth event type union (safe for client + server). */

export type AuthEventType =
  | "sign_in_success"
  | "sign_in_failure"
  | "sign_out"
  | "password_change"
  | "password_reset_requested"
  | "password_reset_completed"
  | "mfa_enroll"
  | "mfa_challenge_success"
  | "mfa_challenge_failure"
  | "session_revoked"
  | "rate_limited"
  | "csrf_rejected"
  | "anomaly_alert";

export type AuthEvent = {
  id: string;
  createdAt: string;
  type: AuthEventType;
  role?: string | null;
  userIdHash?: string | null;
  emailHash?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  detail?: string | null;
};
