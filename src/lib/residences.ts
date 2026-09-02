import {
  type Prisma,
  type Role,
  type SiteStatus,
  DataConfidence,
  DataSourceKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/authz";
import {
  assertSiteStatusTransition,
  isPublicCatalogStatus,
  legacyFlagsForStatus,
  slugify,
} from "@/lib/site-status";
import { parseProvenanced, type ProvenancedValue } from "@/lib/provenance";

export class CatalogError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "CatalogError";
    this.code = code;
    this.status = status;
  }
}

function requireAdmin(role: Role) {
  if (role !== "ADMIN") throw new AuthzError("FORBIDDEN", 403);
}

async function uniqueSiteSlug(base: string, excludeId?: string) {
  let slug = slugify(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const existing = await prisma.residenceSite.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new CatalogError("SLUG_COLLISION", 500);
}

async function recordHistory(input: {
  siteId: string;
  actorUserId?: string | null;
  action: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  note?: string;
}) {
  await prisma.siteChangeHistory.create({
    data: {
      siteId: input.siteId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      beforeJson: input.before,
      afterJson: input.after,
      note: input.note,
    },
  });
}

export async function listAdminOrganizations(input: {
  role: Role;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  requireAdmin(input.role);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const where: Prisma.ResidenceOrganizationWhereInput = input.q?.trim()
    ? {
        OR: [
          { name: { contains: input.q.trim(), mode: "insensitive" } },
          { slug: { contains: input.q.trim(), mode: "insensitive" } },
          { legalName: { contains: input.q.trim(), mode: "insensitive" } },
        ],
      }
    : {};
  const [total, items] = await Promise.all([
    prisma.residenceOrganization.count({ where }),
    prisma.residenceOrganization.findMany({
      where,
      include: { _count: { select: { sites: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize };
}

export async function listAdminSites(input: {
  role: Role;
  q?: string;
  status?: SiteStatus;
  organizationId?: string;
  page?: number;
  pageSize?: number;
}) {
  requireAdmin(input.role);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const where: Prisma.ResidenceSiteWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.q?.trim()
      ? {
          OR: [
            { name: { contains: input.q.trim(), mode: "insensitive" } },
            { city: { contains: input.q.trim(), mode: "insensitive" } },
            { slug: { contains: input.q.trim(), mode: "insensitive" } },
            { rlsNumber: { contains: input.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, items] = await Promise.all([
    prisma.residenceSite.count({ where }),
    prisma.residenceSite.findMany({
      where,
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize };
}

export async function createOrganization(input: {
  role: Role;
  actorUserId: string;
  name: string;
  slug?: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
  ipAddress?: string | null;
}) {
  requireAdmin(input.role);
  const name = input.name.trim();
  if (!name) throw new CatalogError("NAME_REQUIRED");
  const slug = slugify(input.slug || name);
  try {
    const org = await prisma.residenceOrganization.create({
      data: {
        name,
        slug,
        legalName: input.legalName?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        website: input.website?.trim() || null,
        isActive: input.isActive ?? true,
        isVerified: input.isVerified ?? false,
      },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      action: "org.created",
      entityType: "ResidenceOrganization",
      entityId: org.id,
      metadata: { slug: org.slug },
      ipAddress: input.ipAddress,
    });
    return org;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code === "P2002") throw new CatalogError("SLUG_TAKEN", 409);
    throw error;
  }
}

export async function updateOrganization(input: {
  role: Role;
  actorUserId: string;
  organizationId: string;
  fields: {
    name?: string;
    legalName?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    isActive?: boolean;
    isVerified?: boolean;
  };
  ipAddress?: string | null;
}) {
  requireAdmin(input.role);
  const before = await prisma.residenceOrganization.findUniqueOrThrow({
    where: { id: input.organizationId },
  });
  const org = await prisma.residenceOrganization.update({
    where: { id: input.organizationId },
    data: {
      name: input.fields.name?.trim() || before.name,
      legalName:
        input.fields.legalName === undefined
          ? before.legalName
          : input.fields.legalName?.trim() || null,
      phone:
        input.fields.phone === undefined ? before.phone : input.fields.phone?.trim() || null,
      email:
        input.fields.email === undefined
          ? before.email
          : input.fields.email?.trim().toLowerCase() || null,
      website:
        input.fields.website === undefined
          ? before.website
          : input.fields.website?.trim() || null,
      isActive: input.fields.isActive ?? before.isActive,
      isVerified: input.fields.isVerified ?? before.isVerified,
    },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "org.updated",
    entityType: "ResidenceOrganization",
    entityId: org.id,
    ipAddress: input.ipAddress,
  });
  return org;
}

export type SiteWriteFields = {
  organizationId: string;
  name: string;
  slug?: string;
  city?: string | null;
  region?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rlsNumber?: string | null;
  descriptionEditorial?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  officialCategories?: string[] | null;
  dataSource?: DataSourceKind;
  confidence?: DataConfidence;
  verificationMethod?: string | null;
  servicesFact?: ProvenancedValue | null;
  unitsFact?: ProvenancedValue | null;
  pricingFact?: ProvenancedValue | null;
  availabilityFact?: ProvenancedValue | null;
  autonomyFact?: ProvenancedValue | null;
  photosFact?: ProvenancedValue | null;
};

function factJson(fact: ProvenancedValue | null | undefined): Prisma.InputJsonValue | undefined {
  if (fact === undefined) return undefined;
  if (fact === null) return { value: null, source: "UNKNOWN", confidence: "UNKNOWN" };
  return fact as unknown as Prisma.InputJsonValue;
}

export async function createSite(input: {
  role: Role;
  actorUserId: string;
  fields: SiteWriteFields;
  ipAddress?: string | null;
}) {
  requireAdmin(input.role);
  const name = input.fields.name.trim();
  if (!name) throw new CatalogError("NAME_REQUIRED");
  await prisma.residenceOrganization.findUniqueOrThrow({
    where: { id: input.fields.organizationId },
  });

  if (input.fields.rlsNumber?.trim()) {
    const dup = await prisma.residenceSite.findFirst({
      where: { rlsNumber: input.fields.rlsNumber.trim() },
    });
    if (dup) throw new CatalogError("DUPLICATE_RLS", 409);
  }

  const slug = await uniqueSiteSlug(input.fields.slug || name);
  const flags = legacyFlagsForStatus("DRAFT");

  const site = await prisma.residenceSite.create({
    data: {
      organizationId: input.fields.organizationId,
      name,
      slug,
      status: "DRAFT",
      ...flags,
      city: input.fields.city?.trim() || null,
      region: input.fields.region?.trim() || null,
      addressLine1: input.fields.addressLine1?.trim() || null,
      addressLine2: input.fields.addressLine2?.trim() || null,
      postalCode: input.fields.postalCode?.trim() || null,
      country: input.fields.country?.trim() || "CA",
      phone: input.fields.phone?.trim() || null,
      email: input.fields.email?.trim().toLowerCase() || null,
      website: input.fields.website?.trim() || null,
      rlsNumber: input.fields.rlsNumber?.trim() || null,
      descriptionEditorial: input.fields.descriptionEditorial?.trim() || null,
      latitude: input.fields.latitude ?? null,
      longitude: input.fields.longitude ?? null,
      officialCategories: input.fields.officialCategories ?? undefined,
      dataSource: input.fields.dataSource ?? DataSourceKind.UNKNOWN,
      confidence: input.fields.confidence ?? DataConfidence.UNKNOWN,
      verificationMethod: input.fields.verificationMethod ?? null,
      servicesFact: factJson(input.fields.servicesFact),
      unitsFact: factJson(input.fields.unitsFact),
      pricingFact: factJson(input.fields.pricingFact),
      availabilityFact: factJson(input.fields.availabilityFact),
      autonomyFact: factJson(input.fields.autonomyFact),
      photosFact: factJson(input.fields.photosFact),
    },
  });

  await recordHistory({
    siteId: site.id,
    actorUserId: input.actorUserId,
    action: "site.created",
    after: { name: site.name, slug: site.slug, status: site.status },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "site.created",
    entityType: "ResidenceSite",
    entityId: site.id,
    metadata: { slug: site.slug },
    ipAddress: input.ipAddress,
  });
  return site;
}

export async function updateSite(input: {
  role: Role;
  actorUserId: string;
  siteId: string;
  fields: Partial<SiteWriteFields>;
  ipAddress?: string | null;
}) {
  requireAdmin(input.role);
  const before = await prisma.residenceSite.findUniqueOrThrow({ where: { id: input.siteId } });

  if (input.fields.rlsNumber?.trim()) {
    const dup = await prisma.residenceSite.findFirst({
      where: {
        rlsNumber: input.fields.rlsNumber.trim(),
        id: { not: input.siteId },
      },
    });
    if (dup) throw new CatalogError("DUPLICATE_RLS", 409);
  }

  let slug = before.slug;
  if (input.fields.slug && slugify(input.fields.slug) !== before.slug) {
    const nextSlug = await uniqueSiteSlug(input.fields.slug, input.siteId);
    await prisma.siteSlugRedirect.upsert({
      where: { fromSlug: before.slug },
      update: { siteId: input.siteId },
      create: { fromSlug: before.slug, siteId: input.siteId },
    });
    slug = nextSlug;
  }

  const site = await prisma.residenceSite.update({
    where: { id: input.siteId },
    data: {
      name: input.fields.name?.trim() || before.name,
      slug,
      organizationId: input.fields.organizationId || before.organizationId,
      city:
        input.fields.city === undefined ? before.city : input.fields.city?.trim() || null,
      region:
        input.fields.region === undefined ? before.region : input.fields.region?.trim() || null,
      addressLine1:
        input.fields.addressLine1 === undefined
          ? before.addressLine1
          : input.fields.addressLine1?.trim() || null,
      addressLine2:
        input.fields.addressLine2 === undefined
          ? before.addressLine2
          : input.fields.addressLine2?.trim() || null,
      postalCode:
        input.fields.postalCode === undefined
          ? before.postalCode
          : input.fields.postalCode?.trim() || null,
      country:
        input.fields.country === undefined
          ? before.country
          : input.fields.country?.trim() || "CA",
      phone:
        input.fields.phone === undefined ? before.phone : input.fields.phone?.trim() || null,
      email:
        input.fields.email === undefined
          ? before.email
          : input.fields.email?.trim().toLowerCase() || null,
      website:
        input.fields.website === undefined
          ? before.website
          : input.fields.website?.trim() || null,
      rlsNumber:
        input.fields.rlsNumber === undefined
          ? before.rlsNumber
          : input.fields.rlsNumber?.trim() || null,
      descriptionEditorial:
        input.fields.descriptionEditorial === undefined
          ? before.descriptionEditorial
          : input.fields.descriptionEditorial?.trim() || null,
      latitude:
        input.fields.latitude === undefined ? before.latitude : input.fields.latitude,
      longitude:
        input.fields.longitude === undefined ? before.longitude : input.fields.longitude,
      officialCategories:
        input.fields.officialCategories === undefined
          ? undefined
          : (input.fields.officialCategories ?? []),
      dataSource: input.fields.dataSource ?? before.dataSource,
      confidence: input.fields.confidence ?? before.confidence,
      verificationMethod:
        input.fields.verificationMethod === undefined
          ? before.verificationMethod
          : input.fields.verificationMethod,
      servicesFact: factJson(input.fields.servicesFact) ?? undefined,
      unitsFact: factJson(input.fields.unitsFact) ?? undefined,
      pricingFact: factJson(input.fields.pricingFact) ?? undefined,
      availabilityFact: factJson(input.fields.availabilityFact) ?? undefined,
      autonomyFact: factJson(input.fields.autonomyFact) ?? undefined,
      photosFact: factJson(input.fields.photosFact) ?? undefined,
    },
  });

  await recordHistory({
    siteId: site.id,
    actorUserId: input.actorUserId,
    action: "site.updated",
    before: { name: before.name, slug: before.slug },
    after: { name: site.name, slug: site.slug },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "site.updated",
    entityType: "ResidenceSite",
    entityId: site.id,
    ipAddress: input.ipAddress,
  });
  return site;
}

export async function transitionSiteStatus(input: {
  role: Role;
  actorUserId: string;
  siteId: string;
  toStatus: SiteStatus;
  note?: string | null;
  ipAddress?: string | null;
}) {
  requireAdmin(input.role);
  const before = await prisma.residenceSite.findUniqueOrThrow({
    where: { id: input.siteId },
    include: { organization: true },
  });
  try {
    assertSiteStatusTransition(before.status, input.toStatus);
  } catch {
    throw new CatalogError("INVALID_SITE_TRANSITION", 409);
  }

  if (input.toStatus === "ACTIVE") {
    if (!before.organization.isActive || !before.organization.isVerified) {
      throw new CatalogError("ORG_NOT_READY", 422);
    }
    if (before.status !== "VERIFIED" && before.status !== "SUSPENDED") {
      // ACTIVE only from VERIFIED or SUSPENDED per matrix; already asserted
    }
  }

  const flags = legacyFlagsForStatus(input.toStatus);
  const site = await prisma.residenceSite.update({
    where: { id: input.siteId },
    data: {
      status: input.toStatus,
      ...flags,
      verifiedAt:
        input.toStatus === "VERIFIED" || input.toStatus === "ACTIVE"
          ? before.verifiedAt ?? new Date()
          : before.verifiedAt,
      publishedAt:
        input.toStatus === "ACTIVE" ? before.publishedAt ?? new Date() : before.publishedAt,
      verificationMethod:
        input.toStatus === "VERIFIED" || input.toStatus === "ACTIVE"
          ? input.note || before.verificationMethod || "admin_verification"
          : before.verificationMethod,
    },
  });

  await recordHistory({
    siteId: site.id,
    actorUserId: input.actorUserId,
    action: `site.status_${input.toStatus.toLowerCase()}`,
    before: { status: before.status },
    after: { status: site.status },
    note: input.note || undefined,
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "site.status_changed",
    entityType: "ResidenceSite",
    entityId: site.id,
    metadata: { from: before.status, to: input.toStatus },
    ipAddress: input.ipAddress,
  });
  return site;
}

export async function markSiteDuplicate(input: {
  role: Role;
  actorUserId: string;
  siteId: string;
  canonicalSiteId: string;
  ipAddress?: string | null;
}) {
  requireAdmin(input.role);
  if (input.siteId === input.canonicalSiteId) {
    throw new CatalogError("INVALID_DUPLICATE", 400);
  }
  await prisma.residenceSite.findUniqueOrThrow({ where: { id: input.canonicalSiteId } });
  const site = await prisma.residenceSite.update({
    where: { id: input.siteId },
    data: {
      duplicateOfSiteId: input.canonicalSiteId,
      status: "ARCHIVED",
      ...legacyFlagsForStatus("ARCHIVED"),
    },
  });
  await recordHistory({
    siteId: site.id,
    actorUserId: input.actorUserId,
    action: "site.marked_duplicate",
    after: { duplicateOfSiteId: input.canonicalSiteId },
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "site.marked_duplicate",
    entityType: "ResidenceSite",
    entityId: site.id,
    metadata: { canonicalSiteId: input.canonicalSiteId },
    ipAddress: input.ipAddress,
  });
  return site;
}

export async function getAdminSite(role: Role, siteId: string) {
  requireAdmin(role);
  return prisma.residenceSite.findUniqueOrThrow({
    where: { id: siteId },
    include: {
      organization: true,
      changeHistory: { orderBy: { createdAt: "desc" }, take: 50 },
      slugRedirects: true,
    },
  });
}

export async function getAdminOrganization(role: Role, organizationId: string) {
  requireAdmin(role);
  return prisma.residenceOrganization.findUniqueOrThrow({
    where: { id: organizationId },
    include: {
      sites: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, status: true, city: true } },
      _count: { select: { sites: true } },
    },
  });
}

/** Public catalog — ACTIVE sites only. */
export async function listPublicSites(input: {
  q?: string;
  region?: string;
  city?: string;
  /** Budget filter only applied when pricing is confirmed. */
  maxBudget?: number;
  autonomy?: string;
  service?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 12));

  const where: Prisma.ResidenceSiteWhereInput = {
    status: "ACTIVE",
    duplicateOfSiteId: null,
    organization: { isActive: true, isVerified: true },
    ...(input.region?.trim()
      ? { region: { equals: input.region.trim(), mode: "insensitive" } }
      : {}),
    ...(input.city?.trim()
      ? { city: { equals: input.city.trim(), mode: "insensitive" } }
      : {}),
    ...(input.q?.trim()
      ? {
          OR: [
            { name: { contains: input.q.trim(), mode: "insensitive" } },
            { city: { contains: input.q.trim(), mode: "insensitive" } },
            { region: { contains: input.q.trim(), mode: "insensitive" } },
            { descriptionEditorial: { contains: input.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rawItems] = await Promise.all([
    prisma.residenceSite.count({ where }),
    prisma.residenceSite.findMany({
      where,
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ city: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize * 3, // over-fetch when post-filtering budget/services
    }),
  ]);

  let items = rawItems;
  if (input.maxBudget != null && Number.isFinite(input.maxBudget)) {
    items = items.filter((s) => {
      const pricing = parseProvenanced<{ monthlyFrom?: number; monthlyTo?: number }>(
        s.pricingFact,
      );
      if (!pricing || pricing.value == null) return false;
      if (pricing.confidence === "UNKNOWN" || pricing.confidence === "LOW") return false;
      if (!pricing.verifiedAt && pricing.source === "UNKNOWN") return false;
      const from = pricing.value.monthlyFrom;
      if (from == null) return false;
      return from <= input.maxBudget!;
    });
  }
  if (input.autonomy?.trim()) {
    const needle = input.autonomy.trim().toLowerCase();
    items = items.filter((s) => {
      const autonomy = parseProvenanced<string | string[]>(s.autonomyFact);
      if (!autonomy || autonomy.value == null) return false;
      if (autonomy.confidence === "UNKNOWN" || autonomy.confidence === "LOW") return false;
      const val = autonomy.value;
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(needle));
      return String(val).toLowerCase().includes(needle);
    });
  }
  if (input.service?.trim()) {
    const needle = input.service.trim().toLowerCase();
    items = items.filter((s) => {
      const services = parseProvenanced<string[]>(s.servicesFact);
      if (!services || !Array.isArray(services.value)) return false;
      if (services.confidence === "UNKNOWN" || services.confidence === "LOW") return false;
      return services.value.some((v) => String(v).toLowerCase().includes(needle));
    });
  }

  const pageItems = items.slice(0, pageSize);
  return {
    items: pageItems,
    total: input.maxBudget || input.autonomy || input.service ? items.length : total,
    page,
    pageSize,
  };
}

export async function getPublicSiteBySlug(slug: string) {
  const redirect = await prisma.siteSlugRedirect.findUnique({
    where: { fromSlug: slug },
  });
  const resolved = redirect
    ? await prisma.residenceSite.findUnique({
        where: { id: redirect.siteId },
        include: { organization: true },
      })
    : await prisma.residenceSite.findUnique({
        where: { slug },
        include: { organization: true },
      });

  if (!resolved) return { site: null as null, redirectSlug: null as string | null };
  if (!isPublicCatalogStatus(resolved.status)) {
    return { site: null as null, redirectSlug: null as string | null };
  }
  if (!resolved.organization.isActive || !resolved.organization.isVerified) {
    return { site: null as null, redirectSlug: null as string | null };
  }
  return {
    site: resolved,
    redirectSlug: redirect && redirect.fromSlug !== resolved.slug ? resolved.slug : null,
  };
}

export async function findDuplicateCandidates(role: Role, siteId: string) {
  requireAdmin(role);
  const site = await prisma.residenceSite.findUniqueOrThrow({ where: { id: siteId } });
  const byRls = site.rlsNumber
    ? await prisma.residenceSite.findMany({
        where: { rlsNumber: site.rlsNumber, id: { not: siteId } },
      })
    : [];
  const byAddress =
    site.addressLine1 && site.city
      ? await prisma.residenceSite.findMany({
          where: {
            id: { not: siteId },
            city: { equals: site.city, mode: "insensitive" },
            addressLine1: { equals: site.addressLine1, mode: "insensitive" },
          },
        })
      : [];
  const map = new Map<string, (typeof byRls)[0]>();
  for (const s of [...byRls, ...byAddress]) map.set(s.id, s);
  return [...map.values()];
}
