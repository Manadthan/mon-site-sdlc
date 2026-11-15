import { expect, test } from "@playwright/test";
import { creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-09 — Rechercher et filtrer dans une collection (docs/SPEC.md)

test("rechercher sur l'intitulé et filtrer Tous / Possédés / Manquants", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("recherche", testInfo);
  // 12 items : « Item 1 » à « Item 12 », les 2 premiers possédés.
  const id = await creerCollection(utilisateur.id, "Cartes", 12, 2);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  const intitules = page.getByRole("list", { name: "Items" }).getByTestId("intitule");
  const compteur = page.getByRole("banner");
  await expect(intitules).toHaveCount(12);

  // Recherche : sans tenir compte des majuscules.
  const recherche = page.getByRole("searchbox", { name: "Rechercher dans la collection" });
  await recherche.fill("ITEM 1");
  await expect(intitules).toHaveText(["Item 1", "Item 10", "Item 11", "Item 12"]);

  // Filtre combiné à la recherche ; le compteur porte toujours sur toute la collection.
  const filtres = page.getByRole("group", { name: "Filtrer" });
  await filtres.getByRole("button", { name: "Possédés" }).click();
  await expect(filtres.getByRole("button", { name: "Possédés" })).toHaveAttribute("aria-pressed", "true");
  await expect(intitules).toHaveText(["Item 1"]);
  await expect(compteur).toContainText(/2\s\/\s12/);

  await filtres.getByRole("button", { name: "Manquants" }).click();
  await expect(intitules).toHaveText(["Item 10", "Item 11", "Item 12"]);

  // Cocher un item manquant le fait passer dans « Possédés ».
  await page.getByRole("button", { name: /Item 11/ }).click();
  await expect(intitules).toHaveText(["Item 10", "Item 12"]);
  await expect(compteur).toContainText(/3\s\/\s12/);

  await recherche.fill("introuvable");
  await expect(page.getByText("Aucun item ne correspond.")).toBeVisible();

  // « Tous » et recherche vide : tout revient, dans l'ordre.
  await recherche.fill("");
  await filtres.getByRole("button", { name: "Tous" }).click();
  await expect(intitules).toHaveCount(12);

  // Le mode édition montre toujours tous les items (pour réordonner sans surprise).
  await filtres.getByRole("button", { name: "Manquants" }).click();
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Items" }).getByRole("listitem")).toHaveCount(12);
});
