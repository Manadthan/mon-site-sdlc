import { describe, expect, it } from "vitest";
import type { CollectionCard } from "@/lib/collections/cards";
import { DEFAULT_SORT, nextSort, parseSort, serializeSort, sortCards } from "@/lib/collections/sort";

const carte = (name: string, createdAt: string, percent: number): CollectionCard => ({
  id: name,
  name,
  coverPath: null,
  createdAt,
  progress: { owned: percent, total: 100, percent },
});

const cartes = [
  carte("Éditions limitées", "2026-03-01T00:00:00Z", 50),
  carte("cartes 10", "2026-01-01T00:00:00Z", 100),
  carte("Cartes 9", "2026-11-01T00:00:00Z", 0),
  carte("Zelda", "2026-06-01T00:00:00Z", 50),
];
const noms = (liste: CollectionCard[]) => liste.map((c) => c.name);

describe("sortCards", () => {
  it("trie par nom : accents et majuscules ignorés, nombres dans l'ordre naturel", () => {
    expect(noms(sortCards(cartes, { key: "name", dir: "asc" }))).toEqual([
      "Cartes 9",
      "cartes 10",
      "Éditions limitées",
      "Zelda",
    ]);
    expect(noms(sortCards(cartes, { key: "name", dir: "desc" }))).toEqual([
      "Zelda",
      "Éditions limitées",
      "cartes 10",
      "Cartes 9",
    ]);
  });

  it("trie par date de création", () => {
    expect(noms(sortCards(cartes, { key: "date", dir: "desc" }))).toEqual([
      "Cartes 9",
      "Zelda",
      "Éditions limitées",
      "cartes 10",
    ]);
  });

  it("trie par % complété, à égalité par nom", () => {
    expect(noms(sortCards(cartes, { key: "percent", dir: "desc" }))).toEqual([
      "cartes 10",
      "Éditions limitées",
      "Zelda",
      "Cartes 9",
    ]);
    expect(noms(sortCards(cartes, { key: "percent", dir: "asc" }))).toEqual([
      "Cartes 9",
      "Éditions limitées",
      "Zelda",
      "cartes 10",
    ]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const copie = [...cartes];
    sortCards(cartes, { key: "name", dir: "asc" });
    expect(cartes).toEqual(copie);
  });
});

describe("parseSort / serializeSort", () => {
  it("relit le tri mémorisé", () => {
    expect(parseSort(serializeSort({ key: "percent", dir: "asc" }))).toEqual({ key: "percent", dir: "asc" });
  });

  it("revient au tri par défaut (plus récentes d'abord) si le cookie est absent ou invalide", () => {
    expect(parseSort(undefined)).toEqual(DEFAULT_SORT);
    expect(parseSort("prix:asc")).toEqual(DEFAULT_SORT);
    expect(parseSort("name:haut")).toEqual(DEFAULT_SORT);
  });
});

describe("nextSort", () => {
  it("inverse le sens quand on touche le critère actif", () => {
    expect(nextSort({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" });
    expect(nextSort({ key: "name", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" });
  });

  it("prend le sens naturel d'un nouveau critère", () => {
    expect(nextSort({ key: "date", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" });
    expect(nextSort({ key: "name", dir: "asc" }, "percent")).toEqual({ key: "percent", dir: "desc" });
    expect(nextSort({ key: "name", dir: "asc" }, "date")).toEqual({ key: "date", dir: "desc" });
  });
});
