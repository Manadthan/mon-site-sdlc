import { expect, test } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-08 — Corriger les items d'une collection (docs/SPEC.md) : mode édition, renommer, supprimer.

test("le mode édition est distinct du mode cocher", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("modes", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 2, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  // Mode cocher : pas de bouton d'ajout ni de suppression.
  await expect(page.getByRole("button", { name: "Ajouter un item" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Supprimer/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByText("Mode édition — un tap ne coche plus les items")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter un item" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Supprimer « Item 1 »" })).toBeVisible();
  // Aucune vignette n'est cochable en mode édition.
  await expect(page.locator("[aria-pressed]")).toHaveCount(0);

  await page.getByRole("button", { name: "Terminé" }).click();
  await expect(page.getByRole("button", { name: /Item 1/ })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Ajouter un item" })).toHaveCount(0);
});

test("modifier l'intitulé d'un item", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("renommer", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 2, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();

  await page.getByRole("button", { name: "Renommer « Item 2 »" }).click();
  const panneau = page.getByRole("dialog", { name: "Modifier l’item" });
  const champ = panneau.getByLabel("Intitulé");
  await expect(champ).toHaveValue("Item 2");

  // Intitulé obligatoire.
  await champ.fill("   ");
  await panneau.getByRole("button", { name: "Enregistrer" }).click();
  await expect(panneau.getByRole("alert")).toHaveText("Donnez un intitulé à l’item.");

  await panneau.getByLabel("Intitulé").fill("N°2 — Carte promo");
  await panneau.getByRole("button", { name: "Enregistrer" }).click();
  await expect(panneau).toBeHidden();

  const intitules = page.getByRole("list", { name: "Items" }).getByTestId("intitule");
  await expect(intitules).toHaveText(["Item 1", "N°2 — Carte promo"]);
  await page.reload();
  await expect(intitules).toHaveText(["Item 1", "N°2 — Carte promo"]);
});

test("supprimer un item demande confirmation", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("suppr-item", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 3, 3);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();

  const dialogue = page.getByRole("alertdialog");
  await page.getByRole("button", { name: "Supprimer « Item 2 »" }).click();
  await expect(dialogue.getByRole("heading")).toHaveText("Supprimer « Item 2 » ?");
  await dialogue.getByRole("button", { name: "Annuler" }).click();
  const intitules = page.getByRole("list", { name: "Items" }).getByTestId("intitule");
  await expect(intitules).toHaveCount(3);

  await page.getByRole("button", { name: "Supprimer « Item 2 »" }).click();
  await dialogue.getByRole("button", { name: "Supprimer" }).click();
  await expect(dialogue).toBeHidden();
  await expect(intitules).toHaveText(["Item 1", "Item 3"]);
  await expect(page.getByRole("banner")).toContainText(/2\s\/\s2 · 100\s%/);

  const { count } = await adminSupabase().from("items").select("id", { count: "exact", head: true }).eq("collection_id", id);
  expect(count).toBe(2);
});

// US-08 — Ajouter un item avec une photo ; l'image part avec l'item ou la collection (US-04).

test("ajouter un item avec une photo, puis le supprimer avec son image", async ({ page, request }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("photo", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 1, 0);
  const stockage = adminSupabase().storage.from("items");
  const dossier = `${utilisateur.id}/${id}`;
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();

  await page.getByRole("button", { name: "Ajouter un item" }).click();
  const panneau = page.getByRole("dialog", { name: "Ajouter un item" });
  await panneau.getByLabel("Intitulé").fill("Carte avec photo");
  await panneau.getByLabel("Photo de l’item").setInputFiles("tests/e2e/fixtures/photo.jpg");
  await expect(panneau).toContainText("Photo : photo.jpg");
  await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(panneau).toBeHidden();

  // La vignette affiche l'image stockée dans le dossier de l'utilisateur, en WebP 400 px.
  await page.getByRole("button", { name: "Terminé" }).click();
  const image = page.getByRole("button", { name: /Carte avec photo/ }).locator("img");
  await expect(image).toHaveAttribute("src", new RegExp(`/storage/v1/object/public/items/${dossier}/[0-9a-f-]+\\.webp$`));
  await expect(image).toHaveJSProperty("complete", true);
  expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(400);
  const reponse = await request.get((await image.getAttribute("src"))!);
  expect(reponse.headers()["content-type"]).toBe("image/webp");

  // Supprimer l'item supprime aussi son image.
  const { data: avant } = await stockage.list(dossier);
  expect(avant).toHaveLength(1);
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Supprimer « Carte avec photo »" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("list", { name: "Items" }).getByTestId("intitule")).toHaveText(["Item 1"]);
  const { data: apres } = await stockage.list(dossier);
  expect(apres).toHaveLength(0);
});

