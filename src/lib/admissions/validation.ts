/**
 * Request validation for admissions routes.
 * Rejects anything the client is not allowed to state, and caps sizes.
 */

import type { AdmissionSubmitInput } from "@/lib/admissions/types";

const MAX_TEXT = 2000;
const MAX_LIST = 40;
const MAX_DOCS = 50;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function text(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST);
}

export function parseSubmitInput(body: unknown): ValidationResult<AdmissionSubmitInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const raw = body as Record<string, unknown>;

  const clientRequestId = text(raw.clientRequestId, 128);
  if (!clientRequestId) return { ok: false, error: "Missing request identifier." };

  const siteId = text(raw.siteId, 128);
  if (!siteId) return { ok: false, error: "Missing residence." };

  const senior = (raw.senior ?? {}) as Record<string, unknown>;
  const contact = (raw.familyContact ?? {}) as Record<string, unknown>;
  const documents = Array.isArray(raw.documents)
    ? (raw.documents as Record<string, unknown>[]).slice(0, MAX_DOCS).map((doc) => ({
        id: text(doc?.id, 128) ?? "",
        name: text(doc?.name, 300) ?? "",
        category: text(doc?.category, 100) ?? "",
        shared: Boolean(doc?.shared),
      }))
    : undefined;

  return {
    ok: true,
    value: {
      clientRequestId,
      siteId,
      siteName: text(raw.siteName, 300),
      publicRef: text(raw.publicRef, 64) ?? null,
      personRef: text(raw.personRef, 64) ?? null,
      dossierRef: text(raw.dossierRef, 64) ?? null,
      senior: {
        name: text(senior.name, 200) ?? "",
        age: typeof senior.age === "number" && Number.isFinite(senior.age) ? senior.age : null,
        relationship: text(senior.relationship, 120) ?? "",
        photoUrl: typeof senior.photoUrl === "string" ? senior.photoUrl : null,
      },
      summary: text(raw.summary, MAX_TEXT) ?? "",
      careNeeds: stringList(raw.careNeeds) ?? [],
      medicalHighlights: stringList(raw.medicalHighlights) ?? [],
      documents: documents ?? [],
      familyContact: {
        name: text(contact.name, 200) ?? "",
        email: (text(contact.email, 320) ?? "").toLowerCase(),
        phone: text(contact.phone, 60) ?? "",
        relationship: text(contact.relationship, 120) ?? "",
      },
      desiredMoveIn: text(raw.desiredMoveIn, 120) ?? null,
    },
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
