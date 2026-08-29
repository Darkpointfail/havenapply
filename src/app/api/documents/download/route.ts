import { NextResponse } from "next/server";
import { appendDocumentAccessLog } from "@/lib/documents/access-log";
import { consumeDownloadGrant } from "@/lib/documents/grants";
import { applyDocumentNoIndexHeaders } from "@/lib/documents/noindex";
import {
  contentDispositionFor,
  getDocumentMeta,
  readDocumentBytes,
} from "@/lib/documents/store";
import { resolveTenantIdentity } from "@/lib/documents/tenant";

export const runtime = "nodejs";

/**
 * Stream a document after verifying the signed grant AND tenant identity.
 * AuthZ is re-checked at download time (not only at mint time).
 */
export async function GET(request: Request) {
  const identity = resolveTenantIdentity(request);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token || token.length > 4096) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const consumed = consumeDownloadGrant(token, identity.tenantId);
  if (!consumed.ok) {
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "download_denied",
      documentId: "unknown",
      tenantId: identity.tenantId,
      actorId: identity.userId,
      detail: consumed.error,
    });
    return NextResponse.json(
      { ok: false, error: "Grant rejected", code: consumed.error },
      { status: 403 },
    );
  }

  const meta = await getDocumentMeta(consumed.grant.docId);
  if (!meta || meta.status !== "ready" || meta.tenantId !== identity.tenantId) {
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "download_denied",
      documentId: consumed.grant.docId,
      tenantId: identity.tenantId,
      actorId: identity.userId,
      detail: "authz_recheck_failed",
    });
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  try {
    const bytes = await readDocumentBytes(meta);
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "download",
      documentId: meta.id,
      tenantId: identity.tenantId,
      actorId: identity.userId,
    });

    const res = new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": meta.mime,
        "Content-Disposition": contentDispositionFor(meta),
        "Content-Length": String(bytes.byteLength),
      },
    });
    applyDocumentNoIndexHeaders(res.headers);
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Read failure" }, { status: 500 });
  }
}
