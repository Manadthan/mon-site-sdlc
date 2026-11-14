import { expect, test } from "@playwright/test";

test("le site est installable sur l'écran d'accueil de l'iPhone", async ({ page, request }) => {
  await page.goto("/");

  // Balises lues par Safari iOS.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Collections");

  // Le manifest est valide et toutes ses icônes existent.
  const reponse = await request.get("/manifest.webmanifest");
  expect(reponse.ok()).toBe(true);
  const manifest = (await reponse.json()) as { display: string; lang: string; icons: { src: string }[] };
  expect(manifest.display).toBe("standalone");
  expect(manifest.lang).toBe("fr");
  for (const icone of [...manifest.icons.map((i) => i.src), "/icons/apple-touch-icon.png"]) {
    const r = await request.get(icone);
    expect(r.ok(), icone).toBe(true);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
});
