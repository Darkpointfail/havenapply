import { timingSafeEqual } from "node:crypto";

/**
 * Operator capabilities exist only while there is no mail transport: granting
 * the first site administrator, and reading verification, reset or invitation
 * tokens for out-of-band delivery.
 *
 * They are unavailable unless `HAVEN_BOOTSTRAP_TOKEN` is configured, and in
 * production they additionally require `HAVEN_OPERATOR_ENDPOINTS=enabled`, so a
 * leaked staging secret cannot be replayed against production.
 */
export function operatorEndpointsEnabled(): boolean {
  if (!process.env.HAVEN_BOOTSTRAP_TOKEN) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.HAVEN_OPERATOR_ENDPOINTS === "enabled";
}

export function operatorTokenMatches(provided: string | null): boolean {
  if (!operatorEndpointsEnabled()) return false;
  const expected = process.env.HAVEN_BOOTSTRAP_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
