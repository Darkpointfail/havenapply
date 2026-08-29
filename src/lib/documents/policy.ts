/**
 * Document upload policy — allowlists, size limits, blocked active content.
 * Shared conceptually by client hints and server enforcement (server is authoritative).
 */

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap (server)
export const DOCUMENT_MAX_BYTES_DEMO = 4 * 1024 * 1024; // client UX hint for local demo
export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 60;
export const DOCUMENT_SIGNED_URL_TTL_ELEVATED_SECONDS = 30;
export const DOCUMENT_SOFT_DELETE_RETENTION_DAYS = 30;
export const DOCUMENT_BACKUP_RETENTION_DAYS = 90;

/** Allowed MIME types (server must also match magic bytes). */
export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedDocumentMime = (typeof ALLOWED_DOCUMENT_MIME)[number];

/** Single safe extension per allowed type (no double extensions). */
export const MIME_TO_EXT: Record<AllowedDocumentMime, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export const ALLOWED_EXTENSIONS = new Set(Object.values(MIME_TO_EXT));

/**
 * Explicitly blocked extensions (executables, scripts, active markup, archives that
 * often smuggle payloads, office macros containers we do not accept as primary type).
 */
export const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "dll",
  "com",
  "bat",
  "cmd",
  "msi",
  "scr",
  "ps1",
  "vbs",
  "vbe",
  "js",
  "jse",
  "mjs",
  "jar",
  "apk",
  "dmg",
  "pkg",
  "sh",
  "bash",
  "zsh",
  "php",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "html",
  "htm",
  "shtml",
  "xhtml",
  "svg",
  "svgz",
  "xml",
  "xsl",
  "htaccess",
  "wasm",
  "bin",
  "so",
  "dylib",
  "sys",
  "drv",
  "iso",
  "img",
  "vhd",
  "lnk",
  "url",
  "reg",
  "cab",
  "7z",
  "rar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "zip", // raw zip not allowed; docx is validated as OOXML separately
  "docm",
  "xlsm",
  "pptm",
  "dotm",
  "xltm",
  "ppam",
]);

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

export function isElevatedCategory(category: string): boolean {
  return ELEVATED_DOC_CATEGORIES.has(category);
}

/** HTML accept= hint for file inputs (not security). */
export const DOCUMENT_FILE_INPUT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp";
