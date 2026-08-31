import { requireFamilyUser, jsonError } from "@/lib/family/authz";
import { readDocumentFile } from "@/lib/family/repository";

type Params = { params: Promise<{ id: string }> };

/**
 * Download or preview a document. Authorization checked per request.
 * No permanent public URL — only authenticated streaming.
 */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const file = await readDocumentFile(auth.user.id, id);
  if (!file) {
    // Do not reveal whether the id exists for another user.
    return jsonError("Document not found.", 404);
  }

  return new Response(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
