import { NextResponse } from "next/server";
import { appendDocumentAccessLog } from "@/lib/documents/access-log";
import { applyDocumentNoIndexHeaders } from "@/lib/documents/noindex";
import { purgeExpiredDocuments } from "@/lib/documents/store";

export const runtime = "nodejs";

/**
 * Retention worker endpoint — physical purge after soft-delete window and
 * backup-expiry markers. Protect with CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.DOCUMENT_PURGE_CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredDocuments();
  for (const id of result.purged) {
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "purge",
      documentId: id,
      tenantId: "system",
      detail: "soft_delete_retention_elapsed",
    });
  }
  for (const id of result.backupExpired) {
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "purge",
      documentId: id,
      tenantId: "system",
      detail: "backup_expire_marker",
    });
  }

  const res = NextResponse.json({ ok: true, data: result });
  applyDocumentNoIndexHeaders(res.headers);
  return res;
}
