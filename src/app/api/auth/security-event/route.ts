import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/auth-csrf";
import { recordAuthEvent, type AuthEventType } from "@/lib/auth-events-server";
import { clientKeyFromRequest, rateLimit } from "@/lib/auth-rate-limit";

const ALLOWED = new Set<AuthEventType>([
  "sign_in_success",
  "sign_in_failure",
  "sign_out",
  "password_change",
  "password_reset_requested",
  "password_reset_completed",
  "mfa_enroll",
  "mfa_challenge_success",
  "mfa_challenge_failure",
  "session_revoked",
  "rate_limited",
  "csrf_rejected",
  "anomaly_alert",
]);

export async function POST(request: Request) {
  const csrf = assertSameOriginMutation(request);
  if (!csrf.ok) return NextResponse.json({ ok: false }, { status: csrf.status });

  const limited = rateLimit({
    key: clientKeyFromRequest(request, "auth-event"),
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const body = (await request.json().catch(() => null)) as {
    type?: string;
    detail?: string | null;
  } | null;
  if (!body?.type || !ALLOWED.has(body.type as AuthEventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || null;

  await recordAuthEvent({
    type: body.type as AuthEventType,
    detail: body.detail,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}
