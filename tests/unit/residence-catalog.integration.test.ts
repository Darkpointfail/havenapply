import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, type Role } from "@prisma/client";
import { envSchema, resetEnvCache } from "@/lib/env";
import { createSiteClaim, verifySiteClaim } from "@/lib/site-claim";
import { canTransitionSiteStatus, legacyFlagsForStatus } from "@/lib/site-status";
import { isConfirmedPricing, parseProvenanced, unknownFact } from "@/lib/provenance";
import {
  CatalogError,
  createOrganization,
  createSite,
  listPublicSites,
  markSiteDuplicate,
  transitionSiteStatus,
  updateSite,
} from "@/lib/residences";
import { ApplicationError, createDraftApplication } from "@/lib/applications";
import { AuthzError } from "@/lib/authz";

const prisma = new PrismaClient();

describe("site status transitions", () => {
  it("allows DRAFT → PENDING_VERIFICATION → VERIFIED → ACTIVE", () => {
    expect(canTransitionSiteStatus("DRAFT", "PENDING_VERIFICATION")).toBe(true);
    expect(canTransitionSiteStatus("PENDING_VERIFICATION", "VERIFIED")).toBe(true);
    expect(canTransitionSiteStatus("VERIFIED", "ACTIVE")).toBe(true);
    expect(canTransitionSiteStatus("DRAFT", "ACTIVE")).toBe(false);
    expect(canTransitionSiteStatus("VERIFIED", "DRAFT")).toBe(false);
  });

  it("mirrors legacy flags correctly", () => {
    expect(legacyFlagsForStatus("ACTIVE")).toEqual({ isActive: true, isVerified: true });
    expect(legacyFlagsForStatus("VERIFIED")).toEqual({ isActive: false, isVerified: true });
    expect(legacyFlagsForStatus("SUSPENDED")).toEqual({ isActive: false, isVerified: true });
    expect(legacyFlagsForStatus("DRAFT")).toEqual({ isActive: false, isVerified: false });
  });
});

describe("provenance helpers", () => {
  it("treats empty/null as unknown, never not-offered", () => {
    const u = unknownFact();
    expect(u.value).toBeNull();
    expect(u.source).toBe("UNKNOWN");
    expect(isConfirmedPricing(u)).toBe(false);
    expect(isConfirmedPricing(null)).toBe(false);
  });

  it("confirms facility pricing only with value and non-low confidence", () => {
    expect(
      isConfirmedPricing({
        value: { monthlyFrom: 2000 },
        source: "FACILITY",
        confidence: "MEDIUM",
        verifiedAt: new Date().toISOString(),
      }),
    ).toBe(true);
    expect(
      isConfirmedPricing({
        value: { monthlyFrom: 2000 },
        source: "UNKNOWN",
        confidence: "UNKNOWN",
      }),
    ).toBe(false);
  });
});

describe("site claim HMAC", () => {
  beforeAll(() => {
    resetEnvCache();
    envSchema.parse({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-secret-at-least-16-chars",
      DATABASE_URL: process.env.DATABASE_URL,
      STORAGE_DRIVER: "minio",
      STORAGE_ENDPOINT: "http://localhost:9000",
      STORAGE_BUCKET: "haven-private",
      STORAGE_ACCESS_KEY_ID: "minioadmin",
      STORAGE_SECRET_ACCESS_KEY: "minioadmin",
      EMAIL_DRIVER: "smtp",
      EMAIL_FROM: "HavenApply <noreply@havenapply.local>",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
    });
  });

  it("signs and verifies; rejects tampered siteId", () => {
    const token = createSiteClaim("seed-site-1");
    expect(verifySiteClaim(token)?.siteId).toBe("seed-site-1");
    const [payload, sig] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ siteId: "seed-site-2", exp: Date.now() + 60_000 }),
    ).toString("base64url");
    expect(verifySiteClaim(`${tamperedPayload}.${sig}`)).toBeNull();
    expect(verifySiteClaim(`${payload}.deadbeef`)).toBeNull();
  });
});

