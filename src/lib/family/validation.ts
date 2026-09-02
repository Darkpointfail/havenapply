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
    if (email && !isValidEmail(email)) return "Invalid email address.";
  }
  if ("phone" in patch && patch.phone != null && !isValidPhone(String(patch.phone))) {
    return "Invalid phone number.";
  }
  if ("firstName" in patch && !clampString(patch.firstName, 80)) {
    return "First name is required.";
  }
  if ("lastName" in patch && !clampString(patch.lastName, 80)) {
    return "Last name is required.";
  }
  return null;
}

export function validateSeniorPatch(patch: Record<string, unknown>): string | null {
  if ("email" in patch && patch.email != null && String(patch.email) && !isValidEmail(String(patch.email))) {
    return "Invalid senior email address.";
  }
  if ("phone" in patch && patch.phone != null && !isValidPhone(String(patch.phone))) {
    return "Invalid senior phone number.";
  }
  if ("zip" in patch && patch.zip != null && !isValidPostalCode(String(patch.zip))) {
    return "Invalid postal code.";
  }
  if ("dateOfBirth" in patch && patch.dateOfBirth != null && !isValidDateISO(String(patch.dateOfBirth))) {
    return "Invalid date of birth.";
  }
  if ("budgetMin" in patch || "budgetMax" in patch) {
    const min = patch.budgetMin != null && String(patch.budgetMin) !== "" ? Number(patch.budgetMin) : null;
    const max = patch.budgetMax != null && String(patch.budgetMax) !== "" ? Number(patch.budgetMax) : null;
    if (min != null && Number.isNaN(min)) return "Invalid minimum budget.";
    if (max != null && Number.isNaN(max)) return "Invalid maximum budget.";
    if (min != null && max != null && min > max) return "Minimum budget cannot exceed maximum.";
  }
  return null;
}

export function validateUploadMeta(input: {
  mimeType: string;
  sizeBytes: number;
  originalFilename: string;
}): string | null {
  if (!input.originalFilename?.trim()) return "Filename is missing.";
  if (!ALLOWED_DOC_MIME.has(input.mimeType)) {
    return "File type not accepted. Use PDF, JPEG, PNG, or WebP.";
  }
  if (input.sizeBytes <= 0) return "Empty file.";
  if (input.sizeBytes > MAX_DOC_UPLOAD_BYTES) {
    return "File exceeds the 10 MB size limit.";
  }
  return null;
}

export function validateSeniorPatchSafe(patch: Record<string, unknown>): string | null {
  return validateSeniorPatch(patch);
}
