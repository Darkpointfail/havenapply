import { NextResponse } from "next/server";
import { mintDownloadGrant } from "@/lib/security/download-grants";
import { isElevatedDocCategory, safeDownloadFilename } from "@/lib/security/storage-path";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Mint a short-lived download grant (and optional Supabase signed URL).
 * Body: { documentId, category?, mimeType?, originalName?, storagePath? }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    documentId?: unknown;
    category?: unknown;
    mimeType?: unknown;
    originalName?: unknown;
    storagePath?: unknown;
    bucket?: unknown;
  } | null;

  const documentId =
    typeof body?.documentId === "string" ? body.documentId.trim() : "";
  if (!documentId || documentId.length > 128) {
    return NextResponse.json({ ok: false, error: "Invalid document" }, { status: 400 });
  }

  const category = typeof body?.category === "string" ? body.category : "other";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : undefined;
  const originalName =
    typeof body?.originalName === "string" ? body.originalName : undefined;
  const elevated = isElevatedDocCategory(category);
  const filename = safeDownloadFilename({ documentId, mimeType, originalName });

  try {
    const grant = await mintDownloadGrant({
      documentId,
      elevated,
      filename,
      mimeType,
    });

    let supabaseSignedUrl: string | undefined;
    const storagePath =
      typeof body?.storagePath === "string" ? body.storagePath : undefined;
    const bucket =
      typeof body?.bucket === "string" ? body.bucket : "senior-documents";

    if (isSupabaseBackend() && storagePath) {
      // Path must be opaque UUID segments only — reject PII-looking path components.
      if (/@|\/\.\.|[^\w./-]/.test(storagePath)) {
        return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
      }
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, grant.expiresIn);
        if (!error && data?.signedUrl) {
          supabaseSignedUrl = data.signedUrl;
        }
      } catch {
        // Local/demo without Supabase session — grant-only mode.
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        token: grant.token,
        expiresIn: grant.expiresIn,
        filename,
        elevated,
        downloadUrl: supabaseSignedUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Download signing is not configured" },
      { status: 503 },
    );
  }
}
