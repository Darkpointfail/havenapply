/**
 * Opaque storage paths and download filenames — no PII in object keys or URLs.
 */

const SAFE_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/zip": "zip",
  "application/json": "json",
  "text/csv": "csv",
};

/** Strip path segments and keep a conservative extension from mime or original name. */
export function safeDownloadFilename(opts: {
  documentId: string;
  mimeType?: string | null;
  originalName?: string | null;
}): string {
  const id = opts.documentId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "document";
  let ext = "";
  if (opts.mimeType && SAFE_EXT[opts.mimeType]) {
    ext = SAFE_EXT[opts.mimeType]!;
  } else if (opts.originalName) {
    const m = /\.([a-zA-Z0-9]{1,8})$/.exec(opts.originalName);
    if (m && !/[^\w]/.test(m[1]!)) ext = m[1]!.toLowerCase();
  }
  return ext ? `haven-${id}.${ext}` : `haven-${id}`;
}

/** Senior document object key (UUID path segments only). */
export function seniorDocumentStoragePath(opts: {
  familyId: string;
  seniorId: string;
  documentId: string;
  version: number;
}): string {
  return `${opts.familyId}/${opts.seniorId}/${opts.documentId}/v${opts.version}`;
}

/** Message attachment key — never include original filename. */
export function messageAttachmentStoragePath(opts: {
  conversationId: string;
  messageId: string;
  attachmentId: string;
}): string {
  return `${opts.conversationId}/${opts.messageId}/${opts.attachmentId}`;
}

export function exportStoragePath(opts: { userId: string; exportId: string }): string {
  return `${opts.userId}/${opts.exportId}`;
}

/** Categories that require elevated download grants (shorter TTL, single-use). */
export const ELEVATED_DOC_CATEGORIES = new Set([
  "physician_report",
  "medical_history",
  "care_assessment",
  "financial",
  "power_of_attorney",
  "guardianship",
  "advance_directives",
  "medicaid",
  "medicare",
  "medication_list",
  "discharge",
]);

export function isElevatedDocCategory(category: string): boolean {
  return ELEVATED_DOC_CATEGORIES.has(category);
}

export const DOWNLOAD_TTL_STANDARD_SECONDS = 120;
export const DOWNLOAD_TTL_ELEVATED_SECONDS = 60;
