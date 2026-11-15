import { describe, expect, it } from "vitest";
import { changerColonnes, parseColonnes } from "@/lib/items/grille";

describe("parseColonnes", () => {
  it("2 par défaut, 3 et 4 acceptés", () => {
    expect(parseColonnes(undefined)).toBe(2);
    expect(parseColonnes("abc")).toBe(2);
    expect(parseColonnes("9")).toBe(2);
    expect(parseColonnes("3")).toBe(3);
    expect(parseColonnes("4")).toBe(4);
  });
});

describe("changerColonnes", () => {
  it("ajoute ou retire une colonne, entre 2 et 4", () => {
    expect(changerColonnes(2, "plus")).toBe(3);
    expect(changerColonnes(4, "plus")).toBe(4);
    expect(changerColonnes(3, "moins")).toBe(2);
    expect(changerColonnes(2, "moins")).toBe(2);
  });
});
