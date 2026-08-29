import { NextResponse } from "next/server";
import { opaqueTenantIdFromUserId } from "@/lib/documents/store";
import { mintTenantProof } from "@/lib/documents/tenant";

export const runtime = "nodejs";

/**
 * Issue tenant proof headers material for the authenticated browser session.
 * Body: { userId } — in production this should come from the session cookie, not the body.
 * For the local demo we accept userId from the client after RequireAuth.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId || userId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid user" }, { status: 400 });
  }

  const tenantId = opaqueTenantIdFromUserId(userId);
  const proof = mintTenantProof(tenantId, userId);
  return NextResponse.json({
    ok: true,
    data: { tenantId, userId, proof },
  });
}
