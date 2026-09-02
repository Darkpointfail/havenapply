import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DocumentError, issueDocumentAccessUrl } from "@/lib/documents";
import { AuthzError } from "@/lib/authz";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function issue(request: Request, { params }: Params, disposition: "inline" | "attachment") {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const result = await issueDocumentAccessUrl({
      userId: session.user.id,
      role: session.user.role,
      documentId: id,
      disposition,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    // Redirect so the browser receives the real object from private storage.
    return NextResponse.redirect(result.url, 302);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof DocumentError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export async function GET(request: Request, ctx: Params) {
  return issue(request, ctx, "attachment");
}