test("supprimer une collection supprime aussi ses images", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("photos-coll", testInfo);
  const id = await creerCollection(utilisateur.id, "Avec images", 0, 0);
  const dossier = `${utilisateur.id}/${id}`;
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();
  for (const titre of ["Première", "Seconde"]) {
    await page.getByRole("button", { name: "Ajouter un item" }).click();
    const panneau = page.getByRole("dialog", { name: "Ajouter un item" });
    await panneau.getByLabel("Intitulé").fill(titre);
    await panneau.getByLabel("Photo de l’item").setInputFiles("tests/e2e/fixtures/photo.jpg");
    await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(panneau).toBeHidden();
  }
  const stockage = adminSupabase().storage.from("items");
  expect((await stockage.list(dossier)).data).toHaveLength(2);

  await page.goto("/");
  await page.getByRole("button", { name: "Supprimer la collection Avec images" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("heading", { name: "Aucune collection pour l’instant" })).toBeVisible();
  expect((await stockage.list(dossier)).data).toHaveLength(0);
});

// US-10 — Réordonner les items

test("réordonner avec les flèches haut / bas, l'ordre est enregistré", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("ordre", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 3, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  // Les flèches n'existent qu'en mode édition.
  await expect(page.getByRole("button", { name: /^Monter/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Modifier" }).click();

  const intitules = page.getByRole("list", { name: "Items" }).getByTestId("intitule");
  await expect(intitules).toHaveText(["Item 1", "Item 2", "Item 3"]);

  // Flèche haut désactivée sur le premier, flèche bas sur le dernier.
  await expect(page.getByRole("button", { name: "Monter « Item 1 »" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Descendre « Item 3 »" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Descendre « Item 1 »" })).toBeEnabled();

  // Monter Item 3 : il échange sa place avec Item 2.
  await page.getByRole("button", { name: "Monter « Item 3 »" }).click();
  await expect(intitules).toHaveText(["Item 1", "Item 3", "Item 2"]);
  // Descendre Item 1 : il échange sa place avec Item 3.
  await page.getByRole("button", { name: "Descendre « Item 1 »" }).click();
  await expect(intitules).toHaveText(["Item 3", "Item 1", "Item 2"]);
  await expect(page.getByRole("button", { name: "Monter « Item 3 »" })).toBeDisabled();

  // Enregistré : l'ordre persiste après rechargement, aussi en mode cocher.
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(intitules).toHaveText(["Item 3", "Item 1", "Item 2"]);
});

// US-08 — Image par adresse : le serveur refuse les adresses internes (protection SSRF, DESIGN.md §6).
// Le téléchargement réussi est couvert par les tests unitaires (src/lib/scraper/__tests__/ssrf.test.ts) :
// la CI ne doit pas dépendre d'un site extérieur.

test("une adresse d'image interne est refusée et l'item n'est pas créé", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("image-url", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 1, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();

  await page.getByRole("button", { name: "Ajouter un item" }).click();
  const panneau = page.getByRole("dialog", { name: "Ajouter un item" });
  await panneau.getByLabel("Intitulé").fill("Carte par adresse");
  await panneau.getByLabel("Adresse de l’image").fill("http://169.254.169.254/latest/meta-data/");
  await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(panneau.locator("form").getByRole("alert")).toHaveText("Cette adresse n’est pas autorisée.");
  // La saisie est conservée pour être corrigée.
  await expect(panneau.getByLabel("Intitulé")).toHaveValue("Carte par adresse");
  await expect(panneau.getByLabel("Adresse de l’image")).toHaveValue("http://169.254.169.254/latest/meta-data/");

  await panneau.getByLabel("Adresse de l’image").fill("ftp://exemple.fr/carte.jpg");
  await panneau.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(panneau.locator("form").getByRole("alert")).toHaveText(
    "Adresse d’image invalide : elle doit commencer par http:// ou https://.",
  );

  const { count } = await adminSupabase().from("items").select("id", { count: "exact", head: true }).eq("collection_id", id);
  expect(count).toBe(1);
});
