-- Application status machine: INFO_REQUESTED→NEEDS_DOCUMENTS, DECLINED→REJECTED
CREATE TYPE "ApplicationStatus_new" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_DOCUMENTS',
  'WAITLISTED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
);

ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Application"
  ALTER COLUMN "status" TYPE "ApplicationStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'INFO_REQUESTED' THEN 'NEEDS_DOCUMENTS'::"ApplicationStatus_new"
      WHEN "status"::text = 'DECLINED' THEN 'REJECTED'::"ApplicationStatus_new"
      ELSE "status"::text::"ApplicationStatus_new"
    END
  );

ALTER TABLE "ApplicationStatusHistory"
  ALTER COLUMN "fromStatus" TYPE "ApplicationStatus_new"
  USING (
    CASE
      WHEN "fromStatus" IS NULL THEN NULL
      WHEN "fromStatus"::text = 'INFO_REQUESTED' THEN 'NEEDS_DOCUMENTS'::"ApplicationStatus_new"
      WHEN "fromStatus"::text = 'DECLINED' THEN 'REJECTED'::"ApplicationStatus_new"
      ELSE "fromStatus"::text::"ApplicationStatus_new"
    END
  );

ALTER TABLE "ApplicationStatusHistory"
  ALTER COLUMN "toStatus" TYPE "ApplicationStatus_new"
  USING (
    CASE
      WHEN "toStatus"::text = 'INFO_REQUESTED' THEN 'NEEDS_DOCUMENTS'::"ApplicationStatus_new"
      WHEN "toStatus"::text = 'DECLINED' THEN 'REJECTED'::"ApplicationStatus_new"
      ELSE "toStatus"::text::"ApplicationStatus_new"
    END
  );

DROP TYPE "ApplicationStatus";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";

ALTER TABLE "Application"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ApplicationStatus";

-- Org / site must be active + verified to accept submissions
ALTER TABLE "ResidenceOrganization"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ResidenceSite"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- Minimized application payload + consents + idempotency
ALTER TABLE "Application"
  ADD COLUMN "residentPreferredName" TEXT,
  ADD COLUMN "residentBirthYear" INTEGER,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "preferredMoveMonth" TEXT,
  ADD COLUMN "urgencyNote" TEXT,
  ADD COLUMN "consentPrivacy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentShareWithSite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentAt" TIMESTAMP(3),
  ADD COLUMN "draftStep" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "submitIdempotencyKey" TEXT;

CREATE UNIQUE INDEX "Application_submitIdempotencyKey_key"
  ON "Application"("submitIdempotencyKey");

UPDATE "Application"
SET "publicRef" = 'HA-TMP-' || upper(substr(md5(random()::text || id), 1, 8))
WHERE "publicRef" IS NULL;

ALTER TABLE "Application" ALTER COLUMN "publicRef" SET NOT NULL;
