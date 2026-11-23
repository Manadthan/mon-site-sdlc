import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { adminSupabase, creerCollection, nouvelUtilisateur } from "./supabase-admin";
import { seConnecter } from "./utilisateur";

// US-18 — Dupliquer une collection (docs/SPEC.md).

test("dupliquer une collection : items, ordre et images copiés, rien de coché", async ({ page }, testInfo) => {
  const utilisateur = await nouvelUtilisateur("dupliquer", testInfo);
  const admin = adminSupabase();
  const id = await creerCollection(utilisateur.id, "Cartes DBZ", 3, 2);
  await admin.from("collections").update({ category: "Cartes" }).eq("id", id);
  // Une vignette sur l'item 1, dans le dossier de la collection d'origine.
  const { data: item1 } = await admin.from("items").select("id").eq("collection_id", id).eq("title", "Item 1").single();
  const origine = `${utilisateur.id}/${id}/${item1!.id}-v2.webp`;
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ff8800" } }).webp().toBuffer();
  await admin.storage.from("items").upload(origine, image, { contentType: "image/webp" });
  await admin.from("items").update({ image_path: origine }).eq("id", item1!.id);

  await seConnecter(page, utilisateur);
  await page.goto(`/collections/${id}`);
  // Seulement en mode édition.
  await expect(page.getByRole("button", { name: "Dupliquer la collection" })).toHaveCount(0);
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Dupliquer la collection" }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Dupliquer « Cartes DBZ » et ses 3 items ?" });
  await confirmation.getByRole("button", { name: "Dupliquer" }).click();

  // La copie s'ouvre : même items dans le même ordre, aucun coché.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cartes DBZ (copie)");
  await expect(page).not.toHaveURL(`/collections/${id}`);
  const copieId = page.url().split("/").pop()!;
  await expect(page.getByRole("list", { name: "Items" }).getByTestId("intitule")).toHaveText(["Item 1", "Item 2", "Item 3"]);
  await expect(page.getByRole("banner")).toContainText(/0\s\/\s3 · 0\s%/);

  // Image copiée dans le dossier de la copie ; catégorie gardée.
  const { data: copie } = await admin.from("collections").select("category").eq("id", copieId).single();
  expect(copie!.category).toBe("Cartes");
  const { data: items } = await admin.from("items").select("title, image_path, owned").eq("collection_id", copieId).order("position");
  expect(items!.map((i) => i.owned)).toEqual([false, false, false]);
  expect(items![0]!.image_path).toMatch(new RegExp(`^${utilisateur.id}/${copieId}/[0-9a-f-]+-v2\\.webp$`));

  // Les images de la copie sont indépendantes : supprimer l'original ne les efface pas.
  await page.goto("/");
  await page.getByRole("button", { name: "Supprimer la collection Cartes DBZ", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(1);
  const { data: fichier, error } = await admin.storage.from("items").download(items![0]!.image_path!);
  expect(error).toBeNull();
  expect(fichier!.size).toBeGreaterThan(0);

  // Nom déjà pris : « (copie 2) ».
  const autre = await creerCollection(utilisateur.id, "Cartes DBZ", 0, 0);
  await page.goto(`/collections/${autre}`);
  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Dupliquer la collection" }).click();
  await page.getByRole("alertdialog", { name: "Dupliquer « Cartes DBZ » ?" }).getByRole("button", { name: "Dupliquer" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cartes DBZ (copie 2)");
});
