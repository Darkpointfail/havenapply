import { z } from "zod";

/**
 * Shared application form validation (client + authoritative server).
 *
 * Documented fields (minimized PII):
 * - residentPreferredName: how the resident prefers to be called (not full legal identity)
 * - residentBirthYear: year only (not full DOB)
 * - contact*: family contact for coordination
 * - preferredMoveMonth: optional YYYY-MM window
 * - urgencyNote: short operational note — never medical content
 * - consentPrivacy: acknowledge privacy notice
 * - consentShareWithSite: authorize sharing this application with the target site
 */

const currentYear = new Date().getFullYear();

export const preferredMoveMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "INVALID_MOVE_MONTH")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const applicationDraftFieldsSchema = z.object({
  residentPreferredName: z
    .string()
    .trim()
    .min(1, "RESIDENT_NAME_REQUIRED")
    .max(80, "RESIDENT_NAME_TOO_LONG")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  residentBirthYear: z.coerce
    .number()
    .int()
    .min(1900, "BIRTH_YEAR_INVALID")
    .max(currentYear, "BIRTH_YEAR_INVALID")
    .optional()
    .or(z.nan().transform(() => undefined)),
  contactName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contactEmail: z
    .string()
    .trim()
    .email("CONTACT_EMAIL_INVALID")
    .max(254)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contactPhone: z
    .string()
    .trim()
    .min(7)
    .max(32)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  preferredMoveMonth: preferredMoveMonthSchema,
  urgencyNote: z
    .string()
    .trim()
    .max(500, "URGENCY_NOTE_TOO_LONG")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  draftStep: z.coerce.number().int().min(1).max(4).optional(),
});

export type ApplicationDraftFields = z.infer<typeof applicationDraftFieldsSchema>;

/** Fields required before a DRAFT can become SUBMITTED. */
export const applicationSubmitPayloadSchema = z.object({
  residentPreferredName: z.string().trim().min(1, "RESIDENT_NAME_REQUIRED").max(80),
  residentBirthYear: z.coerce
    .number()
    .int()
    .min(1900, "BIRTH_YEAR_INVALID")
    .max(currentYear, "BIRTH_YEAR_INVALID"),
  contactName: z.string().trim().min(1, "CONTACT_NAME_REQUIRED").max(80),
  contactEmail: z.string().trim().email("CONTACT_EMAIL_INVALID").max(254),
  contactPhone: z.string().trim().min(7, "CONTACT_PHONE_REQUIRED").max(32),
  preferredMoveMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "INVALID_MOVE_MONTH")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  urgencyNote: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  consentPrivacy: z.literal(true, {
    errorMap: () => ({ message: "CONSENT_PRIVACY_REQUIRED" }),
  }),
  consentShareWithSite: z.literal(true, {
    errorMap: () => ({ message: "CONSENT_SHARE_REQUIRED" }),
  }),
});

export type ApplicationSubmitPayload = z.infer<typeof applicationSubmitPayloadSchema>;

export const createDraftSchema = z.object({
  siteId: z.string().min(1, "SITE_REQUIRED"),
  familyProfileId: z.string().min(1).optional(),
});

export function computeDraftProgress(input: {
  siteId?: string | null;
  residentPreferredName?: string | null;
  residentBirthYear?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  consentPrivacy?: boolean;
  consentShareWithSite?: boolean;
}): { step: number; percent: number; complete: boolean } {
  const siteOk = Boolean(input.siteId);
  const residentOk = Boolean(input.residentPreferredName && input.residentBirthYear);
  const contactOk = Boolean(input.contactName && input.contactEmail && input.contactPhone);
  const consentOk = Boolean(input.consentPrivacy && input.consentShareWithSite);
  const checks = [siteOk, residentOk, contactOk, consentOk];
  const done = checks.filter(Boolean).length;
  return {
    step: Math.min(4, done + 1),
    percent: Math.round((done / checks.length) * 100),
    complete: done === checks.length,
  };
}
