import { createHash, randomBytes } from "crypto";

/** Allowed MIME types — magic-byte validated, not extension-trusted. */
export const DEFAULT_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedMime = (typeof DEFAULT_ALLOWED_MIME)[number];

export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB

const MIME_BY_MAGIC: Array<{ mime: AllowedMime; test: (buf: Buffer) => boolean }> = [
  {
    mime: "application/pdf",
    test: (buf) =>
      buf.length >= 5 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46 &&
      buf[4] === 0x2d, // %PDF-
  },
  {
    mime: "image/jpeg",
    test: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: "image/png",
    test: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
];

export function detectMimeFromMagic(buf: Buffer): AllowedMime | null {
  for (const entry of MIME_BY_MAGIC) {
    if (entry.test(buf)) return entry.mime;
  }
  return null;
}

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Opaque object key — never derived from user-supplied path/filename. */
export function generateOpaqueStorageKey(familyProfileId: string): string {
  const id = randomBytes(16).toString("hex");
  return `docs/${familyProfileId}/${id}`;
}

/**
 * Sanitize original filename for display / Content-Disposition.
 * Strips path separators, control chars; keeps a short basename.
 */
export function sanitizeOriginalFileName(raw: string, fallbackExt: string): string {
  const base = raw.split(/[/\\]/).pop() || "document";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim()
    .slice(0, 120);
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return `document.${fallbackExt}`;
  }
  // Ensure no CRLF injection in headers
  return cleaned.replace(/[\r\n]/g, "");
}

export function extensionForMime(mime: AllowedMime): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  return "png";
}

export function contentDisposition(fileName: string, disposition: "inline" | "attachment"): string {
  const safe = sanitizeOriginalFileName(fileName, "bin");
  // RFC 5987 filename*
  const encoded = encodeURIComponent(safe).replace(/['()]/g, escape);
  return `${disposition}; filename="${safe.replace(/"/g, "")}"; filename*=UTF-8''${encoded}`;
}

export function parseAllowedMimeList(raw?: string | null): AllowedMime[] {
  if (!raw) return [...DEFAULT_ALLOWED_MIME];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = parts.filter((p): p is AllowedMime =>
    (DEFAULT_ALLOWED_MIME as readonly string[]).includes(p),
  );
  return allowed.length > 0 ? allowed : [...DEFAULT_ALLOWED_MIME];
}
