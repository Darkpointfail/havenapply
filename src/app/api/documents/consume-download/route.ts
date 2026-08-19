import { NextResponse } from "next/server";
import { consumeDownloadGrant } from "@/lib/security/download-grants";

/**
 * Consume (verify + single-use) a download grant before the client releases a blob URL.
 * Body: { token }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 4096) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
  }

  try {
    const result = await consumeDownloadGrant(token);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Grant rejected", code: result.error },
        { status: 403 },
      );
    }
    return NextResponse.json({
      ok: true,
      data: {
        documentId: result.claims.docId,
        filename: result.claims.filename,
        mimeType: result.claims.mimeType,
        elevated: result.claims.elevated,
        exp: result.claims.exp,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Download signing is not configured" },
      { status: 503 },
    );
  }
}
