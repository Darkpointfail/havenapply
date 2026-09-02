"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireRole } from "@/lib/guards";
import { assertCsrf, CSRF_FIELD } from "@/lib/csrf";
import { DocumentError, softDeleteDocument, uploadApplicationDocument } from "@/lib/documents";
import { AuthzError } from "@/lib/authz";
import { isLocale } from "@/lib/i18n";

function rethrowRedirect(error: unknown) {
  if (isRedirectError(error)) throw error;
}

export async function uploadDocumentAction(
  locale: string,
  applicationId: string,
  formData: FormData,
) {
  const loc = isLocale(locale) ? locale : "fr";
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      redirect(`/${loc}/family/applications/${applicationId}?error=INVALID_PAYLOAD`);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const doc = await uploadApplicationDocument({
      userId: session.user.id,
      role: session.user.role,
      applicationId,
      fileName: file.name || "document",
      bytes,
      awaitScan: true,
    });
    redirect(
      `/${loc}/family/applications/${applicationId}?uploaded=${encodeURIComponent(doc.originalFileName)}`,
    );
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthzError || error instanceof DocumentError) {
      redirect(
        `/${loc}/family/applications/${applicationId}?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
}

export async function deleteDocumentAction(
  locale: string,
  applicationId: string,
  documentId: string,
  formData: FormData,
) {
  const loc = isLocale(locale) ? locale : "fr";
  const session = await requireRole("FAMILY", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  try {
    await softDeleteDocument({
      userId: session.user.id,
      role: session.user.role,
      documentId,
    });
    redirect(`/${loc}/family/applications/${applicationId}`);
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthzError) {
      redirect(`/${loc}/family/applications/${applicationId}?error=${error.message}`);
    }
    throw error;
  }
}
