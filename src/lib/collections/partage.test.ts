import { describe, expect, it } from "vitest";
import {
  estJetonPartage,
  lienPartage,
  lireCollectionPartagee,
  lireCollectionsPartagees,
  nouveauJetonPartage,
} from "@/lib/collections/partage";

describe("jeton de partage", () => {
  it("fait 43 caractères base64url et change à chaque fois", () => {
    const a = nouveauJetonPartage();
    const b = nouveauJetonPartage();
    expect(estJetonPartage(a)).toBe(true);
    expect(a).toHaveLength(43);
    expect(a).not.toBe(b);
  });

  it("refuse ce qui n'a pas la forme d'un jeton", () => {
    expect(estJetonPartage("court")).toBe(false);
    expect(estJetonPartage("a".repeat(44))).toBe(false);
    expect(estJetonPartage(`${"a".repeat(42)}/`)).toBe(false);
    expect(estJetonPartage(undefined)).toBe(false);
  });
});

describe("lienPartage", () => {
  it("construit l'adresse du lien, avec ou sans / final", () => {
    expect(lienPartage("https://exemple.fr", "abc")).toBe("https://exemple.fr/partage/abc");
    expect(lienPartage("https://exemple.fr/", "abc")).toBe("https://exemple.fr/partage/abc");
  });
});

describe("lireCollectionPartagee", () => {
  const item = { id: "1", title: "Goku", image_path: null, owned: true };

  it("lit le nom et les items", () => {
    expect(lireCollectionPartagee({ name: "Cartes", items: [item] })).toEqual({ name: "Cartes", items: [item] });
    expect(lireCollectionPartagee({ name: "Vide", items: [] })).toEqual({ name: "Vide", items: [] });
  });

  it("ne garde que les champs attendus", () => {
    expect(lireCollectionPartagee({ name: "C", items: [{ ...item, autre: 1 }] })?.items[0]).toEqual(item);
  });

  it("renvoie null pour un lien invalide ou une réponse mal formée", () => {
    expect(lireCollectionPartagee(null)).toBeNull();
    expect(lireCollectionPartagee({ name: "C" })).toBeNull();
    expect(lireCollectionPartagee({ name: "C", items: [{ id: 1 }] })).toBeNull();
  });
});

describe("lireCollectionsPartagees", () => {
  const ligne = { id: "c1", name: "Cartes", created_at: "2026-01-01T00:00:00Z", cover_path: null, owned: 1, total: 4 };

  it("transforme la liste en cartes, comme l'accueil", () => {
    expect(lireCollectionsPartagees([ligne])).toEqual([
      {
        id: "c1",
        name: "Cartes",
        category: null,
        coverPath: null,
        createdAt: "2026-01-01T00:00:00Z",
        progress: { owned: 1, total: 4, percent: 25 },
      },
    ]);
    expect(lireCollectionsPartagees([])).toEqual([]);
  });

  it("renvoie null pour un lien invalide ou une réponse mal formée", () => {
    expect(lireCollectionsPartagees(null)).toBeNull();
    expect(lireCollectionsPartagees([{ ...ligne, total: "4" }])).toBeNull();
    expect(lireCollectionsPartagees([null])).toBeNull();
  });
});

describe("lireCollectionsPartagees — catégorie (US-19)", () => {
  const ligne = { id: "c1", name: "Cartes", created_at: "2026-01-01T00:00:00Z", cover_path: null, owned: 1, total: 4 };

  it("reprend la catégorie de la collection", () => {
    expect(lireCollectionsPartagees([{ ...ligne, category: "Mangas" }])?.[0]?.category).toBe("Mangas");
    expect(lireCollectionsPartagees([{ ...ligne, category: null }])?.[0]?.category).toBeNull();
  });

  it("refuse une catégorie mal formée", () => {
    expect(lireCollectionsPartagees([{ ...ligne, category: 3 }])).toBeNull();
  });
});

describe("lireCollectionsPartagees — collections liées", () => {
  const ligne = { id: "c1", name: "Wii U", created_at: "2026-01-01T00:00:00Z", cover_path: null, owned: 14, total: 42 };

  it("reprend les champs externes uniquement quand external_url est renseignée", () => {
    const cartes = lireCollectionsPartagees([
      {
        ...ligne,
        external_url: "https://nintendo-db.vercel.app/?console=wii-u",
        external_source: "nintendo-db",
        external_cover_url: "https://exemple.supabase.co/jaquette-300.webp",
      },
      { ...ligne, id: "c2", external_url: null, external_source: null, external_cover_url: null },
    ]);
    expect(cartes?.[0]).toMatchObject({
      externalUrl: "https://nintendo-db.vercel.app/?console=wii-u",
      externalSource: "nintendo-db",
      externalCoverUrl: "https://exemple.supabase.co/jaquette-300.webp",
    });
    expect(cartes?.[1]).not.toHaveProperty("externalUrl");
  });

  it("refuse des champs externes mal formés", () => {
    expect(lireCollectionsPartagees([{ ...ligne, external_url: 42 }])).toBeNull();
  });
});
