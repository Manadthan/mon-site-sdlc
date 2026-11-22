import { expect, test, type Page } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-17 — Partager mes collections en lecture seule (docs/SPEC.md v1.8, ADR-06 révisé)

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

/** Depuis l'accueil, sans passer par « Modifier ». */
async function partager(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Partager" }).click();
  const panneau = page.getByRole("dialog", { name: "Partager mes collections" });
  await panneau.getByRole("button", { name: "Créer le lien et l’envoyer" }).click();
  const lien = panneau.getByTestId("lien-partage");
  await expect(lien).toBeVisible();
  return (await lien.textContent())!;
}

test("un seul lien montre toutes les collections, sans compte et en lecture seule", async ({ page, browser }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("partage", testInfo);
  const cartes = await creerCollection(utilisateur.id, "Cartes DBZ", 3, 1);
  await creerCollection(utilisateur.id, "Mangas", 2, 0);
  await simulerFeuilleDePartage(page);
  await seConnecter(page, utilisateur);

  const lien = await partager(page);
  expect(lien).toMatch(/\/partage\/[A-Za-z0-9_-]{43}$/);
  // La feuille de partage a reçu le lien.
  await expect.poll(() => page.evaluate(() => (window as unknown as { partage?: ShareData }).partage?.url)).toBe(lien);

  // Le frère : un autre navigateur, sans compte. Il voit la liste de toutes les collections.
  const frere = await (await browser.newContext({ ...testInfo.project.use })).newPage();
  await frere.goto(lien);
  await expect(frere).toHaveURL(lien);
  await expect(frere.getByRole("heading", { name: "Collections partagées" })).toBeVisible();
  await expect(frere.getByRole("link", { name: /Cartes DBZ/ })).toContainText(/1\s\/\s3 · 33\s%/);
  await expect(frere.getByRole("link", { name: /Mangas/ })).toBeVisible();
  // Ni création, ni suppression, ni sauvegarde.
  await expect(frere.getByRole("link", { name: /Nouvelle collection/ })).toHaveCount(0);
  await expect(frere.getByRole("button", { name: /Supprimer/ })).toHaveCount(0);
  await expect(frere.getByRole("button", { name: /Exporter|Importer/ })).toHaveCount(0);
  await expect(frere.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Tri comme sur l'accueil.
  await frere.getByRole("button", { name: "Trier par nom" }).click();
  await expect(frere.getByRole("list", { name: "Collections partagées" }).getByRole("heading")).toHaveText(["Cartes DBZ", "Mangas"]);
  await frere.getByRole("button", { name: /Trier par nom, ordre croissant/ }).click();
  await expect(frere.getByRole("list", { name: "Collections partagées" }).getByRole("heading")).toHaveText(["Mangas", "Cartes DBZ"]);

  // Une collection : en lecture seule.
  await frere.getByRole("link", { name: /Cartes DBZ/ }).click();
  await expect(frere).toHaveURL(`${lien}/${cartes}`);
  await expect(frere.getByRole("heading", { name: "Cartes DBZ" })).toBeVisible();
  await expect(frere.getByRole("listitem").filter({ hasText: "Item 1" }).getByTestId("coche-possede")).toBeVisible();
  await expect(frere.getByRole("button", { name: /Item/ })).toHaveCount(0);
  await expect(frere.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await frere.getByRole("listitem").filter({ hasText: "Item 2" }).click();
  await expect(frere.getByRole("banner")).toContainText(/1\s\/\s3/);
  await frere.getByRole("button", { name: /Manquants/ }).click();
  await expect(frere.getByTestId("intitule")).toHaveText(["Item 2", "Item 3"]);
  await expect(frere.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Ce que je coche apparaît au prochain chargement ; une nouvelle collection apparaît sans nouveau lien.
  await page.goto(`/collections/${cartes}`);
  await page.getByRole("button", { name: /Item 3/ }).click();
  await expect(page.getByRole("banner")).toContainText(/2\s\/\s3/);
  await frere.reload();
  await expect(frere.getByRole("banner")).toContainText(/2\s\/\s3 · 67\s%/);
  await creerCollection(utilisateur.id, "Jeux vidéo", 1, 0);

  // Le retour ramène à la liste partagée, pas à l'accueil.
  await frere.getByRole("link", { name: "Retour aux collections" }).click();
  await expect(frere).toHaveURL(lien);
  await expect(frere.getByRole("link", { name: /Jeux vidéo/ })).toBeVisible();
  await frere.context().close();
});

test("arrêter le partage invalide le lien ; partager à nouveau en crée un autre", async ({ page, browser }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("arret", testInfo);
  await creerCollection(utilisateur.id, "Mangas", 2, 0);
  await simulerFeuilleDePartage(page);
  await seConnecter(page, utilisateur);

  const ancien = await partager(page);
  const panneau = page.getByRole("dialog", { name: "Partager mes collections" });
  await panneau.getByRole("button", { name: "Arrêter le partage" }).click();
  await expect(panneau.getByRole("button", { name: "Créer le lien et l’envoyer" })).toBeVisible();
  const { data } = await adminSupabase().from("partages").select("token").eq("user_id", utilisateur.id);
  expect(data).toEqual([]);

  const frere = await (await browser.newContext({ ...testInfo.project.use })).newPage();
  await frere.goto(ancien);
  await expect(frere.getByRole("heading", { name: "Ce lien de partage n’est plus valide" })).toBeVisible();
  await expect(frere.getByText("Mangas")).toHaveCount(0);

  await panneau.getByRole("button", { name: "Créer le lien et l’envoyer" }).click();
  const nouveau = await panneau.getByTestId("lien-partage").textContent();
  expect(nouveau).not.toBe(ancien);
  await frere.goto(nouveau!);
  await expect(frere.getByRole("link", { name: /Mangas/ })).toBeVisible();

  // Le lien reste affiché quand on rouvre le panneau plus tard.
  await page.reload();
  await page.getByRole("button", { name: "Partager" }).click();
  await expect(panneau.getByTestId("lien-partage")).toHaveText(nouveau!);
  await frere.context().close();
});

test("un lien inventé ne montre rien", async ({ page }) => {
  await page.goto(`/partage/${"x".repeat(43)}`);
  await expect(page).toHaveURL(/\/partage\//);
  await expect(page.getByRole("heading", { name: "Ce lien de partage n’est plus valide" })).toBeVisible();
  await page.goto(`/partage/${"x".repeat(43)}/00000000-0000-0000-0000-000000000000`);
  await expect(page.getByRole("heading", { name: "Ce lien de partage n’est plus valide" })).toBeVisible();
});
