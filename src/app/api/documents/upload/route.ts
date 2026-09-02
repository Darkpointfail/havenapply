import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertCsrf, CSRF_FIELD, CSRF_HEADER } from "@/lib/csrf";
import { DocumentError, uploadApplicationDocument } from "@/lib/documents";
import { AuthzError } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const csrf =
      String(form.get(CSRF_FIELD) || "") || request.headers.get(CSRF_HEADER) || "";
    await assertCsrf(csrf);

    const applicationId = String(form.get("applicationId") || "");
    const file = form.get("file");
    if (!applicationId || !(file instanceof File)) {
      return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const doc = await uploadApplicationDocument({
      userId: session.user.id,
      role: session.user.role,
      applicationId,
      fileName: file.name || "document",
      bytes,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      awaitScan: true,
    });

    return NextResponse.json({
      id: doc.id,
      status: doc.status,
      originalFileName: doc.originalFileName,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      scanAdapter: doc.scanAdapter,
      scanResult: doc.scanResult,
      isRealScan: doc.scanAdapter === "clamav",
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof DocumentError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof Error && error.message === "CSRF_INVALID") {
      return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
    }
    console.error("document upload failed", error);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
