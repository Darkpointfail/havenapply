/**
 * Authoritative upload validation pipeline (server).
 */

import { detectMagicMime } from "@/lib/documents/magic";
import { scanDocumentBytes, type ScanResult } from "@/lib/documents/malware";
import {
  hasBlockedDoubleExtension,
  generateStorageFileName,
} from "@/lib/documents/names";
import {
  ALLOWED_DOCUMENT_MIME,
  DOCUMENT_MAX_BYTES,
  type AllowedDocumentMime,
} from "@/lib/documents/policy";
import { stripDisposableMetadata } from "@/lib/documents/strip-metadata";
import { assertNonProdDocumentPolicy } from "@/lib/documents/env-policy";

export type ValidatedUpload = {
  mime: AllowedDocumentMime;
  ext: string;
  storageFileName: string;
  bytes: Uint8Array;
  byteSize: number;
  checksumSha256: string;
  scan: ScanResult;
  originalNameRejected: string; // kept only for logging, never for storage path
};

export type ValidateFailure = {
  ok: false;
  code: string;
  message: string;
};

export type ValidateSuccess = { ok: true; data: ValidatedUpload };

async function sha256Hex(buf: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateUploadBuffer(opts: {
  bytes: Uint8Array;
  claimedMime?: string | null;
  originalName?: string | null;
  demoFixture?: boolean;
}): Promise<ValidateSuccess | ValidateFailure> {
  try {
    assertNonProdDocumentPolicy({
      demoFixture: opts.demoFixture === true,
      byteSize: opts.bytes.byteLength,
      originalName: opts.originalName || "",
    });
  } catch (e) {
    return {
      ok: false,
      code: "env_policy",
      message: e instanceof Error ? e.message : "Environment policy blocked upload",
    };
  }

  if (!opts.bytes.byteLength) {
    return { ok: false, code: "empty", message: "Empty file" };
  }
  if (opts.bytes.byteLength > DOCUMENT_MAX_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: `File exceeds the ${DOCUMENT_MAX_BYTES} byte limit`,
    };
  }

  const originalName = (opts.originalName || "upload").slice(0, 255);
  if (hasBlockedDoubleExtension(originalName)) {
    return {
      ok: false,
      code: "double_extension",
      message: "Double extensions and executable extensions are not allowed",
    };
  }

  const magic = detectMagicMime(opts.bytes);
  if (!magic.ok) {
    return {
      ok: false,
      code: "bad_signature",
      message: `File signature rejected (${magic.reason})`,
    };
  }

  if (
    opts.claimedMime &&
    opts.claimedMime !== "application/octet-stream" &&
    opts.claimedMime !== magic.mime &&
    // jpeg aliases
    !(
      (opts.claimedMime === "image/jpg" || opts.claimedMime === "image/pjpeg") &&
      magic.mime === "image/jpeg"
    )
  ) {
    return {
      ok: false,
      code: "mime_mismatch",
      message: "Claimed MIME type does not match file signature",
    };
  }

  if (!(ALLOWED_DOCUMENT_MIME as readonly string[]).includes(magic.mime)) {
    return { ok: false, code: "mime_denied", message: "MIME type not allowlisted" };
  }

  const scan = await scanDocumentBytes(opts.bytes, magic.mime);
  if (!scan.clean) {
    return {
      ok: false,
      code: "malware",
      message: `File quarantined (${scan.reason})`,
    };
  }

  const stripped = stripDisposableMetadata(opts.bytes, magic.mime);
  const checksumSha256 = await sha256Hex(stripped);
  const storageFileName = generateStorageFileName(magic.mime);

  return {
    ok: true,
    data: {
      mime: magic.mime,
      ext: magic.ext,
      storageFileName,
      bytes: stripped,
      byteSize: stripped.byteLength,
      checksumSha256,
      scan,
      originalNameRejected: originalName,
    },
  };
}
