"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { SiteStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { assertCsrf, CSRF_FIELD } from "@/lib/csrf";
import { isLocale } from "@/lib/i18n";
import { AuthzError } from "@/lib/authz";
import {
  CatalogError,
  createOrganization,
  createSite,
  markSiteDuplicate,
  transitionSiteStatus,
  updateOrganization,
  updateSite,
} from "@/lib/residences";
import { facilityFact } from "@/lib/provenance";

function localeOrFr(locale: string) {
  return isLocale(locale) ? locale : "fr";
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
}

function rethrowRedirect(error: unknown): void {
  if (isRedirectError(error)) throw error;
}

function errorRedirect(locale: string, path: string, code: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`/${localeOrFr(locale)}${path}${sep}error=${encodeURIComponent(code)}`);
}

export async function createOrgAction(locale: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("ADMIN", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    const org = await createOrganization({
      role: session.user.role,
      actorUserId: session.user.id,
      name: String(formData.get("name") || ""),
      slug: String(formData.get("slug") || "") || undefined,
      legalName: String(formData.get("legalName") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      website: String(formData.get("website") || "") || null,
      isVerified: formData.get("isVerified") === "on",
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/admin/organizations/${org.id}?ok=1`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof CatalogError
        ? error.code
        : error instanceof AuthzError
          ? error.message
          : "ORG_CREATE_FAILED";
    errorRedirect(loc, "/admin/organizations/new", code);
  }
}

export async function updateOrgAction(
  locale: string,
  organizationId: string,
  formData: FormData,
) {
  const loc = localeOrFr(locale);
  const session = await requireRole("ADMIN", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await updateOrganization({
      role: session.user.role,
      actorUserId: session.user.id,
      organizationId,
      fields: {
        name: String(formData.get("name") || ""),
        legalName: String(formData.get("legalName") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        email: String(formData.get("email") || "") || null,
        website: String(formData.get("website") || "") || null,
        isActive: formData.get("isActive") === "on",
        isVerified: formData.get("isVerified") === "on",
      },
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/admin/organizations/${organizationId}?ok=1`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, `/admin/organizations/${organizationId}`, "ORG_UPDATE_FAILED");
  }
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export async function createSiteAction(locale: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("ADMIN", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  const pricingFrom = parseOptionalNumber(String(formData.get("pricingFrom") || ""));
  const pricingTo = parseOptionalNumber(String(formData.get("pricingTo") || ""));
  const servicesRaw = String(formData.get("services") || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const site = await createSite({
      role: session.user.role,
      actorUserId: session.user.id,
      fields: {
        organizationId: String(formData.get("organizationId") || ""),
        name: String(formData.get("name") || ""),
        slug: String(formData.get("slug") || "") || undefined,
        city: String(formData.get("city") || "") || null,
        region: String(formData.get("region") || "") || null,
        addressLine1: String(formData.get("addressLine1") || "") || null,
        postalCode: String(formData.get("postalCode") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        email: String(formData.get("email") || "") || null,
        website: String(formData.get("website") || "") || null,
        rlsNumber: String(formData.get("rlsNumber") || "") || null,
        descriptionEditorial: String(formData.get("descriptionEditorial") || "") || null,
        dataSource: "FACILITY",
        confidence: "MEDIUM",
        servicesFact: servicesRaw.length
          ? facilityFact(servicesRaw, { confidence: "MEDIUM" })
          : facilityFact(null),
        pricingFact:
          pricingFrom != null
            ? facilityFact(
                { monthlyFrom: pricingFrom, monthlyTo: pricingTo, currency: "CAD" },
                {
                  confidence: "MEDIUM",
                  verifiedAt: new Date().toISOString(),
                  method: "facility_admin_entry",
                },
              )
            : facilityFact(null),
        availabilityFact: facilityFact(null),
        autonomyFact: (() => {
          const a = String(formData.get("autonomy") || "").trim();
          return a ? facilityFact(a, { confidence: "MEDIUM" }) : facilityFact(null);
        })(),
        photosFact: facilityFact(null),
      },
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/admin/sites/${site.id}?ok=1`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof CatalogError
        ? error.code
        : error instanceof AuthzError
          ? error.message
          : "SITE_CREATE_FAILED";
    errorRedirect(loc, "/admin/sites/new", code);
  }
}

export async function updateSiteAction(locale: string, siteId: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("ADMIN", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));

  const pricingFrom = parseOptionalNumber(String(formData.get("pricingFrom") || ""));
  const pricingTo = parseOptionalNumber(String(formData.get("pricingTo") || ""));
  const servicesRaw = String(formData.get("services") || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await updateSite({
      role: session.user.role,
      actorUserId: session.user.id,
      siteId,
      fields: {
        name: String(formData.get("name") || ""),
        slug: String(formData.get("slug") || "") || undefined,
        city: String(formData.get("city") || "") || null,
        region: String(formData.get("region") || "") || null,
        addressLine1: String(formData.get("addressLine1") || "") || null,
        postalCode: String(formData.get("postalCode") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        email: String(formData.get("email") || "") || null,
        website: String(formData.get("website") || "") || null,
        rlsNumber: String(formData.get("rlsNumber") || "") || null,
        descriptionEditorial: String(formData.get("descriptionEditorial") || "") || null,
        servicesFact: servicesRaw.length
          ? facilityFact(servicesRaw, {
              confidence: "MEDIUM",
              verifiedAt: new Date().toISOString(),
            })
          : facilityFact(null),
        pricingFact:
          pricingFrom != null
            ? facilityFact(
                { monthlyFrom: pricingFrom, monthlyTo: pricingTo, currency: "CAD" },
                {
                  confidence: "MEDIUM",
                  verifiedAt: new Date().toISOString(),
                  method: "facility_admin_entry",
                },
              )
            : facilityFact(null),
        autonomyFact: (() => {
          const a = String(formData.get("autonomy") || "").trim();
          return a
            ? facilityFact(a, {
                confidence: "MEDIUM",
                verifiedAt: new Date().toISOString(),
              })
            : facilityFact(null);
        })(),
      },
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/admin/sites/${siteId}?ok=1`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof CatalogError ? error.code : "SITE_UPDATE_FAILED";
    errorRedirect(loc, `/admin/sites/${siteId}`, code);
  }
}

export async function transitionSiteAction(locale: string, siteId: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("ADMIN", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  const toStatus = String(formData.get("toStatus") || "") as SiteStatus;
  try {
    await transitionSiteStatus({
      role: session.user.role,
      actorUserId: session.user.id,
      siteId,
      toStatus,
      note: String(formData.get("note") || "") || null,
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/admin/sites/${siteId}?ok=status`);
  } catch (error) {
    rethrowRedirect(error);
    const code =
      error instanceof CatalogError ? error.code : "STATUS_FAILED";
    errorRedirect(loc, `/admin/sites/${siteId}`, code);
  }
}

export async function markDuplicateAction(locale: string, siteId: string, formData: FormData) {
  const loc = localeOrFr(locale);
  const session = await requireRole("ADMIN", loc);
  await assertCsrf(String(formData.get(CSRF_FIELD) || ""));
  try {
    await markSiteDuplicate({
      role: session.user.role,
      actorUserId: session.user.id,
      siteId,
      canonicalSiteId: String(formData.get("canonicalSiteId") || ""),
      ipAddress: await clientIp(),
    });
    redirect(`/${loc}/admin/sites/${siteId}?ok=duplicate`);
  } catch (error) {
    rethrowRedirect(error);
    errorRedirect(loc, `/admin/sites/${siteId}`, "DUPLICATE_FAILED");
  }
}
