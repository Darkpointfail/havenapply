import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { envSchema, resetEnvCache } from "../../src/lib/env";
import { createSiteClaim } from "../../src/lib/site-claim";

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
  });
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/fr/sign-in");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("DevOnlyPass123!");
  await page.getByRole("button", { name: /continuer|continue/i }).click();
}

test.describe("residence catalog E2E", () => {
  test("admin publish → public search → apply deep-link", async ({ page }) => {
    await bootstrapEnv();
    const suffix = Date.now();
    const siteName = `E2E Pub ${suffix}`;
    const slug = `e2e-pub-${suffix}`;

    await login(page, "admin.dev@havenapply.local");
    await expect(page).toHaveURL(/\/fr\/admin/);

    const org = await prisma.residenceOrganization.findUniqueOrThrow({
      where: { slug: "demo-residences" },
    });

    await page.goto("/fr/admin/sites/new");
    await page.locator('select[name="organizationId"]').selectOption(org.id);
    await page.locator('input[name="name"]').fill(siteName);
    await page.locator('input[name="slug"]').fill(slug);
    await page.locator('input[name="city"]').fill("Gatineau");
    await page.locator('input[name="region"]').fill("Outaouais");
    await page.getByRole("button", { name: /enregistrer|save/i }).click();
    await expect(page).toHaveURL(/\/admin\/sites\/[^/?]+/);

    const siteId = page.url().match(/\/admin\/sites\/([^/?]+)/)?.[1];
    expect(siteId).toBeTruthy();

    async function transition(to: string) {
      const form = page.locator(`form:has(input[name="toStatus"][value="${to}"])`);
      await expect(form).toHaveCount(1);
      await form.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/ok=status/);
    }

    await transition("PENDING_VERIFICATION");
    await transition("VERIFIED");
    await transition("ACTIVE");

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();

    await page.goto("/fr/residences?q=" + encodeURIComponent(siteName));
    await expect(page.getByText(siteName)).toBeVisible();
    await page.getByRole("link", { name: siteName }).click();
    await expect(page).toHaveURL(new RegExp(`/residences/${slug}`));
    await expect(page.getByTestId("apply-to-site")).toBeVisible();

    await page.getByTestId("apply-to-site").click();
    await expect(page).toHaveURL(/sign-in/);
    expect(page.url()).toContain("siteClaim");

    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/family\/applications\/new/);
    await expect(page.getByText(siteName)).toBeVisible();
    await page.getByRole("button", { name: /créer le brouillon|create draft/i }).click();
    await expect(page).toHaveURL(/\/family\/applications\/[^/]+\/edit/);

    const appId = page.url().match(/\/applications\/([^/]+)\/edit/)?.[1];
    const app = await prisma.application.findUniqueOrThrow({ where: { id: appId! } });
    expect(app.siteId).toBe(siteId);
  });

  test("anonymous sign-up resume with siteClaim creates draft", async ({ page }) => {
    await bootstrapEnv();
    const email = `e2e.catalog.${Date.now()}@havenapply.local`;
    const password = "DevOnlyPass123!";
    const claim = createSiteClaim("seed-site-1");
    const next = `/fr/family/applications/new?siteClaim=${encodeURIComponent(claim)}`;

    await page.goto(`/fr/sign-up?next=${encodeURIComponent(next)}`);
    await page.locator('input[name="name"]').fill("E2E Catalog Family");
    await page.getByTestId("sign-up-email").fill(email);
    await page.getByTestId("sign-up-password").fill(password);
    await page.getByTestId("sign-up-submit").click();
    await expect(page).toHaveURL(/check-email/);

    // Poll mailpit for verification email
    let verifyUrl: string | null = null;
    for (let i = 0; i < 20; i++) {
      const messagesRes = await page.request.get("http://127.0.0.1:8025/api/v1/messages");
      if (messagesRes.ok()) {
        const payload = (await messagesRes.json()) as {
          messages?: Array<{ ID: string; To?: Array<{ Address?: string }> }>;
        };
        const mine = (payload.messages || []).find((m) =>
          (m.To || []).some((t) => (t.Address || "").toLowerCase() === email),
        );
        if (mine) {
          const detailRes = await page.request.get(
            `http://127.0.0.1:8025/api/v1/message/${mine.ID}`,
          );
          const detail = (await detailRes.json()) as { Text?: string; HTML?: string };
          const body = `${detail.Text || ""}\n${detail.HTML || ""}`;
          const match = body.match(/https?:\/\/[^\s"'<>]*verify-email\?[^\s"'<>]+/);
          if (match) {
            verifyUrl = match[0].replace(/&amp;/g, "&");
            break;
          }
        }
      }
      await page.waitForTimeout(500);
    }
    expect(verifyUrl).toBeTruthy();

    await page.goto(verifyUrl!);
    await expect(page).toHaveURL(/family\/dashboard/);

    await page.goto(next);
    await expect(page).toHaveURL(/family\/applications\/new/);
    await page.getByRole("button", { name: /créer le brouillon|create draft/i }).click();
    await expect(page).toHaveURL(/\/family\/applications\/[^/]+\/edit/);

    const app = await prisma.application.findFirst({
      where: {
        siteId: "seed-site-1",
        status: "DRAFT",
        family: { memberships: { some: { user: { email } } } },
      },
    });
    expect(app).toBeTruthy();
  });

  test("siteId substitution cannot override siteClaim", async ({ page }) => {
    await bootstrapEnv();
    const claim = createSiteClaim("seed-site-1");

    await login(page, "family.a@havenapply.local");
    await page.goto(`/fr/family/applications/new?siteClaim=${encodeURIComponent(claim)}`);
    await expect(page.locator('input[name="siteClaim"]')).toHaveCount(1);

    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (!form) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "siteId";
      input.value = "seed-site-2";
      form.appendChild(input);
    });

    await page.getByRole("button", { name: /créer le brouillon|create draft/i }).click();
    await expect(page).toHaveURL(/\/family\/applications\/[^/]+\/edit/);

    const id = page.url().match(/\/applications\/([^/]+)\/edit/)?.[1];
    const app = await prisma.application.findUniqueOrThrow({ where: { id: id! } });
    expect(app.siteId).toBe("seed-site-1");
  });

  test("suspended site is excluded from public catalog", async ({ page }) => {
    await bootstrapEnv();
    const suffix = Date.now();
    const site = await prisma.residenceSite.create({
      data: {
        name: `Suspended ${suffix}`,
        slug: `suspended-${suffix}`,
        status: "SUSPENDED",
        isActive: false,
        isVerified: true,
        city: "Trois-Rivières",
        organizationId: (
          await prisma.residenceOrganization.findUniqueOrThrow({
            where: { slug: "demo-residences" },
          })
        ).id,
      },
    });

    await page.goto(`/fr/residences?q=${encodeURIComponent(site.name)}`);
    await expect(page.getByText(site.name)).toHaveCount(0);

    const res = await page.goto(`/fr/residences/${site.slug}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByTestId("apply-to-site")).toHaveCount(0);
  });
});
