import { expect, test } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-19 — Regrouper les collections par catégorie (docs/SPEC.md).

test("l'accueil regroupe les collections par catégorie, « Sans catégorie » en dernier", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("categories", testInfo);
  const admin = adminSupabase();
  await creerCollection(utilisateur.id, "Divers", 0, 0);
  const dbz = await creerCollection(utilisateur.id, "Cartes DBZ", 0, 0);
  const onePiece = await creerCollection(utilisateur.id, "One Piece", 0, 0);
  await seConnecter(page, utilisateur);

  // Aucune catégorie : simple liste, sans titre de section.
  await expect(page.getByRole("list", { name: "Mes collections" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("region")).toHaveCount(0);

  await admin.from("collections").update({ category: "Mangas" }).eq("id", onePiece);
  await admin.from("collections").update({ category: "Cartes" }).eq("id", dbz);
  await page.reload();
  const sections = page.getByRole("region");
  await expect(sections.getByRole("heading", { level: 2 }).filter({ hasText: "·" })).toHaveText([/^Cartes · 1$/, /^Mangas · 1$/, /^Sans catégorie · 1$/]);
  await expect(page.getByRole("region", { name: "Cartes" })).toContainText("Cartes DBZ");
  await expect(page.getByRole("region", { name: "Sans catégorie" })).toContainText("Divers");
});

test("choisir une catégorie à la création et en mode édition, avec suggestions", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("categorie-saisie", testInfo);
  const id = await creerCollection(utilisateur.id, "One Piece", 1, 0);
  await adminSupabase().from("collections").update({ category: "Mangas" }).eq("id", id);
  await seConnecter(page, utilisateur);

  // Création : la catégorie existante est proposée ; « mangas » rejoint « Mangas ».
  await page.goto("/collections/new");
  const champ = page.getByLabel("Catégorie");
  await expect(page.locator(`datalist#${await champ.getAttribute("list")} option`)).toHaveAttribute("value", "Mangas");
  await page.getByLabel("Nom de la collection").fill("Naruto");
  await champ.fill("  mangas ");
  await page.getByRole("button", { name: "Créer une collection vide" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("region", { name: "Mangas" }).getByRole("listitem")).toHaveCount(2);

  // Mode édition : panneau « Nom et catégorie ».
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Modifier le nom et la catégorie" }).click();
  const panneau = page.getByRole("dialog", { name: "Nom et catégorie" });
  await expect(panneau.getByLabel("Catégorie")).toHaveValue("Mangas");
  await panneau.getByLabel("Catégorie").fill("Livres");
  await panneau.getByRole("button", { name: "Enregistrer" }).click();
  await expect(panneau).toBeHidden();

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Livres" })).toContainText("One Piece");
  await expect(page.getByRole("region", { name: "Mangas" })).toContainText("Naruto");

  // Vider le champ retire la catégorie.
  await page.goto(`/collections/${id}`);
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Modifier le nom et la catégorie" }).click();
  await page.getByRole("dialog", { name: "Nom et catégorie" }).getByLabel("Catégorie").fill("");
  await page.getByRole("dialog", { name: "Nom et catégorie" }).getByRole("button", { name: "Enregistrer" }).click();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Sans catégorie" })).toContainText("One Piece");
});

test("la liste partagée est regroupée de la même façon", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("categorie-partage", testInfo);
  const admin = adminSupabase();
  const id = await creerCollection(utilisateur.id, "Cartes DBZ", 0, 0);
  await creerCollection(utilisateur.id, "Divers", 0, 0);
  await admin.from("collections").update({ category: "Cartes" }).eq("id", id);
  const jeton = "categorie-partage-" + "x".repeat(43 - "categorie-partage-".length);
  await admin.from("partages").insert({ user_id: utilisateur.id, token: jeton });

  await page.goto(`/partage/${jeton}`);
  await expect(page.getByRole("region", { name: "Cartes" })).toContainText("Cartes DBZ");
  await expect(page.getByRole("region", { name: "Sans catégorie" })).toContainText("Divers");
});
