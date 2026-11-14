import { describe, expect, it } from "vitest";
import { enLots, enParallele, TAILLE_LOT } from "@/lib/collections/lots";

describe("enLots", () => {
  it("découpe 22 éléments en lots de 10, 10 et 2 (maquette n° 10 : « Lot 2 sur 3 »)", () => {
    const lots = enLots(Array.from({ length: 22 }, (_, i) => i));
    expect(lots.map((l) => l.length)).toEqual([10, 10, 2]);
    expect(lots[1]?.[0]).toBe(10);
    expect(TAILLE_LOT).toBe(10);
  });

  it("liste vide : aucun lot", () => {
    expect(enLots([])).toEqual([]);
  });
});

describe("enParallele", () => {
  it("respecte la limite et garde l'ordre des résultats", async () => {
    let enCours = 0;
    let maximum = 0;
    const taches = Array.from({ length: 10 }, (_, i) => async () => {
      enCours++;
      maximum = Math.max(maximum, enCours);
      await new Promise((ok) => setTimeout(ok, 10 - i));
      enCours--;
      return i * 2;
    });
    expect(await enParallele(taches, 4)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(maximum).toBe(4);
  });
});
