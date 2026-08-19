/**
 * Private-by-default document object store (local server filesystem).
 * Production deployments should prefer Supabase private buckets with the same
 * path rules; this store backs API AuthZ when DATA_BACKEND is local / hybrid.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  access,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  assertSafeRelativeStoragePath,
  assertSafeStoragePathSegment,
  downloadDispositionName,
} from "@/lib/documents/names";
import {
  DOCUMENT_BACKUP_RETENTION_DAYS,
  DOCUMENT_SOFT_DELETE_RETENTION_DAYS,
} from "@/lib/documents/policy";
import type { AllowedDocumentMime } from "@/lib/documents/policy";

const ROOT =
  process.env.DOCUMENT_STORAGE_ROOT ||
  join(/* turbopackIgnore: true */ process.cwd(), "data", "private-documents");

export type StoredDocumentMeta = {
  id: string;
  tenantId: string;
  storagePath: string; // relative {tenantId}/{file}
  storageFileName: string;
  mime: AllowedDocumentMime;
  byteSize: number;
  checksumSha256: string;
  category: string;
  displayTitle: string;
  status: "ready" | "quarantined" | "deleted";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  purgeAfter: string | null;
  backupExpireAt: string;
  scanEngine: string;
};

type Registry = Record<string, StoredDocumentMeta>;

function registryPath() {
  return join(ROOT, "_registry.json");
}

async function ensureRoot() {
  await mkdir(join(ROOT, "_trash"), { recursive: true });
  await mkdir(join(ROOT, "_logs"), { recursive: true });
  await mkdir(join(ROOT, "_quarantine"), { recursive: true });
}

async function readRegistry(): Promise<Registry> {
  await ensureRoot();
  try {
    const raw = await readFile(registryPath(), "utf8");
    return JSON.parse(raw) as Registry;
  } catch {
    return {};
  }
}

async function writeRegistry(reg: Registry) {
  await ensureRoot();
  const tmp = `${registryPath()}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(reg, null, 2), "utf8");
  await rename(tmp, registryPath());
}

export function documentsRoot(): string {
  return ROOT;
}

export async function storeValidatedDocument(opts: {
  tenantId: string;
  storageFileName: string;
  bytes: Uint8Array;
  mime: AllowedDocumentMime;
  checksumSha256: string;
  category: string;
  displayTitle: string;
  scanEngine: string;
}): Promise<StoredDocumentMeta> {
  const tenantId = assertSafeStoragePathSegment(opts.tenantId);
  if (!/^[a-f0-9]{32}\.[a-z0-9]{3,5}$/.test(opts.storageFileName)) {
    throw new Error("invalid_storage_file_name");
  }

  const relative = assertSafeRelativeStoragePath(`${tenantId}/${opts.storageFileName}`);
  const absolute = join(ROOT, relative);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, opts.bytes);

  const now = new Date();
  const soft = new Date(now);
  soft.setDate(soft.getDate() + DOCUMENT_SOFT_DELETE_RETENTION_DAYS);
  const backup = new Date(now);
  backup.setDate(backup.getDate() + DOCUMENT_BACKUP_RETENTION_DAYS);

  const meta: StoredDocumentMeta = {
    id: randomUUID(),
    tenantId,
    storagePath: relative,
    storageFileName: opts.storageFileName,
    mime: opts.mime,
    byteSize: opts.bytes.byteLength,
    checksumSha256: opts.checksumSha256,
    category: opts.category,
    displayTitle: opts.displayTitle.slice(0, 200),
    status: "ready",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deletedAt: null,
    purgeAfter: null,
    backupExpireAt: backup.toISOString(),
    scanEngine: opts.scanEngine,
  };

  const reg = await readRegistry();
  reg[meta.id] = meta;
  await writeRegistry(reg);
  return meta;
}

export async function getDocumentMeta(id: string): Promise<StoredDocumentMeta | null> {
  const reg = await readRegistry();
  return reg[id] ?? null;
}

export async function assertTenantOwnsDocument(
  documentId: string,
  tenantId: string,
): Promise<StoredDocumentMeta> {
  const meta = await getDocumentMeta(documentId);
  if (!meta || meta.status === "deleted") {
    throw new Error("not_found");
  }
  if (meta.tenantId !== tenantId) {
    throw new Error("forbidden_tenant");
  }
  return meta;
}

export async function readDocumentBytes(meta: StoredDocumentMeta): Promise<Uint8Array> {
  const absolute = join(ROOT, assertSafeRelativeStoragePath(meta.storagePath));
  const buf = await readFile(absolute);
  return new Uint8Array(buf);
}

/** Logical delete — hide from access; schedule physical purge. */
export async function softDeleteDocument(
  documentId: string,
  tenantId: string,
): Promise<StoredDocumentMeta> {
  const meta = await assertTenantOwnsDocument(documentId, tenantId);
  const reg = await readRegistry();
  const now = new Date();
  const purgeAfter = new Date(now);
  purgeAfter.setDate(purgeAfter.getDate() + DOCUMENT_SOFT_DELETE_RETENTION_DAYS);
  const next: StoredDocumentMeta = {
    ...meta,
    status: "deleted",
    deletedAt: now.toISOString(),
    purgeAfter: purgeAfter.toISOString(),
    updatedAt: now.toISOString(),
  };
  reg[documentId] = next;
  await writeRegistry(reg);

  // Move blob to trash (still retained for retention window)
  const src = join(ROOT, meta.storagePath);
  const dest = join(ROOT, "_trash", meta.storageFileName);
  try {
    await access(src);
    await rename(src, dest);
    next.storagePath = assertSafeRelativeStoragePath(`_trash/${meta.storageFileName}`);
    reg[documentId] = next;
    await writeRegistry(reg);
  } catch {
    /* already moved */
  }
  return next;
}

/** Physical delete after retention (or forced). */
export async function hardDeleteDocument(documentId: string): Promise<boolean> {
  const reg = await readRegistry();
  const meta = reg[documentId];
  if (!meta) return false;
  const abs = join(ROOT, meta.storagePath);
  await unlink(abs).catch(() => undefined);
  delete reg[documentId];
  await writeRegistry(reg);
  return true;
}

/** Purge soft-deleted docs past purgeAfter and flag backup expiry. */
export async function purgeExpiredDocuments(now = new Date()): Promise<{
  purged: string[];
  backupExpired: string[];
}> {
  const reg = await readRegistry();
  const purged: string[] = [];
  const backupExpired: string[] = [];
  for (const [id, meta] of Object.entries(reg)) {
    if (meta.purgeAfter && new Date(meta.purgeAfter) <= now) {
      await hardDeleteDocument(id);
      purged.push(id);
      continue;
    }
    if (new Date(meta.backupExpireAt) <= now) {
      backupExpired.push(id);
      // Mark in meta so backup jobs can skip / tombstone
      reg[id] = {
        ...meta,
        updatedAt: now.toISOString(),
        displayTitle: meta.displayTitle,
      };
      // Attach marker via status note in updated registry field — keep id for audit
      (reg[id] as StoredDocumentMeta & { backupExpired?: boolean }).backupExpired = true;
    }
  }
  await writeRegistry(reg);
  return { purged, backupExpired };
}

export function contentDispositionFor(meta: StoredDocumentMeta): string {
  const name = downloadDispositionName(meta.storageFileName);
  return `attachment; filename="${name}"`;
}

export function opaqueTenantIdFromUserId(userId: string): string {
  return createHash("sha256").update(`haven-tenant:${userId}`).digest("hex").slice(0, 32);
}
