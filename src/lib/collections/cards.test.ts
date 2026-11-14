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

  it("place la collection la plus récente en premier", () => {
    const cartes = toCollectionCards(
      [
        collection("ancienne", "A", "2026-01-01T00:00:00Z"),
        collection("recente", "B", "2026-11-14T00:00:00Z"),
        collection("milieu", "C", "2026-06-01T00:00:00Z"),
      ],
      [],
    );
    expect(cartes.map((c) => c.id)).toEqual(["recente", "milieu", "ancienne"]);
  });

  it("renvoie une liste vide sans collection", () => {
    expect(toCollectionCards([], [])).toEqual([]);
  });
});
