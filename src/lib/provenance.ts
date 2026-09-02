import type { DataConfidence, DataSourceKind, Prisma } from "@prisma/client";

/**
 * Provenanced catalog fact.
 * `value: null` means UNKNOWN — never interpret as "not offered".
 */
export type ProvenancedValue<T = unknown> = {
  value: T | null;
  source: DataSourceKind;
  collectedAt?: string | null;
  verifiedAt?: string | null;
  method?: string | null;
  confidence: DataConfidence;
};

export function unknownFact<T = unknown>(): ProvenancedValue<T> {
  return {
    value: null,
    source: "UNKNOWN",
    confidence: "UNKNOWN",
  };
}

export function facilityFact<T>(
  value: T | null,
  opts?: Partial<Omit<ProvenancedValue<T>, "value" | "source">>,
): ProvenancedValue<T> {
  return {
    value,
    source: "FACILITY",
    confidence: opts?.confidence ?? (value == null ? "UNKNOWN" : "MEDIUM"),
    collectedAt: opts?.collectedAt ?? new Date().toISOString(),
    verifiedAt: opts?.verifiedAt ?? null,
    method: opts?.method ?? "facility_provided",
  };
}

export function governmentFact<T>(
  value: T | null,
  opts?: Partial<Omit<ProvenancedValue<T>, "value" | "source">>,
): ProvenancedValue<T> {
  return {
    value,
    source: "GOVERNMENT",
    confidence: opts?.confidence ?? (value == null ? "UNKNOWN" : "HIGH"),
    collectedAt: opts?.collectedAt ?? new Date().toISOString(),
    verifiedAt: opts?.verifiedAt ?? null,
    method: opts?.method ?? "government_import",
  };
}

export function parseProvenanced<T = unknown>(
  raw: Prisma.JsonValue | null | undefined,
): ProvenancedValue<T> | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!("value" in obj) || !("source" in obj) || !("confidence" in obj)) return null;
  return {
    value: (obj.value as T | null) ?? null,
    source: obj.source as DataSourceKind,
    collectedAt: (obj.collectedAt as string | null | undefined) ?? null,
    verifiedAt: (obj.verifiedAt as string | null | undefined) ?? null,
    method: (obj.method as string | null | undefined) ?? null,
    confidence: obj.confidence as DataConfidence,
  };
}

export function isConfirmedPricing(fact: ProvenancedValue | null | undefined): boolean {
  if (!fact || fact.value == null) return false;
  if (fact.source === "UNKNOWN" || fact.confidence === "UNKNOWN" || fact.confidence === "LOW") {
    return false;
  }
  return fact.verifiedAt != null || fact.source === "FACILITY" || fact.source === "GOVERNMENT";
}

export function toInputJson(fact: ProvenancedValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!fact) return { value: null, source: "UNKNOWN", confidence: "UNKNOWN" };
  return fact as unknown as Prisma.InputJsonValue;
}
