import { expect, test } from "@playwright/test";

test("la page d'accueil s'affiche en français, sans défilement horizontal", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Suivi de collections");
  await expect(page.getByRole("heading", { level: 1, name: "Suivi de collections" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");

  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largeur).toBeLessThanOrEqual(375);
});
