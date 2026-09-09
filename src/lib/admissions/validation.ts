/**
 * Request validation for admissions routes.
 * Rejects anything the client is not allowed to state, and caps sizes.
 */

import type {
  AdmissionDossierSnapshot,
  AdmissionSubmitInput,
} from "@/lib/admissions/types";

const MAX_TEXT = 2000;
const MAX_LIST = 40;
const MAX_DOCS = 50;
const MAX_DOSSIER_BYTES = 40_000;

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

function dossierSnapshot(value: unknown): AdmissionDossierSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const completeness = (raw.completeness ?? {}) as Record<string, unknown>;
  const context = (raw.context ?? {}) as Record<string, unknown>;
  const housing = (raw.housing ?? {}) as Record<string, unknown>;
  const autonomy = (raw.autonomy ?? {}) as Record<string, unknown>;
  const clinical = (raw.clinical ?? {}) as Record<string, unknown>;
  const contact = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return null;
    const row = candidate as Record<string, unknown>;
    return {
      name: text(row.name, 200) ?? "",
      email: (text(row.email, 320) ?? "").toLowerCase(),
      phone: text(row.phone, 60) ?? "",
      relationship: text(row.relationship, 120) ?? "",
    };
  };
  const adls =
    autonomy.adls && typeof autonomy.adls === "object"
      ? Object.fromEntries(
          Object.entries(autonomy.adls as Record<string, unknown>)
            .slice(0, 20)
            .map(([key, entry]) => [key.slice(0, 80), text(entry, 160) ?? ""]),
        )
      : {};

  return {
    updatedAt: text(raw.updatedAt, 64) ?? null,
    completeness: {
      percent:
        typeof completeness.percent === "number" && Number.isFinite(completeness.percent)
          ? Math.max(0, Math.min(100, Math.round(completeness.percent)))
          : 0,
      missingItems: stringList(completeness.missingItems) ?? [],
      missingDocuments: stringList(completeness.missingDocuments) ?? [],
    },
    context: {
      currentAddress: text(context.currentAddress, 500) ?? "",
      currentLivingSituation: text(context.currentLivingSituation, 300) ?? "",
      primaryLanguage: text(context.primaryLanguage, 120) ?? "",
      referralSource: text(context.referralSource, 120) ?? "",
    },
    housing: {
      communityTypes: stringList(housing.communityTypes) ?? [],
      preferredCities: text(housing.preferredCities, 500) ?? "",
      roomPreference: text(housing.roomPreference, 160) ?? "",
      specialPreferences: stringList(housing.specialPreferences) ?? [],
      specialPreferencesNotes: text(housing.specialPreferencesNotes, 1000) ?? "",
      budgetMin: text(housing.budgetMin, 80) ?? "",
      budgetMax: text(housing.budgetMax, 80) ?? "",
    },
    autonomy: {
      level: text(autonomy.level, 160) ?? "",
      mobility: text(autonomy.mobility, 160) ?? "",
      mobilityDevices: stringList(autonomy.mobilityDevices) ?? [],
      adls,
      continence: text(autonomy.continence, 160) ?? "",
      memoryCognition: stringList(autonomy.memoryCognition) ?? [],
      nutrition: stringList(autonomy.nutrition) ?? [],
      specialCareNeeds: text(autonomy.specialCareNeeds, MAX_TEXT) ?? "",
    },
    clinical: {
      diagnoses: text(clinical.diagnoses, MAX_TEXT) ?? "",
      medicalConditions: text(clinical.medicalConditions, MAX_TEXT) ?? "",
      currentMedications: text(clinical.currentMedications, MAX_TEXT) ?? "",
      allergies: text(clinical.allergies, MAX_TEXT) ?? "",
      medicationAllergies: text(clinical.medicationAllergies, MAX_TEXT) ?? "",
      pharmacy: text(clinical.pharmacy, 300) ?? "",
      physician: text(clinical.physician, 300) ?? "",
      physicianPhone: text(clinical.physicianPhone, 60) ?? "",
    },
    emergencyContact: contact(raw.emergencyContact),
    secondaryContact: contact(raw.secondaryContact),
    communicationPreference: text(raw.communicationPreference, 200) ?? "",
    decisionAuthority: text(raw.decisionAuthority, 200) ?? "",
  };
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
      dossierSnapshot: dossierSnapshot(raw.dossierSnapshot),
      desiredMoveIn: text(raw.desiredMoveIn, 120) ?? null,
      dossier: dossierPayload(raw.dossier),
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
