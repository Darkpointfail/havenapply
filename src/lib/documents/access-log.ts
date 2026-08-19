/**
 * Append-only document access audit log (server).
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { documentsRoot } from "@/lib/documents/store";

export type DocumentAccessEvent = {
  at: string;
  action:
    | "upload"
    | "download"
    | "download_denied"
    | "soft_delete"
    | "hard_delete"
    | "quarantine"
    | "purge";
  documentId: string;
  tenantId: string;
  actorId?: string;
  detail?: string;
  ipHash?: string;
};

function redactDetail(detail: string | undefined): string | undefined {
  if (!detail) return detail;
  return detail.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[redacted-email]");
}

export async function appendDocumentAccessLog(event: DocumentAccessEvent): Promise<void> {
  const dir = join(documentsRoot(), "_logs");
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify({
    ...event,
    detail: redactDetail(event.detail),
  });
  const day = event.at.slice(0, 10);
  await appendFile(join(dir, `access-${day}.jsonl`), `${line}\n`, "utf8");
}
