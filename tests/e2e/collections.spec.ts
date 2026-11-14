import { expect, test } from "@playwright/test";
import { creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-02 — Voir mes collections (docs/SPEC.md)

test("un état vide explique comment créer la première collection", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("vide", testInfo);
  await seConnecter(page, utilisateur);

  await expect(page.getByRole("heading", { name: "Aucune collection pour l’instant" })).toBeVisible();
  await expect(page.getByText("Nouvelle collection")).toBeVisible();
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
