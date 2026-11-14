import { expect, test } from "@playwright/test";
import { seConnecter } from "./utilisateur";

for (const chemin of ["/login", "/"]) {
  test(`${chemin} s'affiche en français, sans défilement horizontal`, async ({ page }) => {
    if (chemin === "/") await seConnecter(page);
    else await page.goto(chemin);

    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largeur).toBeLessThanOrEqual(375);
  });
}
