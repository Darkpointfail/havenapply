-- Invitation lifecycle + caregiver invites + soft revoke on memberships

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

ALTER TABLE "CaregiverMembership" ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE TABLE "CaregiverInvitation" (
    "id" TEXT NOT NULL,
    "familyProfileId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CaregiverRole" NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaregiverInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaregiverInvitation_tokenHash_key" ON "CaregiverInvitation"("tokenHash");
CREATE INDEX "CaregiverInvitation_email_status_idx" ON "CaregiverInvitation"("email", "status");
CREATE INDEX "CaregiverInvitation_familyProfileId_status_idx" ON "CaregiverInvitation"("familyProfileId", "status");
CREATE INDEX "CaregiverInvitation_expiresAt_idx" ON "CaregiverInvitation"("expiresAt");

ALTER TABLE "CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffMembership" ADD COLUMN "revokedAt" TIMESTAMP(3);

ALTER TABLE "StaffInvitation" ADD COLUMN "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "StaffInvitation" ADD COLUMN "orgRole" "StaffOrgRole" NOT NULL DEFAULT 'EDITOR';
ALTER TABLE "StaffInvitation" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- Backfill status from acceptedAt / expiresAt
UPDATE "StaffInvitation"
SET "status" = 'ACCEPTED'
WHERE "acceptedAt" IS NOT NULL;

UPDATE "StaffInvitation"
SET "status" = 'EXPIRED'
WHERE "acceptedAt" IS NULL AND "expiresAt" < CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "StaffInvitation_email_idx";
CREATE INDEX "StaffInvitation_email_status_idx" ON "StaffInvitation"("email", "status");
CREATE INDEX "StaffInvitation_expiresAt_idx" ON "StaffInvitation"("expiresAt");

CREATE TABLE "StaffInvitationSite" (
    "invitationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "StaffInvitationSite_pkey" PRIMARY KEY ("invitationId","siteId")
);

CREATE INDEX "StaffInvitationSite_siteId_idx" ON "StaffInvitationSite"("siteId");

ALTER TABLE "StaffInvitationSite" ADD CONSTRAINT "StaffInvitationSite_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "StaffInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffInvitationSite" ADD CONSTRAINT "StaffInvitationSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ResidenceSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy single siteId into join table when present
INSERT INTO "StaffInvitationSite" ("invitationId", "siteId")
SELECT "id", "siteId" FROM "StaffInvitation" WHERE "siteId" IS NOT NULL
ON CONFLICT DO NOTHING;
