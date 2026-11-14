import { expect, test } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-06 — Voir les items d'une collection (docs/SPEC.md)

test("depuis l'accueil, la carte ouvre la collection : compteur et items dans l'ordre de la collection", async ({
  page,
}, testInfo) => {
  const utilisateur = await nouvelUtilisateur("page", testInfo);
  const id = await creerCollection(utilisateur.id, "Film comics", 0, 0);
  // Insérés dans le désordre : c'est la position qui fait foi, pas l'ordre d'insertion.
  await adminSupabase()
    .from("items")
    .insert([
      { collection_id: id, title: "Troisième", position: 3, owned: false },
      { collection_id: id, title: "Premier", position: 1, owned: true },
      { collection_id: id, title: "Un intitulé très long qui ne tient pas sur deux lignes dans une vignette de la grille", position: 2, owned: false },
    ])
    .throwOnError();

  await seConnecter(page, utilisateur);
  await page.getByRole("link", { name: /Film comics/ }).click();
  await expect(page).toHaveURL(`/collections/${id}`);

  await expect(page.getByRole("heading", { level: 1, name: "Film comics" })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText(/1\s\/\s3 · 33\s%/);

  const vignettes = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(vignettes).toHaveCount(3);
  await expect(vignettes.getByRole("heading")).toHaveText([
    "Premier",
    /^Un intitulé très long/,
    "Troisième",
  ]);

  // 2 colonnes sur iPhone 12 mini : les deux premières vignettes côte à côte, la troisième dessous.
  const [a, b, c] = await Promise.all([0, 1, 2].map((i) => vignettes.nth(i).boundingBox()));
  expect(a!.y).toBe(b!.y);
  expect(b!.x).toBeGreaterThan(a!.x);
  expect(c!.y).toBeGreaterThan(a!.y);

  // Intitulé long tronqué proprement : pas de débordement horizontal.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  // Retour à l'accueil.
  await page.getByRole("link", { name: "Retour aux collections" }).click();
  await expect(page).toHaveURL("/");
});

test("une collection de 300 items s'affiche entièrement", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("grande", testInfo);
  const id = await creerCollection(utilisateur.id, "Grande collection", 300, 120);
  await seConnecter(page, utilisateur);

  await page.goto(`/collections/${id}`);
  await expect(page.getByRole("banner")).toContainText(/120\s\/\s300 · 40\s%/);
  const vignettes = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(vignettes).toHaveCount(300);
  await vignettes.last().scrollIntoViewIfNeeded();
  await expect(vignettes.last()).toContainText("Item 300");
});

test("une collection inconnue ou appartenant à un autre affiche « Collection introuvable »", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("intrus", testInfo);
  const autre = await nouvelUtilisateur("proprio", testInfo);
  const idAutre = await creerCollection(autre.id, "Collection privée", 2, 0);
  await seConnecter(page, utilisateur);

  for (const chemin of [`/collections/${idAutre}`, "/collections/00000000-0000-0000-0000-000000000000", "/collections/pas-un-id"]) {
    await page.goto(chemin);
    await expect(page.getByRole("heading", { name: "Collection introuvable" })).toBeVisible();
    await expect(page.getByText("Collection privée")).toHaveCount(0);
  }
});

// US-08 (1/2) — Ajouter un item

test("ajouter un item : intitulé obligatoire, placé en fin de liste, compteur mis à jour", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("ajout", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes DBZ", 2, 1);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  await page.getByRole("button", { name: "Ajouter un item" }).click();
  const panneau = page.getByRole("dialog", { name: "Ajouter un item" });
  await expect(panneau).toBeVisible();

  // Intitulé obligatoire.
  await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(panneau.getByRole("alert")).toHaveText("Donnez un intitulé à l’item.");

  await panneau.getByLabel("Intitulé").fill("  N°49 —   Carte secrète ");
  await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(panneau).toBeHidden();

  const vignettes = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(vignettes.getByRole("heading")).toHaveText(["Item 1", "Item 2", "N°49 — Carte secrète"]);
  await expect(page.getByRole("banner")).toContainText(/1\s\/\s3 · 33\s%/);

  // Persisté, et visible sur l'accueil.
  await page.reload();
  await expect(vignettes).toHaveCount(3);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Cartes DBZ/ })).toContainText(/1\s\/\s3 · 33\s%/);
});

test("ajouter le premier item d'une collection vide", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("premier", testInfo);
  const id = await creerCollection(utilisateur.id, "Vide", 0, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  await expect(page.getByText("Aucun item dans cette collection pour l’instant.")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un item" }).click();
  await page.getByRole("dialog").getByLabel("Intitulé").fill("Premier objet");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(page.getByRole("list", { name: "Items" }).getByRole("heading")).toHaveText(["Premier objet"]);
  await expect(page.getByText("Aucun item dans cette collection pour l’instant.")).toHaveCount(0);
});
