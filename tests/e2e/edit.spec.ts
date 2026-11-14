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
