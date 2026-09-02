-- Staff org roles OWNER/EDITOR/VIEWER
CREATE TYPE "StaffOrgRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "StaffMembership"
  ADD COLUMN "orgRole" "StaffOrgRole" NOT NULL DEFAULT 'EDITOR';

-- Optimistic concurrency on applications
ALTER TABLE "Application"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Rich status history (internal vs family-facing)
ALTER TABLE "ApplicationStatusHistory"
  ADD COLUMN "internalNote" TEXT,
  ADD COLUMN "familyMessage" TEXT,
  ADD COLUMN "requestedDocuments" JSONB,
  ADD COLUMN "waitlistPosition" INTEGER,
  ADD COLUMN "nextSteps" TEXT,
  ADD COLUMN "isReopen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "ApplicationStatusHistory_idempotencyKey_key"
  ON "ApplicationStatusHistory"("idempotencyKey");

-- Transactional outbox
CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");
