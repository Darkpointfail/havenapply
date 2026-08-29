import { NextResponse } from "next/server";
import { appendDocumentAccessLog } from "@/lib/documents/access-log";
import { applyDocumentNoIndexHeaders } from "@/lib/documents/noindex";
import { storeValidatedDocument } from "@/lib/documents/store";
import { resolveTenantIdentity } from "@/lib/documents/tenant";
import { validateUploadBuffer } from "@/lib/documents/validate";

export const runtime = "nodejs";

/**
 * Secure document upload.
 * multipart/form-data: file, category?, title?, demoFixture? ("1")
 * Headers: X-Haven-Tenant-Id, X-Haven-User-Id, X-Haven-Tenant-Proof
 */
export async function POST(request: Request) {
  const identity = resolveTenantIdentity(request);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const category = String(form.get("category") || "other").slice(0, 64);
  const title = String(form.get("title") || "Document").slice(0, 200);
  const demoFixture = String(form.get("demoFixture") || "") === "1";

  const buf = new Uint8Array(await file.arrayBuffer());
  const validated = await validateUploadBuffer({
    bytes: buf,
    claimedMime: file.type,
    originalName: file.name,
    demoFixture,
  });

  if (!validated.ok) {
    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "quarantine",
      documentId: "none",
      tenantId: identity.tenantId,
      actorId: identity.userId,
      detail: validated.code,
    });
    return NextResponse.json(
      { ok: false, error: validated.message, code: validated.code },
      { status: 400 },
    );
  }

  try {
    const meta = await storeValidatedDocument({
      tenantId: identity.tenantId,
      storageFileName: validated.data.storageFileName,
      bytes: validated.data.bytes,
      mime: validated.data.mime,
      checksumSha256: validated.data.checksumSha256,
      category,
      displayTitle: title,
      scanEngine: validated.data.scan.engine,
    });

    await appendDocumentAccessLog({
      at: new Date().toISOString(),
      action: "upload",
      documentId: meta.id,
      tenantId: identity.tenantId,
      actorId: identity.userId,
      detail: meta.mime,
    });

    const res = NextResponse.json({
      ok: true,
      data: {
        id: meta.id,
        storageFileName: meta.storageFileName,
        mime: meta.mime,
        byteSize: meta.byteSize,
        checksumSha256: meta.checksumSha256,
        status: meta.status,
        // Never echo the original filename into storage paths.
        title: meta.displayTitle,
      },
    });
    applyDocumentNoIndexHeaders(res.headers);
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Storage failure" }, { status: 500 });
  }
}
