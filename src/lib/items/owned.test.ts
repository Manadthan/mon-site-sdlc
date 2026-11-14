import { describe, expect, it } from "vitest";
import { applyOwned, countOwned } from "@/lib/items/owned";

const items = [
  { id: "a", owned: false },
  { id: "b", owned: true },
  { id: "c", owned: false },
];

describe("applyOwned", () => {
  it("change seulement l'item visé", () => {
    expect(applyOwned(items, "a", true)).toEqual([
      { id: "a", owned: true },
      { id: "b", owned: true },
      { id: "c", owned: false },
    ]);
  });

  it("ne modifie pas la liste d'origine", () => {
    applyOwned(items, "a", true);
    expect(items[0]).toEqual({ id: "a", owned: false });
  });

  it("deux taps successifs reviennent à l'état de départ", () => {
    expect(applyOwned(applyOwned(items, "b", false), "b", true)).toEqual(items);
  });

  it("ignore un identifiant inconnu", () => {
    expect(applyOwned(items, "z", true)).toEqual(items);
  });
});

describe("countOwned", () => {
  it("compte les items possédés", () => {
    expect(countOwned(items)).toBe(1);
    expect(countOwned([])).toBe(0);
  });
});
