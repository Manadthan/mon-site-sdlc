import { describe, expect, it } from "vitest";
import { construireExport, nomFichierExport, VERSION_EXPORT } from "@/lib/export";

const maintenant = new Date("2026-11-15T12:00:00Z");
const collections = [
  { id: "c2", name: "Cartes", source_url: null, created_at: "2026-11-14T10:00:00Z" },
  { id: "c1", name: "Mangas", source_url: "https://www.kanzenshuu.com/manga/film-comics/", created_at: "2026-11-13T10:00:00Z" },
];
const item = (id: string, collection_id: string, position: number, image_path: string | null = null) => ({
  id,
  collection_id,
  title: `Item ${id}`,
  position,
  owned: position === 1,
  image_path,
  source_image: image_path ? `https://site.fr/${id}.png` : null,
  created_at: "2026-11-14T10:00:00Z",
});

describe("construireExport", () => {
  const { donnees, images } = construireExport(
    collections,
    [item("i2", "c1", 2, "u/c1/i2.webp"), item("i1", "c1", 1), item("i3", "c2", 1, "u/c2/i3.webp")],
    maintenant,
  );

  it("en-tête : format, version, date", () => {
    expect(donnees).toMatchObject({ format: "suivi-collections", version: VERSION_EXPORT, exporte_le: "2026-11-15T12:00:00.000Z" });
  });

  it("collections par date de création, items dans l'ordre d'affichage", () => {
    expect(donnees.collections.map((c) => c.nom)).toEqual(["Mangas", "Cartes"]);
    expect(donnees.collections[0]?.items.map((i) => i.intitule)).toEqual(["Item i1", "Item i2"]);
    expect(donnees.collections[0]?.page_source).toBe("https://www.kanzenshuu.com/manga/film-comics/");
  });

  it("chaque image est rangée dans le zip et le JSON y renvoie", () => {
    expect(donnees.collections[0]?.items[1]).toEqual({
      intitule: "Item i2",
      possede: false,
      image: "images/c1/i2.webp",
      image_source: "https://site.fr/i2.png",
      ajoute_le: "2026-11-14T10:00:00Z",
    });
    expect(donnees.collections[0]?.items[0]?.image).toBeNull();
    expect(images).toEqual([
      { cheminZip: "images/c1/i2.webp", cheminStockage: "u/c1/i2.webp" },
      { cheminZip: "images/c2/i3.webp", cheminStockage: "u/c2/i3.webp" },
    ]);
  });

  it("collection vide : liste d'items vide", () => {
    expect(construireExport([collections[0]!], [], maintenant).donnees.collections[0]?.items).toEqual([]);
  });
});

describe("nomFichierExport", () => {
  it("contient la date du jour", () => {
    expect(nomFichierExport(maintenant)).toBe("suivi-collections-2026-11-15.zip");
  });
});
