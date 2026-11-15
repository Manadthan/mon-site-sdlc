import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-11 — Importer une sauvegarde (le .zip de « Exporter mes données »).

const photo = readFileSync("tests/e2e/fixtures/photo.jpg");
const sauvegarde = (donnees: unknown, images: Record<string, Uint8Array> = {}) =>
  Buffer.from(zipSync({ "donnees.json": strToU8(JSON.stringify(donnees)), ...images }));

test("importer une sauvegarde ajoute les collections, sans toucher à l'existant", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("import-sauvegarde", testInfo);
  await creerCollection(utilisateur.id, "Cartes", 2, 2);
  await seConnecter(page, utilisateur);

  const fichier = sauvegarde(
    {
      format: "suivi-collections",
      version: 1,
      exporte_le: "2026-11-15T12:00:00.000Z",
      collections: [
        {
          nom: "Cartes",
          page_source: "https://www.kanzenshuu.com/manga/film-comics/",
          items: [
            { intitule: "Carte A", possede: true, image: "images/c1/a.webp", image_source: "https://site.fr/a.png" },
            { intitule: "Carte B", possede: false, image: null, image_source: null },
          ],
        },
        { nom: "Mangas", page_source: null, items: [] },
      ],
    },
    { "images/c1/a.webp": photo },
  );

  await page.getByLabel("Fichier de sauvegarde").setInputFiles({ name: "sauvegarde.zip", mimeType: "application/zip", buffer: fichier });
  await expect(page.getByText("2 collections importées.")).toBeVisible();

  // L'existant est intact ; le doublon de nom est renommé.
  const cartes = page.getByRole("list", { name: "Mes collections" }).getByRole("listitem");
  await expect(cartes).toHaveCount(3);
  await expect(page.getByRole("list", { name: "Mes collections" })).toContainText("Cartes (importée)");
  await expect(page.getByRole("list", { name: "Mes collections" })).toContainText("Mangas");

  // Items, ordre, coches et image de la collection importée.
  const { data } = await adminSupabase()
    .from("collections")
    .select("source_url, items(title, owned, position, image_path, source_image)")
    .eq("user_id", utilisateur.id)
    .eq("name", "Cartes (importée)")
    .single();
  const items = [...data!.items].sort((a, b) => a.position - b.position);
  expect(data!.source_url).toBe("https://www.kanzenshuu.com/manga/film-comics/");
  expect(items.map((i) => [i.title, i.owned])).toEqual([
    ["Carte A", true],
    ["Carte B", false],
  ]);
  expect(items[0]!.image_path).toMatch(/\.webp$/);
  expect(items[0]!.source_image).toBe("https://site.fr/a.png");
  expect(items[1]!.image_path).toBeNull();
});

test("un fichier qui n'est pas une sauvegarde est refusé sans rien ajouter", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("import-invalide", testInfo);
  await seConnecter(page, utilisateur);

  await page.getByLabel("Fichier de sauvegarde").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Ce fichier n’est pas une sauvegarde de Suivi de collections.");

  await page.getByLabel("Fichier de sauvegarde").setInputFiles({
    name: "autre.zip",
    mimeType: "application/zip",
    buffer: sauvegarde({ format: "suivi-collections", version: 1, collections: [] }),
  });
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Cette sauvegarde ne contient aucune collection.");

  const { count } = await adminSupabase().from("collections").select("id", { count: "exact", head: true }).eq("user_id", utilisateur.id);
  expect(count).toBe(0);
});
