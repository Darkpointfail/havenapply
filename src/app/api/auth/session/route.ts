import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentPrincipal, requireCsrf } from "@/lib/security/guards";
import { recordAuditEvent, revokeSession } from "@/lib/security/identity-store";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/security/session";

/**
 * Session minting from a client-supplied user object has been removed.
 * A session is only ever created by `/api/auth/sign-in`, after the server has
 * verified credentials. This endpoint now reads or destroys the session.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Sessions are issued by /api/auth/sign-in after credential verification.",
    },
    { status: 410 },
  );
}

/** Who am I, according to the server. */
export async function GET() {
  const principal = await currentPrincipal();
  if (!principal) return NextResponse.json({ ok: true, user: null });
  return NextResponse.json({
    ok: true,
    user: {
      id: principal.userId,
      email: principal.email,
      name: principal.displayName,
      role: principal.role,
    },
  });
}

/** Sign out: revoke the server record, then clear the cookie. */
export async function DELETE(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const principal = await currentPrincipal();
  if (principal?.sessionId) {
    await revokeSession(principal.sessionId);
    await recordAuditEvent({
      event: "auth.sign_out",
      outcome: "success",
      actorId: principal.userId,
    });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0, true), maxAge: 0 });
  return NextResponse.json({ ok: true });
}
