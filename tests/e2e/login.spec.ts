import { expect, test } from "@playwright/test";
import { seConnecter, UTILISATEUR_TEST } from "./utilisateur";

// US-01 — Se connecter (docs/SPEC.md)

test("sans être connecté, toute page redirige vers l'écran de connexion", async ({ page }) => {
  for (const chemin of ["/", "/collections/new", "/une-page-quelconque"]) {
    await page.goto(chemin);
    await expect(page).toHaveURL("/login");
  }
  await expect(page.getByRole("heading", { name: "Suivi de collections" })).toBeVisible();
});

test("un mauvais mot de passe affiche une erreur qui ne dit pas quel champ est faux", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(UTILISATEUR_TEST.email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail ou mot de passe incorrect.");
  await expect(page).toHaveURL("/login");
  // L'e-mail reste saisi, le mot de passe est effacé.
  await expect(page.getByLabel("E-mail")).toHaveValue(UTILISATEUR_TEST.email);

  // Même message pour un e-mail inconnu.
  await page.getByLabel("E-mail").fill("inconnu@exemple.fr");
  await page.getByLabel("Mot de passe").fill(UTILISATEUR_TEST.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail ou mot de passe incorrect.");
});

test("la session reste ouverte après fermeture de Safari", async ({ page, context }) => {
  await seConnecter(page);
  await expect(page.getByRole("heading", { name: "Mes collections" })).toBeVisible();

  // Cookies persistants (avec date d'expiration) : ils survivent à la fermeture du navigateur.
  const cookiesSession = (await context.cookies()).filter((c) => c.name.startsWith("sb-"));
  expect(cookiesSession.length).toBeGreaterThan(0);
  const dansUnMois = Date.now() / 1000 + 30 * 24 * 3600;
  for (const cookie of cookiesSession) expect(cookie.expires).toBeGreaterThan(dansUnMois);

  // Nouvel onglet avec les mêmes cookies : toujours connecté.
  const nouvellePage = await context.newPage();
  await nouvellePage.goto("/");
  await expect(nouvellePage).toHaveURL("/");
  await expect(nouvellePage.getByRole("heading", { name: "Mes collections" })).toBeVisible();
});

test("un bouton permet de se déconnecter", async ({ page }) => {
  await seConnecter(page);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("un utilisateur connecté qui ouvre /login est renvoyé à l'accueil", async ({ page }) => {
  await seConnecter(page);
  await page.goto("/login");
  await expect(page).toHaveURL("/");
});
