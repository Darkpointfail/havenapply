import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertCsrf, CSRF_FIELD, CSRF_HEADER } from "@/lib/csrf";
import { softDeleteDocument } from "@/lib/documents";
import { AuthzError } from "@/lib/authz";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const contentType = request.headers.get("content-type") || "";
    let csrf = request.headers.get(CSRF_HEADER) || "";
    if (contentType.includes("form")) {
      const form = await request.formData();
      csrf = String(form.get(CSRF_FIELD) || csrf);
    }
    await assertCsrf(csrf);

    const doc = await softDeleteDocument({
      userId: session.user.id,
      role: session.user.role,
      documentId: id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({ id: doc.id, status: doc.status, purgeAfter: doc.purgeAfter });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "CSRF_INVALID") {
      return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
