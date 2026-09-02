import { DocumentStatus, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertCanAccessApplication,
  assertCanAccessDocument,
  assertCanMutateFamily,
  AuthzError,
} from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import {
  DEFAULT_MAX_BYTES,
  detectMimeFromMagic,
  extensionForMime,
  generateOpaqueStorageKey,
  parseAllowedMimeList,
  sanitizeOriginalFileName,
  sha256Buffer,
} from "@/lib/document-files";
import { createVirusScanner } from "@/lib/virus-scan";

export class DocumentError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "DocumentError";
    this.code = code;
    this.status = status;
  }
}

/** In-flight scan promises for tests awaiting completion. */
const pendingScans = new Map<string, Promise<void>>();

export function getPendingScan(documentId: string) {
  return pendingScans.get(documentId);
}

export async function listApplicationDocuments(input: {
  userId: string;
  role: Role;
  applicationId: string;
}) {
  await assertCanAccessApplication(input.userId, input.applicationId, input.role);

  const where =
    input.role === "STAFF"
      ? {
          applicationId: input.applicationId,
          status: DocumentStatus.AVAILABLE,
        }
      : {
          applicationId: input.applicationId,
          status: { not: DocumentStatus.DELETED },
        };

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalFileName: true,
      contentType: true,
      sizeBytes: true,
      status: true,
      scanAdapter: true,
      scanResult: true,
      scannedAt: true,
      createdAt: true,
      checksumSha256: true,
    },
  });
}

/**
 * Upload bytes from memory (no durable server disk). Creates UPLOADING row,
 * puts object, then enqueues async AV scan. Compensates DB↔storage failures.
 */
export async function uploadApplicationDocument(input: {
  userId: string;
  role: Role;
  applicationId: string;
  fileName: string;
  bytes: Buffer;
  ipAddress?: string | null;
  /** When true, await scan (tests). Default: fire-and-forget. */
  awaitScan?: boolean;
}) {
  if (input.role !== "FAMILY" && input.role !== "ADMIN") {
    throw new AuthzError("FORBIDDEN", 403);
  }

  const env = getEnv();
  const maxBytes = env.DOCUMENT_MAX_BYTES ?? DEFAULT_MAX_BYTES;
  if (input.bytes.byteLength === 0) throw new DocumentError("EMPTY_FILE", 400);
  if (input.bytes.byteLength > maxBytes) throw new DocumentError("FILE_TOO_LARGE", 413);

  const allowed = parseAllowedMimeList(env.DOCUMENT_ALLOWED_MIME);
  const detected = detectMimeFromMagic(input.bytes);
  if (!detected || !allowed.includes(detected)) {
    throw new DocumentError("INVALID_FILE_TYPE", 415);
  }

  const app = await assertCanAccessApplication(
    input.userId,
    input.applicationId,
    input.role,
  );
  await assertCanMutateFamily(input.userId, app.familyProfileId, input.role);

  const ext = extensionForMime(detected);
  const originalFileName = sanitizeOriginalFileName(input.fileName, ext);
  const storageKey = generateOpaqueStorageKey(app.familyProfileId);
  const checksumSha256 = sha256Buffer(input.bytes);

  const doc = await prisma.document.create({
    data: {
      familyProfileId: app.familyProfileId,
      applicationId: input.applicationId,
      storageKey,
      originalFileName,
      contentType: detected,
      sizeBytes: input.bytes.byteLength,
      checksumSha256,
      status: "UPLOADING",
      uploadedByUserId: input.userId,
    },
  });

  try {
    await storage.putObject({
      key: storageKey,
      body: input.bytes,
      contentType: detected,
    });
  } catch {
    // Compensate: remove orphan DB row if object put failed.
    await prisma.document.delete({ where: { id: doc.id } }).catch(() => undefined);
    throw new DocumentError("STORAGE_PUT_FAILED", 502);
  }

  await writeAudit({
    actorUserId: input.userId,
    action: "document.uploaded",
    entityType: "Document",
    entityId: doc.id,
    metadata: {
      applicationId: input.applicationId,
      contentType: detected,
      sizeBytes: input.bytes.byteLength,
      status: "UPLOADING",
    },
    ipAddress: input.ipAddress,
  });

  const scanPromise = runDocumentScan(doc.id, input.bytes).finally(() => {
    pendingScans.delete(doc.id);
  });
  pendingScans.set(doc.id, scanPromise);

  if (input.awaitScan) {
    await scanPromise;
  }

  return prisma.document.findUniqueOrThrow({ where: { id: doc.id } });
}

