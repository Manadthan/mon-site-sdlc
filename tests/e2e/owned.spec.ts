import { expect, test } from "@playwright/test";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-07 — Marquer un item comme possédé (docs/SPEC.md)

test("un tap coche l'item (coche verte), le compteur suit, et c'est enregistré", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("coche", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes DBZ", 3, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  const item2 = page.getByRole("button", { name: /Item 2/ });
  const compteur = page.getByRole("banner");
  await expect(item2).toHaveAttribute("aria-pressed", "false");
  await expect(item2.getByTestId("coche-possede")).toHaveCount(0);
  await expect(compteur).toContainText(/0\s\/\s3 · 0\s%/);

  // Tap : coche verte en haut à droite et compteur immédiats.
  await item2.click();
  await expect(item2).toHaveAttribute("aria-pressed", "true");
  const coche = item2.getByTestId("coche-possede");
  await expect(coche).toBeVisible();
  await expect(compteur).toContainText(/1\s\/\s3 · 33\s%/);

  // La coche est dans l'angle haut droit de la vignette.
  const [vignette, boite] = await Promise.all([item2.boundingBox(), coche.boundingBox()]);
  expect(boite!.x + boite!.width).toBeGreaterThan(vignette!.x + vignette!.width * 0.75);
  expect(boite!.y).toBeLessThan(vignette!.y + vignette!.height * 0.25);

  // Enregistré : persiste après rechargement, en base, et sur l'accueil.
  await page.reload();
  await expect(item2).toHaveAttribute("aria-pressed", "true");
  await expect(compteur).toContainText(/1\s\/\s3 · 33\s%/);
  const { data } = await adminSupabase().from("items").select("title, owned").eq("collection_id", id).order("position");
  expect(data).toEqual([
    { title: "Item 1", owned: false },
    { title: "Item 2", owned: true },
    { title: "Item 3", owned: false },
  ]);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Cartes DBZ/ })).toContainText(/1\s\/\s3 · 33\s%/);
});

test("un tap accidentel s'annule d'un second tap", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("annule", testInfo);
  const id = await creerCollection(utilisateur.id, "Mangas", 2, 0);
  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);

  const item1 = page.getByRole("button", { name: /Item 1/ });
  await item1.click();
  await expect(item1).toHaveAttribute("aria-pressed", "true");
  await item1.click();
  await expect(item1).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("banner")).toContainText(/0\s\/\s2 · 0\s%/);

  // Même deux taps très rapprochés laissent l'état final juste, une fois enregistré.
  await item1.dblclick();
  await expect(item1).toHaveAttribute("aria-pressed", "false");
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(item1).toHaveAttribute("aria-pressed", "false");
});
