/**
 * File signature (magic byte) detection — never trust client MIME or extension alone.
 */

import type { AllowedDocumentMime } from "@/lib/documents/policy";

function startsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i += 1) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

function asAscii(buf: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...buf.slice(start, start + len));
}

/** True when buffer looks like OOXML (ZIP) containing word/ document.xml. */
function looksLikeDocx(buf: Uint8Array): boolean {
  if (!startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) && !startsWith(buf, [0x50, 0x4b, 0x05, 0x06])) {
    return false;
  }
  // Search a window for the WordprocessingML path marker.
  const window = buf.slice(0, Math.min(buf.length, 16384));
  const text = String.fromCharCode(...window);
  return (
    text.includes("word/") ||
    text.includes("word\\") ||
    text.includes("[Content_Types].xml")
  );
}

export type MagicDetection =
  | { ok: true; mime: AllowedDocumentMime; ext: string }
  | { ok: false; reason: string };

export function detectMagicMime(buf: Uint8Array): MagicDetection {
  if (buf.length < 4) return { ok: false, reason: "file_too_small" };

  // Executables / dangerous containers first
  if (startsWith(buf, [0x4d, 0x5a])) {
    return { ok: false, reason: "executable_mz" };
  }
  if (startsWith(buf, [0x7f, 0x45, 0x4c, 0x46])) {
    return { ok: false, reason: "executable_elf" };
  }
  if (
    startsWith(buf, [0xca, 0xfe, 0xba, 0xbe]) ||
    startsWith(buf, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(buf, [0xcf, 0xfa, 0xed, 0xfe])
  ) {
    return { ok: false, reason: "executable_macho" };
  }

  // PDF
  if (asAscii(buf, 0, 4) === "%PDF") {
    return { ok: true, mime: "application/pdf", ext: "pdf" };
  }

  // JPEG
  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    return { ok: true, mime: "image/jpeg", ext: "jpg" };
  }

  // PNG
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ok: true, mime: "image/png", ext: "png" };
  }

  // WEBP: RIFF....WEBP
  if (
    asAscii(buf, 0, 4) === "RIFF" &&
    buf.length >= 12 &&
    asAscii(buf, 8, 4) === "WEBP"
  ) {
    return { ok: true, mime: "image/webp", ext: "webp" };
  }

  // Legacy OLE Compound Document (.doc)
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return { ok: true, mime: "application/msword", ext: "doc" };
  }

  // DOCX (OOXML)
  if (looksLikeDocx(buf)) {
    return {
      ok: true,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ext: "docx",
    };
  }

  // Bare ZIP that is not docx
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    return { ok: false, reason: "zip_not_allowed" };
  }

  // HTML / SVG polyglot starters
  const head = asAscii(buf, 0, Math.min(buf.length, 256)).toLowerCase();
  if (
    head.includes("<!doctype html") ||
    head.includes("<html") ||
    head.includes("<svg") ||
    head.includes("<script")
  ) {
    return { ok: false, reason: "active_markup" };
  }

  return { ok: false, reason: "unknown_signature" };
}
