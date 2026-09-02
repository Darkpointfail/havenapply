"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireRole } from "@/lib/guards";
import { assertCsrf, CSRF_FIELD } from "@/lib/csrf";
import {
  ApplicationError,
  createDraftApplication,
  submitApplication,
  updateDraftApplication,
} from "@/lib/applications";
import { AuthzError } from "@/lib/authz";
import { isLocale } from "@/lib/i18n";

function localeOrFr(locale: string) {
  return isLocale(locale) ? locale : "fr";
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
}

function errorRedirect(locale: string, path: string, code: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`/${localeOrFr(locale)}${path}${sep}error=${encodeURIComponent(code)}`);
}

function rethrowRedirect(error: unknown): void {
  if (isRedirectError(error)) throw error;
}

export async function createDraftAction(locale: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  try {
    const app = await createDraftApplication({
      userId: session.user.id,
      role: session.user.role,
      siteId: String(formData.get("siteId") || ""),
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/applications/${app.id}/edit`);
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthzError || error instanceof ApplicationError) {
      errorRedirect(loc, "/family/applications/new", error.message);
    }
    throw error;
  }
}

export async function updateDraftResidentAction(
  locale: string,
  applicationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  try {
    await updateDraftApplication({
      userId: session.user.id,
      role: session.user.role,
      applicationId,
      fields: {
        residentPreferredName: String(formData.get("residentPreferredName") || ""),
        residentBirthYear: Number(formData.get("residentBirthYear") || NaN),
        preferredMoveMonth: String(formData.get("preferredMoveMonth") || ""),
        urgencyNote: String(formData.get("urgencyNote") || ""),
        draftStep: 3,
      },
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/applications/${applicationId}/edit?step=contact`);
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthzError || error instanceof ApplicationError) {
      errorRedirect(loc, `/family/applications/${applicationId}/edit`, error.message);
    }
    throw error;
  }
}

export async function updateDraftContactAction(
  locale: string,
  applicationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  try {
    await updateDraftApplication({
      userId: session.user.id,
      role: session.user.role,
      applicationId,
      fields: {
        contactName: String(formData.get("contactName") || ""),
        contactEmail: String(formData.get("contactEmail") || ""),
        contactPhone: String(formData.get("contactPhone") || ""),
        draftStep: 4,
      },
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/applications/${applicationId}/review`);
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthzError || error instanceof ApplicationError) {
      errorRedirect(
        loc,
        `/family/applications/${applicationId}/edit?step=contact`,
        error.message,
      );
    }
    throw error;
  }
}

export async function submitApplicationAction(
  locale: string,
  applicationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  const idempotencyKey =
    String(formData.get("idempotencyKey") || "") || randomBytes(16).toString("hex");

  try {
    const app = await submitApplication({
      userId: session.user.id,
      role: session.user.role,
      applicationId,
      idempotencyKey,
      consentPrivacy: formData.get("consentPrivacy") === "on",
      consentShareWithSite: formData.get("consentShareWithSite") === "on",
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/family/applications/${app.id}/confirmation`);
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthzError || error instanceof ApplicationError) {
      errorRedirect(loc, `/family/applications/${applicationId}/review`, error.message);
    }
    throw error;
  }
}
