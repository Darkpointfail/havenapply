/**
 * Client-safe auth event reporter. Never imports Node fs/crypto.
 * Persists via /api/auth/security-event (server-only).
 */

import type { AuthEventType } from "@/lib/auth-events-types";

export type { AuthEventType };

export async function recordAuthEvent(input: {
  type: AuthEventType;
  detail?: string | null;
}): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/security-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: input.type,
        detail: input.detail ?? null,
      }),
      credentials: "same-origin",
    });
  } catch {
    /* ignore telemetry failures */
  }
}
