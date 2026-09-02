import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { uploadDocument, removeDocument, replaceDocumentFile } from "@/lib/family/repository";
import { validateUploadMeta } from "@/lib/family/validation";
import type { DocCategoryId } from "@/lib/document-vault";

export async function GET() {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const { loadOrCreateFamilyBundle } = await import("@/lib/family/repository");
  const bundle = await loadOrCreateFamilyBundle(auth.user);
  return jsonOk({ documents: bundle.documents, progress: bundle.progress });
}

export async function POST(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") || "other") as DocCategoryId;
  const seniorId = form.get("seniorId") ? String(form.get("seniorId")) : null;
  const description = form.get("description") ? String(form.get("description")) : "";
  const expires = form.get("expires") ? String(form.get("expires")) : null;

  if (!(file instanceof File)) {
    return jsonError("File is missing.", 400);
  }

  const mimeType = file.type || "application/octet-stream";
  const sizeBytes = file.size;
  const originalFilename = file.name;
  const validation = validateUploadMeta({ mimeType, sizeBytes, originalFilename });
  if (validation) return jsonError(validation, 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await uploadDocument({
    ownerId: auth.user.id,
    seniorId,
    category,
    originalFilename,
    mimeType,
    sizeBytes,
    bytes,
    expires,
    description,
  });

  if ("error" in result) return jsonError(result.error, result.status);
  return jsonOk({ bundle: result.bundle, document: result.document }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const docId = url.searchParams.get("id");
  if (!docId) return jsonError("Identifier is missing.", 400);

  const result = await removeDocument(auth.user.id, docId);
  if (!result) return jsonError("Account not found.", 404);
  if ("error" in result) return jsonError("Document not found.", 404);
  return jsonOk({ bundle: result });
}

export async function PUT(request: Request) {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const form = await request.formData();
  const file = form.get("file");
  const docId = String(form.get("id") || "");
  if (!docId) return jsonError("Identifier is missing.", 400);
  if (!(file instanceof File)) return jsonError("File is missing.", 400);

  const mimeType = file.type || "application/octet-stream";
  const sizeBytes = file.size;
  const originalFilename = file.name;
  const validation = validateUploadMeta({ mimeType, sizeBytes, originalFilename });
  if (validation) return jsonError(validation, 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await replaceDocumentFile({
    ownerId: auth.user.id,
    docId,
    originalFilename,
    mimeType,
    sizeBytes,
    bytes,
  });
  if ("error" in result) return jsonError(result.error, result.status);
  return jsonOk({ bundle: result.bundle, document: result.document });
}
