import { describe, expect, it } from "vitest";
import { INTITULE_MAX, positionSuivante, validateItemTitle } from "@/lib/items/title";

describe("validateItemTitle", () => {
  it("accepte un intitulé et nettoie les espaces", () => {
    expect(validateItemTitle("  N°49 —   Carte secrète ")).toEqual({ ok: true, title: "N°49 — Carte secrète" });
  });

  it("refuse un intitulé vide", () => {
    expect(validateItemTitle(" ")).toEqual({ ok: false, error: "Donnez un intitulé à l’item." });
    expect(validateItemTitle(undefined)).toMatchObject({ ok: false });
  });

  it("accepte exactement la longueur maximale, refuse au-delà", () => {
    expect(validateItemTitle("a".repeat(INTITULE_MAX))).toMatchObject({ ok: true });
    expect(validateItemTitle("a".repeat(INTITULE_MAX + 1))).toMatchObject({ ok: false });
  });
});

describe("positionSuivante", () => {
  it("place le premier item en position 1", () => {
    expect(positionSuivante(null)).toBe(1);
    expect(positionSuivante(undefined)).toBe(1);
  });

  it("place un nouvel item après le dernier, même s'il y a des trous", () => {
    expect(positionSuivante(3)).toBe(4);
    expect(positionSuivante(42)).toBe(43);
  });
});
