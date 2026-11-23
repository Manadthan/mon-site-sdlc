import { describe, expect, it } from "vitest";
import type { CollectionCard } from "@/lib/collections/cards";
import { CATEGORIE_MAX, categoriesUtilisees, grouperParCategorie, harmoniserCategorie, validerCategorie } from "@/lib/collections/categorie";

const carte = (name: string, category: string | null): CollectionCard => ({
  id: name,
  name,
  category,
  coverPath: null,
  createdAt: "2026-01-01T00:00:00Z",
  progress: { owned: 0, total: 0, percent: 0 },
});

describe("validerCategorie", () => {
  it("retire les espaces en trop", () => {
    expect(validerCategorie("  Cartes   DBZ ")).toEqual({ ok: true, category: "Cartes DBZ" });
  });

  it("un champ vide (ou absent) donne « sans catégorie »", () => {
    expect(validerCategorie("   ")).toEqual({ ok: true, category: null });
    expect(validerCategorie(null)).toEqual({ ok: true, category: null });
  });

  it(`refuse plus de ${CATEGORIE_MAX} caractères`, () => {
    expect(validerCategorie("a".repeat(CATEGORIE_MAX)).ok).toBe(true);
    expect(validerCategorie("a".repeat(CATEGORIE_MAX + 1))).toEqual({
      ok: false,
      error: `La catégorie ne doit pas dépasser ${CATEGORIE_MAX} caractères.`,
    });
  });
});

describe("harmoniserCategorie", () => {
  it("reprend l'orthographe d'une catégorie existante qui ne diffère que par la casse", () => {
    expect(harmoniserCategorie("mangas", ["Cartes", null, "Mangas"])).toBe("Mangas");
  });

  it("garde une nouvelle catégorie telle quelle", () => {
    expect(harmoniserCategorie("DVD", ["Cartes"])).toBe("DVD");
    expect(harmoniserCategorie(null, ["Cartes"])).toBeNull();
  });
});

describe("categoriesUtilisees", () => {
  it("donne les catégories sans doublon ni vide, dans l'ordre alphabétique", () => {
    expect(categoriesUtilisees(["Mangas", null, "cartes", "DVD", "Mangas", "Écrans"])).toEqual(["cartes", "DVD", "Écrans", "Mangas"]);
  });
});

describe("grouperParCategorie", () => {
  it("une section par catégorie, alphabétique, « Sans catégorie » en dernier, ordre des cartes conservé", () => {
    const sections = grouperParCategorie([
      carte("Z", "Mangas"),
      carte("Divers", null),
      carte("DBZ", "Cartes"),
      carte("One Piece", "mangas"),
      carte("Pokémon", "Cartes"),
    ]);
    expect(sections.map((s) => [s.titre, s.cartes.map((c) => c.name)])).toEqual([
      ["Cartes", ["DBZ", "Pokémon"]],
      ["Mangas", ["Z", "One Piece"]],
      [null, ["Divers"]],
    ]);
  });

  it("sans aucune catégorie : une seule section sans titre", () => {
    expect(grouperParCategorie([carte("A", null), carte("B", null)])).toEqual([{ titre: null, cartes: [carte("A", null), carte("B", null)] }]);
  });

  it("pas de section « Sans catégorie » vide", () => {
    expect(grouperParCategorie([carte("A", "Cartes")]).map((s) => s.titre)).toEqual(["Cartes"]);
  });
});
