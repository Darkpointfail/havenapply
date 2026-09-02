import { test, expect } from "@playwright/test";

const familyEmail = process.env.E2E_FAMILY_EMAIL || "family.dev@havenapply.local";
const staffEmail = process.env.E2E_STAFF_EMAIL || "staff.dev@havenapply.local";
const password = process.env.E2E_DEV_PASSWORD || "DevOnlyPass123!";

test.describe("role isolation", () => {
  test("FAMILY cannot open staff dashboard", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill(familyEmail);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);

    await page.goto("/fr/staff/dashboard");
    await expect(page).toHaveURL(/access-denied/);
  });

  test("STAFF cannot open family dashboard", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill(staffEmail);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/staff\/dashboard/);

    await page.goto("/fr/family/dashboard");
    await expect(page).toHaveURL(/access-denied/);
  });
});
