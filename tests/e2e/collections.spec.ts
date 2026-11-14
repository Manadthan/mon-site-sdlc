import { expect, test } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-02 — Voir mes collections (docs/SPEC.md)

test("un état vide explique comment créer la première collection", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("vide", testInfo);
  await seConnecter(page, utilisateur);

  await expect(page.getByRole("heading", { name: "Aucune collection pour l’instant" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer ma première collection" })).toBeVisible();
});

// US-03 (1/2) — Créer une collection vide

test("créer une collection vide depuis l'accueil", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("creation", testInfo);
  await seConnecter(page, utilisateur);

  await page.getByRole("link", { name: "Créer ma première collection" }).click();
  await expect(page).toHaveURL("/collections/new");

  // Nom obligatoire.
  await page.getByRole("button", { name: "Créer une collection vide" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Donnez un nom à la collection.");

  await page.getByLabel("Nom de la collection").fill("  Film   comics ");
  await page.getByRole("button", { name: "Créer une collection vide" }).click();

  await expect(page).toHaveURL("/");
  const cartes = page.getByRole("list", { name: "Mes collections" }).getByRole("listitem");
  await expect(cartes).toHaveCount(1);
  await expect(cartes.first()).toContainText("Film comics");
  await expect(cartes.first()).toContainText(/0\s\/\s0 · 0\s%/);

  // Une fois la liste non vide, le bouton flottant mène aussi à la création ; la croix ramène à l'accueil.
  await page.getByRole("link", { name: "Nouvelle collection" }).click();
  await expect(page).toHaveURL("/collections/new");
  await page.getByRole("link", { name: "Annuler et revenir" }).click();
  await expect(page).toHaveURL("/");
});

test("chaque collection affiche son nom et « possédés / total » avec le %", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("liste", testInfo);
  await creerCollection(utilisateur.id, "Film comics", 0, 0);
  await creerCollection(utilisateur.id, "Cartes DBZ", 12, 3);

  // Un autre utilisateur : sa collection ne doit jamais apparaître (RLS de bout en bout).
  const autre = await nouvelUtilisateur("autre", testInfo);
  await creerCollection(autre.id, "Collection d'un autre", 5, 5);

  await seConnecter(page, utilisateur);
  const cartes = page.getByRole("list", { name: "Mes collections" }).getByRole("listitem");
  await expect(cartes).toHaveCount(2);

  // La plus récente en premier.
  await expect(cartes.nth(0)).toContainText("Cartes DBZ");
  await expect(cartes.nth(0)).toContainText(/3\s\/\s12 · 25\s%/);
  await expect(cartes.nth(0).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");

  await expect(cartes.nth(1)).toContainText("Film comics");
  await expect(cartes.nth(1)).toContainText(/0\s\/\s0 · 0\s%/);

  await expect(page.getByText("Collection d'un autre")).toHaveCount(0);
});

test("la liste reste lisible à 375 px, même avec un nom très long", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("long", testInfo);
  await creerCollection(utilisateur.id, "Une collection au nom vraiment très long qui ne tient pas sur une ligne", 4, 1);
  await seConnecter(page, utilisateur);

  await expect(page.getByRole("list", { name: "Mes collections" })).toBeVisible();
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largeur).toBeLessThanOrEqual(375);
});

// US-04 — Supprimer une collection

test("supprimer une collection demande confirmation et efface aussi ses items", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("suppression", testInfo);
  const idGardee = await creerCollection(utilisateur.id, "À garder", 2, 1);
  const idSupprimee = await creerCollection(utilisateur.id, "Cartes DBZ", 3, 1);
  await seConnecter(page, utilisateur);

  const cartes = page.getByRole("list", { name: "Mes collections" }).getByRole("listitem");
  await expect(cartes).toHaveCount(2);

  // La confirmation annonce ce qui sera supprimé ; « Annuler » ne supprime rien.
  await page.getByRole("button", { name: "Supprimer la collection Cartes DBZ" }).click();
  const dialogue = page.getByRole("alertdialog");
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByRole("heading")).toHaveText("Supprimer « Cartes DBZ » et ses 3 items ?");
  await dialogue.getByRole("button", { name: "Annuler" }).click();
  await expect(dialogue).toBeHidden();
  await expect(cartes).toHaveCount(2);

  // Confirmer supprime la collection, et seulement elle.
  await page.getByRole("button", { name: "Supprimer la collection Cartes DBZ" }).click();
  await dialogue.getByRole("button", { name: "Supprimer" }).click();
  await expect(dialogue).toBeHidden();
  await expect(cartes).toHaveCount(1);
  await expect(cartes.first()).toContainText("À garder");

  // Persisté, et les items sont partis avec la collection.
  await page.reload();
  await expect(cartes).toHaveCount(1);
  const admin = adminSupabase();
  const { count: itemsSupprimes } = await admin
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", idSupprimee);
  expect(itemsSupprimes).toBe(0);
  const { count: itemsGardes } = await admin
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", idGardee);
  expect(itemsGardes).toBe(2);
});

// US-05 — Trier les collections

test("trier par nom, date et % complété, et retrouver le dernier tri à la visite suivante", async ({ page, context }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("tri", testInfo);
  // Créées dans cet ordre : Bravo (la plus ancienne), puis alpha, puis Charlie (la plus récente).
  await creerCollection(utilisateur.id, "Bravo", 4, 4); // 100 %
  await creerCollection(utilisateur.id, "alpha", 4, 1); // 25 %
  await creerCollection(utilisateur.id, "Charlie", 4, 2); // 50 %
  await seConnecter(page, utilisateur);

  const noms = page.getByRole("list", { name: "Mes collections" }).getByRole("heading");
  const bouton = (libelle: string) => page.getByRole("button", { name: new RegExp(`^Trier par ${libelle}`) });

  // Par défaut : les plus récentes d'abord.
  await expect(noms).toHaveText(["Charlie", "alpha", "Bravo"]);

  // Nom : A → Z (sans tenir compte des majuscules), puis Z → A en touchant à nouveau.
  await bouton("nom").click();
  await expect(noms).toHaveText(["alpha", "Bravo", "Charlie"]);
  await expect(bouton("nom")).toHaveAttribute("aria-pressed", "true");
  await bouton("nom").click();
  await expect(noms).toHaveText(["Charlie", "Bravo", "alpha"]);

  // % complété : les plus complètes d'abord, puis l'inverse.
  await bouton("pourcentage").click();
  await expect(noms).toHaveText(["Bravo", "Charlie", "alpha"]);
  await bouton("pourcentage").click();
  await expect(noms).toHaveText(["alpha", "Charlie", "Bravo"]);

  // Date : les plus récentes d'abord, puis les plus anciennes.
  await bouton("date").click();
  await expect(noms).toHaveText(["Charlie", "alpha", "Bravo"]);
  await bouton("date").click();
  await expect(noms).toHaveText(["Bravo", "alpha", "Charlie"]);

  // Le dernier tri est conservé : rechargement, puis nouvel onglet (même navigateur).
  await page.reload();
  await expect(noms).toHaveText(["Bravo", "alpha", "Charlie"]);
  const autreOnglet = await context.newPage();
  await autreOnglet.goto("/");
  await expect(autreOnglet.getByRole("list", { name: "Mes collections" }).getByRole("heading")).toHaveText([
    "Bravo",
    "alpha",
    "Charlie",
  ]);
});
