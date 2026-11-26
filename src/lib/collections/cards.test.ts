import { describe, expect, it } from "vitest";
import { toCollectionCards } from "@/lib/collections/cards";

const collection = (id: string, name: string, created_at: string) => ({ id, name, cover_path: null, created_at });

describe("toCollectionCards", () => {
  it("associe à chaque collection ses statistiques", () => {
    const cartes = toCollectionCards(
      [collection("a", "Cartes DBZ", "2026-11-01T10:00:00Z")],
      [{ collection_id: "a", owned: 12, total: 48 }],
    );
    expect(cartes).toEqual([
      {
        id: "a",
        name: "Cartes DBZ",
        category: null,
        coverPath: null,
        createdAt: "2026-11-01T10:00:00Z",
        progress: { owned: 12, total: 48, percent: 25 },
      },
    ]);
  });

  it("affiche 0 / 0 pour une collection sans statistiques", () => {
    const [carte] = toCollectionCards([collection("a", "Vide", "2026-11-01T10:00:00Z")], []);
    expect(carte?.progress).toEqual({ owned: 0, total: 0, percent: 0 });
  });

  it("renvoie une liste vide sans collection", () => {
    expect(toCollectionCards([], [])).toEqual([]);
  });
});

describe("toCollectionCards — couverture (issue #59)", () => {
  it("prend la couverture calculée par la vue, sinon cover_path, sinon rien", () => {
    const cartes = toCollectionCards(
      [
        { id: "a", name: "A", cover_path: null, created_at: "2026-11-13" },
        { id: "b", name: "B", cover_path: "u/b/choisie.webp", created_at: "2026-11-13" },
        { id: "c", name: "C", cover_path: null, created_at: "2026-11-13" },
      ],
      [
        { collection_id: "a", owned: 0, total: 2, cover_path: "u/a/premier.webp" },
        { collection_id: "b", owned: 0, total: 0, cover_path: null },
        { collection_id: "c", owned: 0, total: 0, cover_path: null },
      ],
    );
    expect(cartes.map((c) => c.coverPath)).toEqual(["u/a/premier.webp", "u/b/choisie.webp", null]);
  });
});

describe("toCollectionCards — catégorie (US-19)", () => {
  it("reprend la catégorie, null si absente", () => {
    const [avec, sans] = toCollectionCards(
      [{ ...collection("a", "Cartes DBZ", "2026-11-01T10:00:00Z"), category: "Cartes" }, collection("b", "Divers", "2026-11-01T10:00:00Z")],
      [],
    );
    expect(avec?.category).toBe("Cartes");
    expect(sans?.category).toBeNull();
  });
});

describe("toCollectionCards — collections liées", () => {
  it("ajoute les champs externes uniquement quand external_url est renseignée", () => {
    const [liee, locale] = toCollectionCards(
      [
        {
          ...collection("a", "Wii U · Europe", "2026-11-26T10:00:00Z"),
          external_url: "https://nintendo-db.vercel.app/?console=wii-u&marche=pal",
          external_source: "nintendo-db",
          external_cover_url: "https://exemple.supabase.co/jaquette-300.webp",
        },
        {
          ...collection("b", "Locale", "2026-11-26T10:00:00Z"),
          external_url: null,
          external_source: null,
          external_cover_url: null,
        },
      ],
      [{ collection_id: "a", owned: 14, total: 42 }],
    );
    expect(liee).toEqual({
      id: "a",
      name: "Wii U · Europe",
      category: null,
      coverPath: null,
      createdAt: "2026-11-26T10:00:00Z",
      progress: { owned: 14, total: 42, percent: 33 },
      externalUrl: "https://nintendo-db.vercel.app/?console=wii-u&marche=pal",
      externalSource: "nintendo-db",
      externalCoverUrl: "https://exemple.supabase.co/jaquette-300.webp",
    });
    expect(locale).not.toHaveProperty("externalUrl");
  });
});
