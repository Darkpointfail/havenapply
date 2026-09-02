import { test, expect } from "@playwright/test";

test.describe("family application loop", () => {
  test("create draft through submit and reappears after logout/login", async ({ page }) => {
    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);

    await page.getByRole("link", { name: /nouvelle candidature|new application/i }).click();
    await expect(page).toHaveURL(/\/family\/applications\/new/);
    await page.locator('input[name="siteId"][value="seed-site-1"]').check();
    await page.getByRole("button", { name: /créer le brouillon|create draft/i }).click();
    await expect(page).toHaveURL(/\/family\/applications\/[^/]+\/edit/);

    const uniqueName = `E2E Resident ${Date.now()}`;
    await page.locator('input[name="residentPreferredName"]').fill(uniqueName);
    await page.locator('input[name="residentBirthYear"]').fill("1944");
    await page.locator('input[name="preferredMoveMonth"]').fill("2026-10");
    await page.getByRole("button", { name: /enregistrer et continuer|save and continue/i }).click();
    await expect(page).toHaveURL(/step=contact/);

    await page.locator('input[name="contactName"]').fill("Family A Owner");
    await page.locator('input[name="contactEmail"]').fill("family.a@havenapply.local");
    await page.locator('input[name="contactPhone"]').fill("+14185550777");
    await page.getByRole("button", { name: /enregistrer et continuer|save and continue/i }).click();
    await expect(page).toHaveURL(/\/review/);

    await page.locator('input[name="consentPrivacy"]').check();
    await page.locator('input[name="consentShareWithSite"]').check();
    await page.getByRole("button", { name: /soumettre la candidature|submit application/i }).click();
    await expect(page).toHaveURL(/\/confirmation/);

    const ref = await page.locator("p.font-mono").first().textContent();
    expect(ref).toMatch(/^HA-/);

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await expect(page).toHaveURL(/sign-in/);

    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);
    await expect(page.getByText(ref!)).toBeVisible();

    // Staff of target site can see it via server list
    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await page.locator('input[name="email"]').fill("staff.site1@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/staff\/dashboard/);
    await expect(page.getByText(ref!)).toBeVisible();
  });
});
