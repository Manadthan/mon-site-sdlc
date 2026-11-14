import { describe, expect, it } from "vitest";
import { NOM_MAX, validateCollectionName } from "@/lib/collections/name";

describe("validateCollectionName", () => {
  it("accepte un nom et nettoie les espaces", () => {
    expect(validateCollectionName("  Cartes   DBZ  ")).toEqual({ ok: true, name: "Cartes DBZ" });
  });

  it("refuse un nom vide ou fait d'espaces", () => {
    expect(validateCollectionName("")).toEqual({ ok: false, error: "Donnez un nom à la collection." });
    expect(validateCollectionName("   ")).toMatchObject({ ok: false });
    expect(validateCollectionName(null)).toMatchObject({ ok: false });
  });

  it("accepte exactement la longueur maximale, refuse au-delà", () => {
    expect(validateCollectionName("a".repeat(NOM_MAX))).toMatchObject({ ok: true });
    expect(validateCollectionName("a".repeat(NOM_MAX + 1))).toEqual({
      ok: false,
      error: "Le nom ne doit pas dépasser 200 caractères.",
    });
  });
});
