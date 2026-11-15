import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// SPEC.md §4 « Sauvegarde » : export de toutes les données (JSON + images).

test("exporter ses données en .zip : donnees.json et images", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("export", testInfo);
  const id = await creerCollection(utilisateur.id, "Cartes", 3, 1);
  await creerCollection(utilisateur.id, "Collection vide", 0, 0);

  // Une image stockée pour « Item 2 », comme après un import.
  const admin = adminSupabase();
  const { data: item2 } = await admin.from("items").select("id").eq("collection_id", id).eq("title", "Item 2").single();
  const chemin = `${utilisateur.id}/${id}/${item2!.id}.webp`;
  const octets = readFileSync("tests/e2e/fixtures/photo.jpg");
  const { error } = await admin.storage.from("items").upload(chemin, octets, { contentType: "image/webp" });
  expect(error).toBeNull();
  await admin.from("items").update({ image_path: chemin }).eq("id", item2!.id);

  await seConnecter(page, utilisateur);
  const telechargement = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter mes données" }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toMatch(/^suivi-collections-\d{4}-\d{2}-\d{2}\.zip$/);
  await expect(page.getByRole("status")).toContainText("Export prêt : 2 collections, 3 items, 1 image.");

  const zip = unzipSync(readFileSync(await fichier.path()));
  const donnees = JSON.parse(strFromU8(zip["donnees.json"]!));
  expect(donnees).toMatchObject({ format: "suivi-collections", version: 1, images_manquantes: [] });
  const cartes = donnees.collections.find((c: { nom: string }) => c.nom === "Cartes");
  expect(cartes.items.map((i: { intitule: string; possede: boolean }) => [i.intitule, i.possede])).toEqual([
    ["Item 1", true],
    ["Item 2", false],
    ["Item 3", false],
  ]);
  const image = cartes.items[1].image;
  expect(image).toBe(`images/${id}/${item2!.id}.webp`);
  expect(zip[image]?.length).toBe(octets.length);
});
