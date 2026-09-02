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