export async function runDocumentScan(documentId: string, bytes?: Buffer) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.status === "DELETED") return;

  if (!bytes) {
    // Scanner path without buffer: mark error — callers should pass bytes after upload.
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "QUARANTINED",
        scanAdapter: "dev-passthrough",
        scanResult: "error",
        scannedAt: new Date(),
      },
    });
    return;
  }

  const scanner = createVirusScanner();
  const result = await scanner.scan(bytes);

  if (result.verdict === "infected" || result.verdict === "error") {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "QUARANTINED",
        scanAdapter: result.adapter,
        scanResult: result.scanResult,
        scannedAt: new Date(),
      },
    });
    await writeAudit({
      action: "document.quarantined",
      entityType: "Document",
      entityId: documentId,
      metadata: {
        adapter: result.adapter,
        isRealScan: result.isRealScan,
        scanResult: result.scanResult,
      },
    });
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "AVAILABLE",
      scanAdapter: result.adapter,
      scanResult: result.scanResult,
      scannedAt: new Date(),
    },
  });
}

/**
 * Issue a short-lived signed URL after authorization.
 * Staff only receives AVAILABLE documents.
 */
export async function issueDocumentAccessUrl(input: {
  userId: string;
  role: Role;
  documentId: string;
  disposition: "inline" | "attachment";
  ipAddress?: string | null;
  /** Override TTL (tests for expiry). */
  expiresInSeconds?: number;
}) {
  const access = await assertCanAccessDocument(input.userId, input.documentId, input.role);
  const full = await prisma.document.findUniqueOrThrow({ where: { id: access.id } });

  if (full.status === "DELETED") {
    throw new AuthzError("DOCUMENT_NOT_FOUND", 404);
  }

  if (input.role === "STAFF" || input.role === "ADMIN") {
    if (full.status !== "AVAILABLE") {
      throw new AuthzError("DOCUMENT_NOT_AVAILABLE", 404);
    }
  } else if (input.role === "FAMILY") {
    if (full.status !== "AVAILABLE") {
      throw new DocumentError("DOCUMENT_NOT_READY", 409);
    }
  }

  const action = input.disposition === "inline" ? "document.viewed" : "document.downloaded";
  await writeAudit({
    actorUserId: input.userId,
    action,
    entityType: "Document",
    entityId: full.id,
    metadata: {
      contentType: full.contentType,
      sizeBytes: full.sizeBytes,
      disposition: input.disposition,
    },
    ipAddress: input.ipAddress,
  });

  return {
    url: await storage.getSignedDownloadUrl({
      key: full.storageKey,
      fileName: full.originalFileName,
      contentType: full.contentType,
      disposition: input.disposition,
      expiresInSeconds: input.expiresInSeconds,
    }),
    contentType: full.contentType,
    fileName: full.originalFileName,
    expiresInSeconds:
      input.expiresInSeconds ?? getEnv().DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60,
  };
}

/** Immediate soft-delete; object purge is deferred until purgeAfter. */
export async function softDeleteDocument(input: {
  userId: string;
  role: Role;
  documentId: string;
  ipAddress?: string | null;
}) {
  const access = await assertCanAccessDocument(input.userId, input.documentId, input.role);
  const full = await prisma.document.findUniqueOrThrow({ where: { id: access.id } });

  if (full.status === "DELETED") {
    return full;
  }

  if (input.role === "FAMILY") {
    await assertCanMutateFamily(input.userId, full.familyProfileId, input.role);
  } else if (input.role === "STAFF") {
    throw new AuthzError("FORBIDDEN", 403);
  }

  const days = getEnv().DOCUMENT_PURGE_DELAY_DAYS ?? 30;
  const purgeAfter = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.document.update({
    where: { id: full.id },
    data: {
      status: "DELETED",
      deletedAt: new Date(),
      purgeAfter,
    },
  });

  await writeAudit({
    actorUserId: input.userId,
    action: "document.deleted",
    entityType: "Document",
    entityId: full.id,
    metadata: { purgeAfter: purgeAfter.toISOString() },
    ipAddress: input.ipAddress,
  });

  return updated;
}

/**
 * Hard-purge objects whose purgeAfter has passed.
 * Documented deferred cleanup — run via cron/ops, not on request path.
 */
export async function purgeDeletedDocuments(now = new Date()) {
  const due = await prisma.document.findMany({
    where: {
      status: "DELETED",
      purgeAfter: { lte: now },
    },
    take: 100,
  });

  let purged = 0;
  for (const doc of due) {
    try {
      await storage.deleteObject(doc.storageKey);
    } catch {
      // Object may already be gone; continue with DB cleanup.
    }
    await prisma.document.delete({ where: { id: doc.id } });
    purged += 1;
  }
  return { purged };
}

/** Test helper: force a document into QUARANTINED without AV. */
export async function forceQuarantineForTests(documentId: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: {
      status: "QUARANTINED",
      scanAdapter: "dev-passthrough",
      scanResult: "infected",
      scannedAt: new Date(),
    },
  });
}
