/**
 * Resolve tenant id for document AuthZ from request headers.
 * Production: bind to authenticated user id. Demo: X-Haven-Tenant-Id + HMAC proof.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { assertSafeStoragePathSegment } from "@/lib/documents/names";

function tenantProofSecret(): string {
  const s = process.env.DOCUMENT_TENANT_PROOF_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DOCUMENT_TENANT_PROOF_SECRET missing");
  }
  return "dev-only-tenant-proof-secret-rotate-me";
}

export function mintTenantProof(tenantId: string, userId: string): string {
  const body = `${tenantId}.${userId}`;
  return createHmac("sha256", tenantProofSecret()).update(body).digest("hex");
}

export function verifyTenantProof(
  tenantId: string,
  userId: string,
  proof: string,
): boolean {
  const expected = mintTenantProof(tenantId, userId);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(proof, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type TenantIdentity = {
  tenantId: string;
  userId: string;
};

export function resolveTenantIdentity(request: Request): TenantIdentity | null {
  const tenantId = request.headers.get("x-haven-tenant-id")?.trim() || "";
  const userId = request.headers.get("x-haven-user-id")?.trim() || "";
  const proof = request.headers.get("x-haven-tenant-proof")?.trim() || "";
  if (!tenantId || !userId || !proof) return null;
  try {
    assertSafeStoragePathSegment(tenantId);
  } catch {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(userId)) return null;
  if (!verifyTenantProof(tenantId, userId, proof)) return null;
  return { tenantId, userId };
}
