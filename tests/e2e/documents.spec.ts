import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";
import { PrismaClient } from "@prisma/client";

function writeTempPdf(): string {
  const file = path.join(os.tmpdir(), `haven-e2e-${Date.now()}.pdf`);
  fs.writeFileSync(file, `%PDF-1.4\nE2E document ${Date.now()}\n%%EOF\n`);
  return file;
}

test.describe("private documents", () => {
  test("family uploads PDF and staff downloads the real bytes", async ({ page }) => {
    const prisma = new PrismaClient();
    const app = await prisma.application.findUniqueOrThrow({
      where: { publicRef: "HA-SEED-A1" },
    });
    await prisma.$disconnect();

    const pdfPath = writeTempPdf();
    const original = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);

    await page.goto("/fr/sign-in");
    await page.locator('input[name="email"]').fill("family.a@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/family\/dashboard/);

    await page.goto(`/fr/family/applications/${app.id}`);
    await expect(page.getByText("HA-SEED-A1")).toBeVisible();

    await page.getByTestId("document-file-input").setInputFiles(pdfPath);
    await page.getByTestId("document-upload-submit").click();
    await expect(page).toHaveURL(new RegExp(`uploaded=`), { timeout: 30_000 });
    await expect(page.getByText(fileName, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /déconnexion|sign out/i }).click();
    await page.locator('input[name="email"]').fill("staff.site1@havenapply.local");
    await page.locator('input[name="password"]').fill("DevOnlyPass123!");
    await page.getByRole("button", { name: /continuer|continue/i }).click();
    await expect(page).toHaveURL(/\/fr\/staff\/dashboard/);

    await page.goto(`/fr/staff/applications/${app.id}`);
    await expect(page.getByText("HA-SEED-A1")).toBeVisible();
    await expect(page.getByText(fileName)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator(`a[href*="/api/documents/"][href$="/download"]`).first().click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const downloaded = fs.readFileSync(downloadPath!);
    expect(downloaded.equals(original)).toBe(true);

    fs.unlinkSync(pdfPath);
  });
});