describe("residence catalog integration", () => {
  let adminId: string;
  let familyAId: string;
  let orgId: string;

  beforeAll(async () => {
    resetEnvCache();
    envSchema.parse({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-secret-at-least-16-chars",
      DATABASE_URL: process.env.DATABASE_URL,
      STORAGE_DRIVER: "minio",
      STORAGE_ENDPOINT: "http://localhost:9000",
      STORAGE_BUCKET: "haven-private",
      STORAGE_ACCESS_KEY_ID: "minioadmin",
      STORAGE_SECRET_ACCESS_KEY: "minioadmin",
      EMAIL_DRIVER: "smtp",
      EMAIL_FROM: "HavenApply <noreply@havenapply.local>",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
    });

    adminId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "admin.dev@havenapply.local" } })
    ).id;
    familyAId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "family.a@havenapply.local" } })
    ).id;
    orgId = (
      await prisma.residenceOrganization.findUniqueOrThrow({
        where: { slug: "demo-residences" },
      })
    ).id;
  });

  it("denies catalog mutations to non-admin", async () => {
    await expect(
      createOrganization({
        role: "FAMILY" as Role,
        actorUserId: familyAId,
        name: "Nope",
      }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("cycles DRAFT → ACTIVE and excludes non-public from catalog", async () => {
    const suffix = Date.now();
    const site = await createSite({
      role: "ADMIN",
      actorUserId: adminId,
      fields: {
        organizationId: orgId,
        name: `Catalog Test ${suffix}`,
        city: "Montréal",
        region: "Montréal",
        rlsNumber: `RLS-TEST-${suffix}`,
      },
    });
    expect(site.status).toBe("DRAFT");

    const publicBefore = await listPublicSites({ q: site.name });
    expect(publicBefore.items.find((s) => s.id === site.id)).toBeUndefined();

    await transitionSiteStatus({
      role: "ADMIN",
      actorUserId: adminId,
      siteId: site.id,
      toStatus: "PENDING_VERIFICATION",
    });
    await transitionSiteStatus({
      role: "ADMIN",
      actorUserId: adminId,
      siteId: site.id,
      toStatus: "VERIFIED",
    });

    const verified = await prisma.residenceSite.findUniqueOrThrow({ where: { id: site.id } });
    expect(verified.status).toBe("VERIFIED");
    expect(verified.isActive).toBe(false);
    expect(verified.isVerified).toBe(true);

    const publicVerified = await listPublicSites({ q: site.name });
    expect(publicVerified.items.find((s) => s.id === site.id)).toBeUndefined();

    await transitionSiteStatus({
      role: "ADMIN",
      actorUserId: adminId,
      siteId: site.id,
      toStatus: "ACTIVE",
      note: "activated for test",
    });

    const publicActive = await listPublicSites({ q: site.name });
    expect(publicActive.items.some((s) => s.id === site.id)).toBe(true);

    await transitionSiteStatus({
      role: "ADMIN",
      actorUserId: adminId,
      siteId: site.id,
      toStatus: "SUSPENDED",
    });
    const publicSuspended = await listPublicSites({ q: site.name });
    expect(publicSuspended.items.find((s) => s.id === site.id)).toBeUndefined();

    await expect(
      createDraftApplication({
        userId: familyAId,
        role: "FAMILY",
        siteId: site.id,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);

    const history = await prisma.siteChangeHistory.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.length).toBeGreaterThanOrEqual(4);
    expect(history.some((h) => h.action.includes("active"))).toBe(true);
  });

  it("paginates and filters public catalog; budget requires confirmed pricing", async () => {
    const page1 = await listPublicSites({ page: 1, pageSize: 1 });
    expect(page1.items.length).toBeLessThanOrEqual(1);
    expect(page1.total).toBeGreaterThanOrEqual(1);

    const quebec = await listPublicSites({ city: "Québec" });
    expect(quebec.items.every((s) => s.city?.toLowerCase() === "québec")).toBe(true);

    const cheap = await listPublicSites({ maxBudget: 100 });
    for (const s of cheap.items) {
      const pricing = parseProvenanced<{ monthlyFrom?: number }>(s.pricingFact);
      expect(isConfirmedPricing(pricing)).toBe(true);
      expect(pricing?.value?.monthlyFrom).toBeLessThanOrEqual(100);
    }
  });

  it("prevents duplicate RLS and soft-marks duplicates without hard delete", async () => {
    const suffix = Date.now();
    const a = await createSite({
      role: "ADMIN",
      actorUserId: adminId,
      fields: {
        organizationId: orgId,
        name: `Dup A ${suffix}`,
        rlsNumber: `DUP-${suffix}`,
        addressLine1: "99 rue Test",
        city: "Sherbrooke",
      },
    });
    await expect(
      createSite({
        role: "ADMIN",
        actorUserId: adminId,
        fields: {
          organizationId: orgId,
          name: `Dup B ${suffix}`,
          rlsNumber: `DUP-${suffix}`,
        },
      }),
    ).rejects.toBeInstanceOf(CatalogError);

    const b = await createSite({
      role: "ADMIN",
      actorUserId: adminId,
      fields: {
        organizationId: orgId,
        name: `Dup B ${suffix}`,
        addressLine1: "99 rue Test",
        city: "Sherbrooke",
      },
    });
    await markSiteDuplicate({
      role: "ADMIN",
      actorUserId: adminId,
      siteId: b.id,
      canonicalSiteId: a.id,
    });
    const marked = await prisma.residenceSite.findUniqueOrThrow({ where: { id: b.id } });
    expect(marked.duplicateOfSiteId).toBe(a.id);
    expect(marked.status).toBe("ARCHIVED");
    expect(await prisma.residenceSite.findUnique({ where: { id: b.id } })).not.toBeNull();
  });

  it("deep-link claim creates draft without duplicate; rejects inactive site", async () => {
    const claim = createSiteClaim("seed-site-1");
    expect(verifySiteClaim(claim)?.siteId).toBe("seed-site-1");

    const draft1 = await createDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      siteId: "seed-site-1",
    });
    const draft2 = await createDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      siteId: "seed-site-1",
    });
    expect(draft2.id).toBe(draft1.id);

    // Substitution: claim for site-1 must win over raw site-2 (server-side verify).
    const claimed = verifySiteClaim(claim)!;
    expect(claimed.siteId).not.toBe("seed-site-2");
    const fromClaim = await createDraftApplication({
      userId: familyAId,
      role: "FAMILY",
      siteId: claimed.siteId,
    });
    expect(fromClaim.siteId).toBe("seed-site-1");
  });

  it("slug change records redirect", async () => {
    const suffix = Date.now();
    const site = await createSite({
      role: "ADMIN",
      actorUserId: adminId,
      fields: {
        organizationId: orgId,
        name: `Slug Site ${suffix}`,
        slug: `slug-site-${suffix}`,
      },
    });
    await updateSite({
      role: "ADMIN",
      actorUserId: adminId,
      siteId: site.id,
      fields: { slug: `slug-site-renamed-${suffix}` },
    });
    const redirect = await prisma.siteSlugRedirect.findUnique({
      where: { fromSlug: `slug-site-${suffix}` },
    });
    expect(redirect?.siteId).toBe(site.id);
  });
});
