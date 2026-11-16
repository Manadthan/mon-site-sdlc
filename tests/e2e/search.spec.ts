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

// US-14 — Nombre d'items par ligne : zoomer / dézoomer, choix mémorisé.
test("changer le nombre d'items par ligne", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("grille", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 8, 1);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  const vignettes = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  const parLigne = async () => {
    const tops = await vignettes.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  };
  const plus = page.getByRole("button", { name: "Plus d’items par ligne" });
  const moins = page.getByRole("button", { name: "Moins d’items par ligne" });

  await expect.poll(parLigne).toBe(2);
  await expect(moins).toBeDisabled();
  await plus.click();
  await expect.poll(parLigne).toBe(3);
  await plus.click();
  await expect.poll(parLigne).toBe(4);
  await expect(plus).toBeDisabled();

  // À 4 par ligne, l'intitulé n'est plus affiché mais reste lu (accessibilité) ; la coche reste visible.
  await expect(page.getByRole("button", { name: /Item 1/ }).getByTestId("coche-possede")).toBeVisible();
  await expect(page.getByRole("list", { name: "Items" }).getByTestId("intitule")).toHaveCount(8);

  // Mémorisé : rechargement et autre page de collection.
  await page.reload();
  await expect.poll(parLigne).toBe(4);

  // Le mode édition garde 2 par ligne.
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect.poll(parLigne).toBe(2);
});

// US-15 — Trier les items d'une collection (affichage seulement) ; US-14 : − / + toujours accessibles.
test("trier les items par nom ou par ordre, et garder − / + au défilement", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("tri-items", testInfo);
  // « Item 1 » à « Item 12 » : l'ordre naturel met « Item 2 » avant « Item 10 ».
  const id = await creerCollection(utilisateur.id, "Cartes", 12, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  const intitules = page.getByRole("list", { name: "Items" }).getByTestId("intitule");

  const tri = page.getByRole("group", { name: "Trier les items" });
  await expect(tri.getByRole("button", { name: /ordre de la collection/ })).toHaveAttribute("aria-pressed", "true");

  // Nom décroissant puis croissant (toucher à nouveau inverse le sens).
  await tri.getByRole("button", { name: "Trier par nom" }).click();
  await expect(intitules.first()).toHaveText("Item 1");
  await expect(intitules.nth(1)).toHaveText("Item 2");
  await tri.getByRole("button", { name: /Trier par nom, ordre croissant/ }).click();
  await expect(intitules.first()).toHaveText("Item 12");

  // Mémorisé ; le mode édition reste dans l'ordre de la collection.
  await page.reload();
  await expect(intitules.first()).toHaveText("Item 12");
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(intitules.first()).toHaveText("Item 1");
  await page.getByRole("button", { name: "Terminé" }).click();

  // Après un long défilement, − / + restent visibles (barre du haut).
  // Défilement par script : la molette n'existe pas dans le WebKit mobile de Playwright.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Plus d’items par ligne" })).toBeInViewport();
});
