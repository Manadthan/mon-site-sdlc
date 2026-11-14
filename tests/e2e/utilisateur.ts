import { expect, type Page } from "@playwright/test";

/** Compte fictif, créé uniquement sur la base Supabase locale et jetable des tests. */
export const UTILISATEUR_TEST = {
  email: "e2e@exemple.fr",
  password: "Mot-de-passe-e2e-42",
} as const;

export async function seConnecter(page: Page, identifiants: { email: string; password: string } = UTILISATEUR_TEST) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(identifiants.email);
  await page.getByLabel("Mot de passe").fill(identifiants.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/");
}
