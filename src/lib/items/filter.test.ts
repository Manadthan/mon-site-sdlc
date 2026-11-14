import { describe, expect, it } from "vitest";
import { filtrerItems, normaliser } from "@/lib/items/filter";

const items = [
  { title: "Dragon Ball Movie 01", owned: true },
  { title: "Dragon Ball Z Movie 01", owned: false },
  { title: "N°5 - Les épis de blé", owned: false },
  { title: "Jump Super Anime Tour", owned: true },
];
const titres = (liste: typeof items) => liste.map((i) => i.title);

describe("normaliser", () => {
  it("ignore majuscules, accents et espaces en trop", () => {
    expect(normaliser("  Épis   de BLÉ ")).toBe("epis de ble");
  });
});

describe("filtrerItems", () => {
  it("Tous, sans recherche : tout, dans l'ordre", () => {
    expect(filtrerItems(items, "tous", "")).toEqual(items);
  });

  it("Possédés / Manquants", () => {
    expect(titres(filtrerItems(items, "possedes", ""))).toEqual(["Dragon Ball Movie 01", "Jump Super Anime Tour"]);
    expect(titres(filtrerItems(items, "manquants", ""))).toEqual(["Dragon Ball Z Movie 01", "N°5 - Les épis de blé"]);
  });

  it("recherche sans tenir compte des majuscules ni des accents", () => {
    expect(titres(filtrerItems(items, "tous", "EPIS"))).toEqual(["N°5 - Les épis de blé"]);
  });

  it("tous les mots doivent apparaître, dans n'importe quel ordre", () => {
    expect(titres(filtrerItems(items, "tous", "movie z"))).toEqual(["Dragon Ball Z Movie 01"]);
    expect(titres(filtrerItems(items, "tous", "movie 01"))).toEqual(["Dragon Ball Movie 01", "Dragon Ball Z Movie 01"]);
  });

  it("combine filtre et recherche", () => {
    expect(titres(filtrerItems(items, "possedes", "movie"))).toEqual(["Dragon Ball Movie 01"]);
    expect(filtrerItems(items, "manquants", "jump")).toEqual([]);
  });
});
