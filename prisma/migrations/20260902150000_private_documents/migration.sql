-- Document lifecycle for private object storage
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'AVAILABLE', 'QUARANTINED', 'DELETED');

ALTER TABLE "Document"
  ADD COLUMN "originalFileName" TEXT,
  ADD COLUMN "checksumSha256" TEXT,
  ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
  ADD COLUMN "scanAdapter" TEXT,
  ADD COLUMN "scanResult" TEXT,
  ADD COLUMN "scannedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "purgeAfter" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill display name from legacy fileName, mark existing seed rows AVAILABLE
UPDATE "Document"
SET
  "originalFileName" = COALESCE("fileName", 'document'),
  "status" = 'AVAILABLE',
  "scanAdapter" = 'dev-passthrough',
  "scanResult" = 'skipped_dev',
  "scannedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "originalFileName" IS NULL;

ALTER TABLE "Document" ALTER COLUMN "originalFileName" SET NOT NULL;

-- Drop legacy fileName after backfill
ALTER TABLE "Document" DROP COLUMN "fileName";

CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_purgeAfter_idx" ON "Document"("purgeAfter");
