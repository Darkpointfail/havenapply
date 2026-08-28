import { NextResponse } from "next/server";
import { isAbandonedApplication } from "@/lib/consent/retention";

export const runtime = "nodejs";

/**
 * Marks abandoned applications past retention for purge.
 * Body optional: { applications: [{ id, status, lastActivityAt }] }
 * In production this should scan the database; local demo accepts a list.
 */
export async function POST(request: Request) {
  const secret = process.env.CONSENT_CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    applications?: { id: string; status: string; lastActivityAt: string }[];
  } | null;

  const list = body?.applications || [];
  const expired = list.filter((a) => isAbandonedApplication(a.status, a.lastActivityAt));

  return NextResponse.json({
    ok: true,
    data: {
      expiredIds: expired.map((a) => a.id),
      policyDays: Number(process.env.RETENTION_ABANDONED_APPLICATION_DAYS || 90),
      notePlaceholder:
        "[LEGAL PLACEHOLDER] Counsel to confirm abandoned-application expiry and notice duties.",
    },
  });
}
