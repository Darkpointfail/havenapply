/**
 * Filename / path hardening: double-extension block, traversal prevention,
 * server-generated opaque storage names.
 */

import { randomBytes } from "node:crypto";
import {
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  MIME_TO_EXT,
  type AllowedDocumentMime,
} from "@/lib/documents/policy";

const TRAVERSAL = /(\.\.|%2e%2e|%252e|\\)/i;

/** Split filename into base + all extension segments (lowercased). */
export function extensionChain(filename: string): string[] {
  const base = filename.split(/[/\\]/).pop() || filename;
  const parts = base.split(".");
  if (parts.length <= 1) return [];
  return parts.slice(1).map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

export function hasBlockedDoubleExtension(filename: string): boolean {
  const chain = extensionChain(filename);
  if (chain.length === 0) return false;
  // Any blocked segment anywhere in the chain (e.g. invoice.pdf.exe, photo.jpg.js)
  if (chain.some((ext) => BLOCKED_EXTENSIONS.has(ext))) return true;
  // Multiple extensions where the final one is allowed but an earlier one is suspicious
  if (chain.length > 1) {
    const final = chain[chain.length - 1]!;
    if (!ALLOWED_EXTENSIONS.has(final)) return true;
    // e.g. file.exe.pdf — still reject if any prior segment is blocked (already caught)
    // Also reject nested fake types: report.pdf.jpg when client claims pdf? handled by magic.
    // Policy: more than one extension → reject (prevents content-sniff confusion).
    return true;
  }
  return false;
}

export function assertSafeStoragePathSegment(segment: string, opts?: { allowDot?: boolean }): string {
  const s = segment.trim();
  if (!s || s.length > 128) throw new Error("invalid_path_segment");
  if (TRAVERSAL.test(s)) throw new Error("path_traversal");
  if (s.includes("/") || s.includes("\\") || s.includes("\0")) {
    throw new Error("path_traversal");
  }
  const re = opts?.allowDot ? /^[a-zA-Z0-9_.-]+$/ : /^[a-zA-Z0-9_-]+$/;
  if (!re.test(s)) throw new Error("invalid_path_segment");
  if (s === "." || s === "..") throw new Error("path_traversal");
  return s;
}

export function assertSafeRelativeStoragePath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || TRAVERSAL.test(normalized)) {
    throw new Error("path_traversal");
  }
  const parts = normalized.split("/");
  parts.forEach((p, idx) => {
    const isLast = idx === parts.length - 1;
    assertSafeStoragePathSegment(p, { allowDot: isLast });
  });
  return parts.join("/");
}

/** Opaque server-side object name: {uuid}.{ext} — never use the user filename. */
export function generateStorageFileName(mime: AllowedDocumentMime): string {
  const ext = MIME_TO_EXT[mime];
  const id = randomBytes(16).toString("hex");
  return `${id}.${ext}`;
}

/** Safe Content-Disposition filename (opaque). */
export function downloadDispositionName(storageFileName: string): string {
  const safe = storageFileName.replace(/[^a-zA-Z0-9._-]/g, "");
  return safe.startsWith("haven-") ? safe : `haven-${safe}`;
}
