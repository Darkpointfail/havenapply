import { NextResponse } from "next/server";
import { appendDocumentAccessLog } from "@/lib/documents/access-log";
import { applyDocumentNoIndexHeaders } from "@/lib/documents/noindex";
import {
  getDocumentMeta,
  hardDeleteDocument,
  softDeleteDocument,
} from "@/lib/documents/store";
import { resolveTenantIdentity } from "@/lib/documents/tenant";

export const runtime = "nodejs";

/** Soft-delete (default) or hard purge when { mode: "hard" } after soft retention. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const identity = resolveTenantIdentity(request);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { mode?: unknown } | null;
  const mode = body?.mode === "hard" ? "hard" : "soft";

  try {
    if (mode === "soft") {
      const meta = await softDeleteDocument(id, identity.tenantId);
      await appendDocumentAccessLog({
        at: new Date().toISOString(),
        action: "soft_delete",
        documentId: id,
        tenantId: identity.tenantId,
        actorId: identity.userId,
        detail: meta.purgeAfter || undefined,
      });
      const res = NextResponse.json({
        ok: true,
        data: { id, status: "deleted", purgeAfter: meta.purgeAfter },
      });
      applyDocumentNoIndexHeaders(res.headers);
      return res;
    }

    const existing = await getDocumentMeta(id);
    if (!existing || existing.tenantId !== identity.tenantId) {
      return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
    }
    if (existing.status !== "deleted") {
      return NextResponse.json(
        { ok: false, error: "Soft-delete required before hard delete" },
        { status: 409 },
      );
    }

    const removed = await hardDeleteDocument(id);
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "hard_delete",
      documentId: id,
      tenantId: identity.tenantId,
      actorId: identity.userId,
    });
    const res = NextResponse.json({ ok: true, data: { id, removed } });
    applyDocumentNoIndexHeaders(res.headers);
    return res;
  } catch (e) {
    const code = e instanceof Error ? e.message : "error";
    const status = code === "forbidden_tenant" ? 403 : 404;
    return NextResponse.json({ ok: false, error: "Not allowed", code }, { status });
  }
}
