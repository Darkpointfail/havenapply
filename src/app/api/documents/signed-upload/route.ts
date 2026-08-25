import { NextResponse } from "next/server";
import {
  DOWNLOAD_TTL_STANDARD_SECONDS,
  seniorDocumentStoragePath,
} from "@/lib/security/storage-path";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Create an opaque storage path + short-lived signed upload URL (Supabase backend).
 * Body: { familyId, seniorId, documentId, version?, mimeType?, byteSize? }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    familyId?: unknown;
    seniorId?: unknown;
    documentId?: unknown;
    version?: unknown;
    mimeType?: unknown;
    byteSize?: unknown;
  } | null;

  const familyId = typeof body?.familyId === "string" ? body.familyId : "";
  const seniorId = typeof body?.seniorId === "string" ? body.seniorId : "";
  const documentId = typeof body?.documentId === "string" ? body.documentId : "";
  const version = typeof body?.version === "number" && body.version > 0 ? body.version : 1;

  const uuidLike = /^[a-zA-Z0-9_-]{8,128}$/;
  if (!uuidLike.test(familyId) || !uuidLike.test(seniorId) || !uuidLike.test(documentId)) {
    return NextResponse.json({ ok: false, error: "Invalid identifiers" }, { status: 400 });
  }

  const storagePath = seniorDocumentStoragePath({
    familyId,
    seniorId,
    documentId,
    version,
  });
  const expiresIn = DOWNLOAD_TTL_STANDARD_SECONDS;

  if (!isSupabaseBackend()) {
    return NextResponse.json({
      ok: true,
      data: {
        bucket: "senior-documents",
        storagePath,
        uploadUrl: null,
        expiresIn,
        mode: "local",
      },
    });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("senior-documents")
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Unable to create upload URL" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      data: {
        bucket: "senior-documents",
        storagePath,
        uploadUrl: data.signedUrl,
        token: data.token,
        expiresIn,
        mode: "supabase",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Upload signing unavailable" },
      { status: 503 },
    );
  }
}
