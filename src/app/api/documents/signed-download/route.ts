import { NextResponse } from "next/server";
import { appendDocumentAccessLog } from "@/lib/documents/access-log";
import { mintDownloadGrant } from "@/lib/documents/grants";
import { applyDocumentNoIndexHeaders } from "@/lib/documents/noindex";
import { assertTenantOwnsDocument } from "@/lib/documents/store";
import { resolveTenantIdentity } from "@/lib/documents/tenant";

export const runtime = "nodejs";

/** Mint a short-lived download grant after AuthZ. Body: { documentId } */
export async function POST(request: Request) {
  const identity = resolveTenantIdentity(request);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { documentId?: unknown } | null;
  const documentId = typeof body?.documentId === "string" ? body.documentId : "";
  if (!documentId || documentId.length > 80) {
    return NextResponse.json({ ok: false, error: "Invalid document" }, { status: 400 });
  }

  try {
    const meta = await assertTenantOwnsDocument(documentId, identity.tenantId);
    const grant = mintDownloadGrant({
      documentId: meta.id,
      tenantId: identity.tenantId,
      category: meta.category,
    });

    const res = NextResponse.json({
      ok: true,
      data: {
        token: grant.token,
        expiresIn: grant.expiresIn,
        downloadPath: `/api/documents/download?token=${encodeURIComponent(grant.token)}`,
      },
    });
    applyDocumentNoIndexHeaders(res.headers);
    return res;
  } catch (e) {
    const code = e instanceof Error ? e.message : "error";
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "download_denied",
      documentId,
      tenantId: identity.tenantId,
      actorId: identity.userId,
      detail: code,
    });
    const status = code === "forbidden_tenant" ? 403 : 404;
    return NextResponse.json({ ok: false, error: "Not allowed", code }, { status });
  }
}
