-- Residence catalog: site lifecycle, provenance, slug redirects, change history

CREATE TYPE "SiteStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "DataSourceKind" AS ENUM ('GOVERNMENT', 'FACILITY', 'EDITORIAL', 'UNKNOWN');
CREATE TYPE "DataConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

ALTER TABLE "ResidenceOrganization"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "website" TEXT;

ALTER TABLE "ResidenceSite"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "status" "SiteStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "country" TEXT DEFAULT 'CA',
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "rlsNumber" TEXT,
  ADD COLUMN "officialCategories" JSONB,
  ADD COLUMN "descriptionEditorial" TEXT,
  ADD COLUMN "servicesFact" JSONB,
  ADD COLUMN "unitsFact" JSONB,
  ADD COLUMN "pricingFact" JSONB,
  ADD COLUMN "availabilityFact" JSONB,
  ADD COLUMN "autonomyFact" JSONB,
  ADD COLUMN "photosFact" JSONB,
  ADD COLUMN "dataSource" "DataSourceKind" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "collectedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verificationMethod" TEXT,
  ADD COLUMN "confidence" "DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "duplicateOfSiteId" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill status from legacy booleans
UPDATE "ResidenceSite"
SET "status" = 'ACTIVE',
    "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP),
    "verifiedAt" = COALESCE("verifiedAt", CURRENT_TIMESTAMP),
    "dataSource" = 'FACILITY',
    "confidence" = 'MEDIUM',
    "verificationMethod" = 'seed_legacy_active_verified'
WHERE "isActive" = true AND "isVerified" = true;

UPDATE "ResidenceSite"
SET "status" = 'VERIFIED',
    "verifiedAt" = COALESCE("verifiedAt", CURRENT_TIMESTAMP)
WHERE "isActive" = false AND "isVerified" = true;

UPDATE "ResidenceSite"
SET "status" = 'DRAFT'
WHERE "isVerified" = false AND "status" = 'DRAFT';

-- Stable slugs from name+id for existing rows
UPDATE "ResidenceSite"
SET "slug" = LOWER(REGEXP_REPLACE(COALESCE("name", 'site') || '-' || RIGHT("id", 6), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

ALTER TABLE "ResidenceSite" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "ResidenceSite_slug_key" ON "ResidenceSite"("slug");
CREATE INDEX "ResidenceSite_status_idx" ON "ResidenceSite"("status");
CREATE INDEX "ResidenceSite_city_region_idx" ON "ResidenceSite"("city", "region");
CREATE INDEX "ResidenceSite_rlsNumber_idx" ON "ResidenceSite"("rlsNumber");
CREATE INDEX "ResidenceSite_duplicateOfSiteId_idx" ON "ResidenceSite"("duplicateOfSiteId");

ALTER TABLE "ResidenceSite"
  ADD CONSTRAINT "ResidenceSite_duplicateOfSiteId_fkey"
  FOREIGN KEY ("duplicateOfSiteId") REFERENCES "ResidenceSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SiteSlugRedirect" (
    "id" TEXT NOT NULL,
    "fromSlug" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteSlugRedirect_fromSlug_key" ON "SiteSlugRedirect"("fromSlug");
CREATE INDEX "SiteSlugRedirect_siteId_idx" ON "SiteSlugRedirect"("siteId");
ALTER TABLE "SiteSlugRedirect"
  ADD CONSTRAINT "SiteSlugRedirect_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "ResidenceSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SiteChangeHistory" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteChangeHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteChangeHistory_siteId_createdAt_idx" ON "SiteChangeHistory"("siteId", "createdAt");
ALTER TABLE "SiteChangeHistory"
  ADD CONSTRAINT "SiteChangeHistory_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "ResidenceSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
