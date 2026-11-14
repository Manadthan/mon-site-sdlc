import { describe, expect, it } from "vitest";
import { moveInList } from "@/lib/items/order";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
const ids = (liste: { id: string }[]) => liste.map((i) => i.id).join("");

describe("moveInList", () => {
  it("monte et descend un item d'une place", () => {
    expect(ids(moveInList(items, "b", "up"))).toBe("bac");
    expect(ids(moveInList(items, "b", "down"))).toBe("acb");
  });

  it("ne bouge pas le premier vers le haut ni le dernier vers le bas", () => {
    expect(moveInList(items, "a", "up")).toBe(items);
    expect(moveInList(items, "c", "down")).toBe(items);
  });

  it("ignore un identifiant inconnu et ne modifie pas la liste d'origine", () => {
    expect(moveInList(items, "z", "up")).toBe(items);
    moveInList(items, "b", "up");
    expect(ids(items)).toBe("abc");
  });
});
