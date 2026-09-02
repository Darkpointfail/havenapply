import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCanAccessDocument, assertCanAccessFamily, AuthzError } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { storage } from "@/lib/storage";

export async function registerDocumentMeta(input: {
  userId: string;
  role: Role;
  familyProfileId: string;
  applicationId?: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}) {
  await assertCanAccessFamily(input.userId, input.familyProfileId, input.role);
  if (input.role !== "FAMILY" && input.role !== "ADMIN") {
    throw new AuthzError("FORBIDDEN", 403);
  }

  return prisma.document.create({
    data: {
      familyProfileId: input.familyProfileId,
      applicationId: input.applicationId,
      storageKey: input.storageKey,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadedByUserId: input.userId,
    },
  });
}

export async function getDocumentDownloadUrl(input: {
  userId: string;
  role: Role;
  documentId: string;
  ipAddress?: string | null;
}) {
  const doc = await assertCanAccessDocument(input.userId, input.documentId, input.role);
  const full = await prisma.document.findUniqueOrThrow({ where: { id: doc.id } });

  await writeAudit({
    actorUserId: input.userId,
    action: "document.downloaded",
    entityType: "Document",
    entityId: full.id,
    metadata: { contentType: full.contentType, sizeBytes: full.sizeBytes },
    ipAddress: input.ipAddress,
  });

  return storage.getSignedDownloadUrl(full.storageKey);
}

export async function markDocumentViewed(input: {
  userId: string;
  role: Role;
  documentId: string;
  ipAddress?: string | null;
}) {
  await assertCanAccessDocument(input.userId, input.documentId, input.role);
  await writeAudit({
    actorUserId: input.userId,
    action: "document.viewed",
    entityType: "Document",
    entityId: input.documentId,
    ipAddress: input.ipAddress,
  });
}
