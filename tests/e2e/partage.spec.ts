import { expect, test, type Page } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-17 — Partager une collection en lecture seule (docs/SPEC.md, ADR-06)

/** Remplace la feuille de partage de l'iPhone : on garde ce qui lui a été transmis. */
async function simulerFeuilleDePartage(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (donnees: ShareData) => {
        (window as unknown as { partage: ShareData }).partage = donnees;
      },
    });
  });
}

async function partager(page: Page) {
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Partager" }).click();
  const lien = page.getByTestId("lien-partage");
  await expect(lien).toBeVisible();
  return (await lien.textContent())!;
}

test("le lien montre la collection sans compte, en lecture seule, et suit les coches", async ({ page, browser }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("partage", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes DBZ", 3, 1);
  await creerCollection(utilisateur.id, "Collection privée", 1, 0);
  await simulerFeuilleDePartage(page);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  const lien = await partager(page);
  expect(lien).toMatch(/\/partage\/[A-Za-z0-9_-]{43}$/);
  // La feuille de partage a reçu le lien.
  await expect.poll(() => page.evaluate(() => (window as unknown as { partage?: ShareData }).partage?.url)).toBe(lien);

  // Le frère : un autre navigateur, sans compte.
  const frere = await (await browser.newContext({ ...testInfo.project.use })).newPage();
  await frere.goto(lien);
  await expect(frere).toHaveURL(lien);
  await expect(frere.getByRole("heading", { name: "Cartes DBZ" })).toBeVisible();
  await expect(frere.getByRole("banner")).toContainText(/1\s\/\s3 · 33\s%/);
  await expect(frere.getByRole("listitem").filter({ hasText: "Item 1" }).getByTestId("coche-possede")).toBeVisible();

  // Lecture seule : rien à toucher, pas de mode édition, pas de lien vers les autres collections.
  await expect(frere.getByRole("button", { name: /Item/ })).toHaveCount(0);
  await expect(frere.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(frere.getByRole("link", { name: "Retour aux collections" })).toHaveCount(0);
  await expect(frere.getByText("Collection privée")).toHaveCount(0);
  await frere.getByRole("listitem").filter({ hasText: "Item 2" }).click();
  await expect(frere.getByRole("banner")).toContainText(/1\s\/\s3/);

  // Filtre et recherche fonctionnent.
  await frere.getByRole("button", { name: /Manquants/ }).click();
  await expect(frere.getByTestId("intitule")).toHaveText(["Item 2", "Item 3"]);

  // Non indexée par les moteurs de recherche.
  await expect(frere.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Ce que je coche apparaît au prochain chargement.
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.getByRole("button", { name: /Item 3/ }).click();
  await expect(page.getByRole("banner")).toContainText(/2\s\/\s3/);
  await frere.reload();
  await expect(frere.getByRole("banner")).toContainText(/2\s\/\s3 · 67\s%/);
  await frere.context().close();
});

test("arrêter le partage invalide le lien ; partager à nouveau en crée un autre", async ({ page, browser }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("arret", testInfo);
  const id = await creerCollection(utilisateur.id, "Mangas", 2, 0);
  await simulerFeuilleDePartage(page);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  const ancien = await partager(page);
  await page.getByRole("button", { name: "Arrêter le partage" }).click();
  await expect(page.getByRole("button", { name: "Partager" })).toBeVisible();
  const { data } = await adminSupabase().from("collections").select("share_token").eq("id", id).single();
  expect(data?.share_token).toBeNull();

  const frere = await (await browser.newContext({ ...testInfo.project.use })).newPage();
  await frere.goto(ancien);
  await expect(frere.getByRole("heading", { name: "Ce lien de partage n’est plus valide" })).toBeVisible();
  await expect(frere.getByText("Mangas")).toHaveCount(0);

  await page.getByRole("button", { name: "Partager" }).click();
  const nouveau = await page.getByTestId("lien-partage").textContent();
  expect(nouveau).not.toBe(ancien);
  await frere.goto(nouveau!);
  await expect(frere.getByRole("heading", { name: "Mangas" })).toBeVisible();
  await frere.context().close();
});

test("un lien inventé ne montre rien", async ({ page }) => {
  await page.goto(`/partage/${"x".repeat(43)}`);
  await expect(page).toHaveURL(/\/partage\//);
  await expect(page.getByRole("heading", { name: "Ce lien de partage n’est plus valide" })).toBeVisible();
});
