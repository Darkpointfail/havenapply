/** Shared validation for B2C family API payloads. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_CA_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const PHONE_RE = /^[\d\s().+-]{7,20}$/;

export const MAX_DOC_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string) {
  if (!value.trim()) return true;
  return PHONE_RE.test(value.trim());
}

export function isValidPostalCode(value: string) {
  if (!value.trim()) return true;
  return POSTAL_CA_RE.test(value.trim());
}

export function isValidDateISO(value: string) {
  if (!value.trim()) return true;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function validateApplicantPatch(patch: Record<string, unknown>): string | null {
  if ("email" in patch && patch.email != null) {
    const email = String(patch.email);
    if (email && !isValidEmail(email)) return "Adresse courriel invalide.";
  }
  if ("phone" in patch && patch.phone != null && !isValidPhone(String(patch.phone))) {
    return "Numéro de téléphone invalide.";
  }
  if ("firstName" in patch && !clampString(patch.firstName, 80)) {
    return "Le prénom est obligatoire.";
  }
  if ("lastName" in patch && !clampString(patch.lastName, 80)) {
    return "Le nom est obligatoire.";
  }
  return null;
}

export function validateSeniorPatch(patch: Record<string, unknown>): string | null {
  if ("email" in patch && patch.email != null && String(patch.email) && !isValidEmail(String(patch.email))) {
    return "Adresse courriel de la personne aînée invalide.";
  }
  if ("phone" in patch && patch.phone != null && !isValidPhone(String(patch.phone))) {
    return "Téléphone de la personne aînée invalide.";
  }
  if ("zip" in patch && patch.zip != null && !isValidPostalCode(String(patch.zip))) {
    return "Code postal invalide.";
  }
  if ("dateOfBirth" in patch && patch.dateOfBirth != null && !isValidDateISO(String(patch.dateOfBirth))) {
    return "Date de naissance invalide.";
  }
  if ("budgetMin" in patch || "budgetMax" in patch) {
    const min = patch.budgetMin != null && String(patch.budgetMin) !== "" ? Number(patch.budgetMin) : null;
    const max = patch.budgetMax != null && String(patch.budgetMax) !== "" ? Number(patch.budgetMax) : null;
    if (min != null && Number.isNaN(min)) return "Budget minimum invalide.";
    if (max != null && Number.isNaN(max)) return "Budget maximum invalide.";
    if (min != null && max != null && min > max) return "Le budget minimum ne peut pas dépasser le maximum.";
  }
  return null;
}

export function validateUploadMeta(input: {
  mimeType: string;
  sizeBytes: number;
  originalFilename: string;
}): string | null {
  if (!input.originalFilename?.trim()) return "Nom de fichier manquant.";
  if (!ALLOWED_DOC_MIME.has(input.mimeType)) {
    return "Type de fichier non accepté. Utilisez PDF, JPEG, PNG ou WebP.";
  }
  if (input.sizeBytes <= 0) return "Fichier vide.";
  if (input.sizeBytes > MAX_DOC_UPLOAD_BYTES) {
    return "Le fichier dépasse la taille maximale de 10 Mo.";
  }
  return null;
}

export function validateSeniorPatchSafe(patch: Record<string, unknown>): string | null {
  return validateSeniorPatch(patch);
}
