import { describe, expect, it } from "vitest";
import { dimensionsReduites } from "@/lib/images/resize";

describe("dimensionsReduites", () => {
  it("réduit une photo d'iPhone (4032 × 3024) à 1200 px sur le plus grand côté", () => {
    expect(dimensionsReduites(4032, 3024)).toEqual({ largeur: 1200, hauteur: 900 });
  });

  it("gère les photos en hauteur", () => {
    expect(dimensionsReduites(3024, 4032)).toEqual({ largeur: 900, hauteur: 1200 });
  });

  it("n'agrandit pas une petite image", () => {
    expect(dimensionsReduites(640, 480)).toEqual({ largeur: 640, hauteur: 480 });
  });
});
