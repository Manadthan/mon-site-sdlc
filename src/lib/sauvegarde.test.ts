import { describe, expect, it } from "vitest";
import { construireExport } from "@/lib/export";
import { lireSauvegarde, nomSansDoublon } from "@/lib/sauvegarde";

describe("lireSauvegarde", () => {
  it("relit ce que l'export produit", () => {
    const { donnees } = construireExport(
      [{ id: "c1", name: "Mangas", source_url: "https://site.fr/liste", created_at: "2026-11-13T10:00:00Z" }],
      [
        { id: "i1", collection_id: "c1", title: "Tome 1", position: 1, owned: true, image_path: "u/c1/i1.webp", source_image: "https://site.fr/1.png", created_at: "x" },
        { id: "i2", collection_id: "c1", title: "Tome 2", position: 2, owned: false, image_path: null, source_image: null, created_at: "x" },
      ],
      new Date(),
    );
    expect(lireSauvegarde(JSON.parse(JSON.stringify(donnees)))).toEqual({
      ok: true,
      collections: [
        {
          nom: "Mangas",
          page_source: "https://site.fr/liste",
          items: [
            { intitule: "Tome 1", possede: true, image: "images/c1/i1.webp", image_source: "https://site.fr/1.png" },
            { intitule: "Tome 2", possede: false, image: null, image_source: null },
          ],
        },
      ],
    });
  });

  it.each([null, {}, { format: "autre", collections: [] }, { format: "suivi-collections", version: 1, collections: [{}] }])(
    "refuse un fichier qui n'est pas une sauvegarde : %j",
    (json) => {
      expect(lireSauvegarde(json)).toEqual({ ok: false, error: "Ce fichier n’est pas une sauvegarde de Suivi de collections." });
    },
  );

  it("refuse une version future et une sauvegarde vide", () => {
    expect(lireSauvegarde({ format: "suivi-collections", version: 99, collections: [] }).ok).toBe(false);
    expect(lireSauvegarde({ format: "suivi-collections", version: 1, collections: [] })).toEqual({
      ok: false,
      error: "Cette sauvegarde ne contient aucune collection.",
    });
  });

  it("nettoie les champs douteux", () => {
    const resultat = lireSauvegarde({
      format: "suivi-collections",
      version: 1,
      collections: [
        {
          nom: "  ",
          page_source: "javascript:alert(1)",
          items: [{ intitule: 42, possede: "oui", image: "../../etc/passwd", image_source: "file:///x" }],
        },
      ],
    });
    expect(resultat).toEqual({
      ok: true,
      collections: [
        {
          nom: "Collection importée",
          page_source: null,
          items: [{ intitule: "Sans titre", possede: false, image: null, image_source: null }],
        },
      ],
    });
  });
});

describe("nomSansDoublon", () => {
  it("garde le nom s'il est libre, sinon ajoute « (importée) », puis un numéro", () => {
    expect(nomSansDoublon("Cartes", ["Mangas"])).toBe("Cartes");
    expect(nomSansDoublon("Cartes", ["cartes"])).toBe("Cartes (importée)");
    expect(nomSansDoublon("Cartes", ["Cartes", "Cartes (importée)"])).toBe("Cartes (importée 2)");
  });
});
