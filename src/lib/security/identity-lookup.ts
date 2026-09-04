/**
 * Token lookups that need to scan credentials.
 * Split out so `auth-service` keeps a narrow dependency on the store.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { CredentialRecord } from "@/lib/security/identity-store";

const STATE_FILE = path.join(process.cwd(), ".data", "identity", "state.json");

export async function listCredentialsForLookup(): Promise<CredentialRecord[]> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as { credentials?: CredentialRecord[] };
    return parsed.credentials ?? [];
  } catch {
    return [];
  }
}
