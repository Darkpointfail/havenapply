import { test, expect } from "@playwright/test";

test.describe("public auth pages", () => {
  test("home redirects anonymous users to locale home", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/fr\/?$/);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("sign-in page is reachable", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await expect(page.getByRole("heading", { name: /connexion|sign in/i })).toBeVisible();
  });

  test("unauthenticated user cannot open family dashboard", async ({ page }) => {
    await page.goto("/fr/family/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("unauthenticated user cannot open staff dashboard", async ({ page }) => {
    await page.goto("/fr/staff/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("auth journeys", () => {
  test("login logout for verified family", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);
    await expect(page.getByText("HA-SEED-A1")).toBeVisible();

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await expect(page).toHaveURL(/sign-in/);
    await page.goto("/fr/family/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("FAMILY cannot open staff dashboard", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);
    await page.goto("/fr/staff/dashboard");
    await expect(page).toHaveURL(/access-denied/);
  });

  test("STAFF cannot open family dashboard", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill("staff.site1@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/staff\/dashboard/);
    await page.goto("/fr/family/dashboard");
    await expect(page).toHaveURL(/access-denied/);
  });
});
