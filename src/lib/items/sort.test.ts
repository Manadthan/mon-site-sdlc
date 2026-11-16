import { describe, expect, it } from "vitest";
import { parseTriItems, serialiserTriItems, trierItems, triSuivant, TRI_PAR_DEFAUT } from "@/lib/items/sort";

const items = [{ title: "Movie 10" }, { title: "étoile" }, { title: "Movie 2" }, { title: "Alex" }];
const titres = (liste: { title: string }[]) => liste.map((i) => i.title);

describe("trierItems", () => {
  it("ordre de la collection, dans un sens ou dans l'autre", () => {
    expect(titres(trierItems(items, { cle: "ordre", sens: "asc" }))).toEqual(["Movie 10", "étoile", "Movie 2", "Alex"]);
    expect(titres(trierItems(items, { cle: "ordre", sens: "desc" }))).toEqual(["Alex", "Movie 2", "étoile", "Movie 10"]);
  });

  it("nom : ordre naturel, sans accents ni casse", () => {
    expect(titres(trierItems(items, { cle: "nom", sens: "asc" }))).toEqual(["Alex", "étoile", "Movie 2", "Movie 10"]);
    expect(titres(trierItems(items, { cle: "nom", sens: "desc" }))).toEqual(["Movie 10", "Movie 2", "étoile", "Alex"]);
  });

  it("ne modifie pas la liste reçue", () => {
    trierItems(items, { cle: "nom", sens: "desc" });
    expect(titres(items)).toEqual(["Movie 10", "étoile", "Movie 2", "Alex"]);
  });
});

describe("triSuivant, cookie", () => {
  it("inverse le sens du critère actif ; un autre critère repart en croissant", () => {
    expect(triSuivant({ cle: "nom", sens: "asc" }, "nom")).toEqual({ cle: "nom", sens: "desc" });
    expect(triSuivant({ cle: "nom", sens: "desc" }, "ordre")).toEqual({ cle: "ordre", sens: "asc" });
  });

  it("lit et écrit le cookie, valeur par défaut sinon", () => {
    expect(parseTriItems(serialiserTriItems({ cle: "nom", sens: "desc" }))).toEqual({ cle: "nom", sens: "desc" });
    expect(parseTriItems(undefined)).toEqual(TRI_PAR_DEFAUT);
    expect(parseTriItems("prix-asc")).toEqual(TRI_PAR_DEFAUT);
  });
});
