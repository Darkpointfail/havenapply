import { test, expect } from "@playwright/test";

test.describe("admissions workflow E2E", () => {
  test("family submit → staff review → needs docs → family respond → accept", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);

    await page.getByRole("link", { name: /nouvelle candidature|new application/i }).click();
    await page.locator('input[name="siteId"][value="seed-site-1"]').check();
    await page.getByRole("button", { name: /créer le brouillon|create draft/i }).click();
    await expect(page).toHaveURL(/\/family\/applications\/[^/]+\/edit/);

    const uniqueName = `E2E Admit ${Date.now()}`;
    await page.locator('input[name="residentPreferredName"]').fill(uniqueName);
    await page.locator('input[name="residentBirthYear"]').fill("1943");
    await page.getByRole("button", { name: /enregistrer et continuer|save and continue/i }).click();
    await expect(page).toHaveURL(/step=contact/);

    await page.locator('input[name="contactName"]').fill("Family A Owner");
    await page.locator('input[name="contactEmail"]').fill("family.a@havenapply.local");
    await page.locator('input[name="contactPhone"]').fill("+14185550666");
    await page.getByRole("button", { name: /enregistrer et continuer|save and continue/i }).click();
    await expect(page).toHaveURL(/\/review/);

    await page.locator('input[name="consentPrivacy"]').check();
    await page.locator('input[name="consentShareWithSite"]').check();
    await page.getByRole("button", { name: /soumettre la candidature|submit application/i }).click();
    await expect(page).toHaveURL(/\/confirmation/);

    const ref = (await page.locator("p.font-mono").first().textContent())?.trim();
    expect(ref).toMatch(/^HA-/);

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await page.locator('input[name="email"]').fill("staff.site1@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/staff\/dashboard/);
    await expect(page.getByText(ref!)).toBeVisible();

    await page.getByTestId(`staff-open-${ref}`).click();
    await expect(page).toHaveURL(/\/staff\/applications\//);
    await expect(page.getByTestId("staff-app-status")).toContainText(/Soumise|Submitted/i);

    await expect(page.getByTestId("staff-transition-form")).toBeVisible();
    await page.getByTestId("staff-to-status").selectOption({ value: "UNDER_REVIEW" });
    await page.getByTestId("staff-to-status").evaluate((el: HTMLSelectElement) => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByTestId("staff-confirm-transition")).toBeVisible();
    await page.getByTestId("staff-confirm-transition").check();
    await page.getByTestId("staff-transition-submit").click();
    await expect(page.getByTestId("staff-transition-ok")).toBeVisible();
    await expect(page.getByTestId("staff-app-status")).toContainText(/En examen|Under review/i);

    await page.getByTestId("staff-to-status").selectOption({ value: "NEEDS_DOCUMENTS" });
    await page.getByTestId("staff-to-status").evaluate((el: HTMLSelectElement) => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByTestId("staff-family-message-needs")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("staff-family-message-needs").fill("Merci de fournir une pièce d'identité.");
    await page.getByTestId("staff-requested-documents").fill("Pièce d'identité");
    await page.getByTestId("staff-confirm-transition").check();
    await page.getByTestId("staff-transition-submit").click();
    await expect(page.getByTestId("staff-app-status")).toContainText(
      /Documents requis|Documents needed/i,
    );

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);
    await page.locator("li").filter({ hasText: ref! }).getByRole("link").click();
    await expect(page.getByTestId("family-app-status")).toContainText(
      /Documents requis|Documents needed/i,
    );
    await expect(page.getByTestId("family-requested-docs")).toContainText("Pièce d'identité");
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL");

    await page.getByTestId("family-docs-response-submit").click();
    await expect(page.getByTestId("family-app-status")).toContainText(/En examen|Under review/i);

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await page.locator('input[name="email"]').fill("staff.site1@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await page.getByTestId(`staff-open-${ref}`).click();

    await page.getByTestId("staff-to-status").selectOption({ value: "ACCEPTED" });
    await page.getByTestId("staff-to-status").evaluate((el: HTMLSelectElement) => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByTestId("staff-family-message-accept")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("staff-family-message-accept").fill("Félicitations — place disponible.");
    await page.getByTestId("staff-next-steps").fill("Nous vous appellerons sous 48 h.");
    await page.getByTestId("staff-confirm-transition").check();
    await page.getByTestId("staff-transition-submit").click();
    await expect(page.getByTestId("staff-app-status")).toContainText(/Acceptée|Accepted/i);

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await page.locator("li").filter({ hasText: ref! }).getByRole("link").click();
    await expect(page.getByTestId("family-app-status")).toContainText(/Acceptée|Accepted/i);
    await expect(page.getByTestId("family-timeline")).toContainText(/Acceptée|Accepted/i);
  });
});
