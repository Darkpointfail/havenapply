import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createCaregiverInvitation } from "../../src/lib/caregiver-invitations";
import { createStaffInvitation } from "../../src/lib/staff-invitations";
import { envSchema, resetEnvCache } from "../../src/lib/env";

const prisma = new PrismaClient();

async function bootstrapEnv() {
  resetEnvCache();
  envSchema.parse({
    NODE_ENV: "test",
    APP_URL: process.env.APP_URL || "http://127.0.0.1:3000",
    AUTH_SECRET: process.env.AUTH_SECRET || "dev-only-change-me-to-a-long-random-string",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://haven:haven@localhost:5432/havenapply?schema=public",
    STORAGE_DRIVER: "minio",
    STORAGE_ENDPOINT: "http://localhost:9000",
    STORAGE_BUCKET: "haven-private",
    STORAGE_ACCESS_KEY_ID: "minioadmin",
    STORAGE_SECRET_ACCESS_KEY: "minioadmin",
    EMAIL_DRIVER: "smtp",
    EMAIL_FROM: "HavenApply <noreply@havenapply.local>",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    INVITATION_TTL_HOURS: "168",
    INVITATION_ATTEMPT_LIMIT: "100",
  });
}

test.describe("caregiver invitation E2E", () => {
  test("link → sign-up → accept joins family", async ({ page }) => {
    await bootstrapEnv();
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "family.a@havenapply.local" },
    });
    const email = `e2e.cg.${Date.now()}@havenapply.local`;
    const { rawToken } = await createCaregiverInvitation({
      actorUserId: owner.id,
      familyProfileId: "seed-family-a",
      email,
      role: "EDITOR",
      locale: "fr",
    });

    await page.goto(`/fr/invite/caregiver?t=${rawToken}`);
    await expect(page.getByTestId("invite-state")).toHaveAttribute("data-state", "VALID");
    await page.getByTestId("invite-sign-up").click();
    await expect(page).toHaveURL(/sign-up/);

    await page.locator('input[name="name"]').fill("E2E Caregiver");
    await page.getByTestId("sign-up-email").fill(email);
    await page.getByTestId("sign-up-password").fill("DevOnlyPass123!");
    await page.getByTestId("sign-up-submit").click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);
  });
});

test.describe("staff invitation E2E", () => {
  test("link → sign-in existing → accept", async ({ page }) => {
    await bootstrapEnv();
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "staff.site1@havenapply.local" },
    });
    // Use a dedicated seeded-like user created in-test via UI sign-up first without invite, then invite+login
    const email = `e2e.st.${Date.now()}@havenapply.local`;
    const password = "DevOnlyPass123!";

    // Pre-create verified STAFF-capable user without membership
    const { hashPassword } = await import("../../src/lib/crypto");
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        name: "E2E Staff Invitee",
        role: "FAMILY",
        passwordHash,
        emailVerified: new Date(),
        notificationPreference: { create: {} },
      },
    });

    const { rawToken } = await createStaffInvitation({
      actorUserId: owner.id,
      organizationId: (
        await prisma.residenceOrganization.findUniqueOrThrow({
          where: { slug: "demo-residences" },
        })
      ).id,
      email,
      orgRole: "VIEWER",
      siteIds: ["seed-site-1"],
      locale: "fr",
    });

    await page.goto(`/fr/invite/staff?t=${rawToken}`);
    await expect(page.getByTestId("invite-state")).toHaveAttribute("data-state", "VALID");
    await page.getByTestId("invite-sign-in").click();
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/invite\/staff/);
    await page.getByTestId("invite-accept").click();
    await expect(page).toHaveURL(/\/fr\/staff\/dashboard/);
  });
});
