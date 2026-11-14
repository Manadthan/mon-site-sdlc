import { describe, expect, it } from "vitest";
import { adresseWeb, IMPORT_MAX, validerElements } from "@/lib/collections/import";

describe("adresseWeb", () => {
  it("accepte http et https, normalisés", () => {
    expect(adresseWeb("http://www.dbzcollection.fr/a b.jpg")).toBe("http://www.dbzcollection.fr/a%20b.jpg");
    expect(adresseWeb("https://site.fr/1.png")).toBe("https://site.fr/1.png");
  });

  it.each([undefined, 42, "", "pas une url", "javascript:alert(1)", "ftp://site.fr/a.jpg", `https://site.fr/${"a".repeat(2000)}`])(
    "refuse %s",
    (saisie) => {
      expect(adresseWeb(saisie)).toBeUndefined();
    },
  );
});

describe("validerElements", () => {
  const json = (valeur: unknown) => JSON.stringify(valeur);

  it("garde l'ordre, nettoie les intitulés", () => {
    const resultat = validerElements(
      json([
        { title: "  Film   01 ", imageUrl: "https://site.fr/1.png" },
        { title: "", imageUrl: "https://site.fr/2.png" },
        { title: "x".repeat(600), imageUrl: "https://site.fr/3.png" },
      ]),
    );
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.elements.map((e) => e.title.length)).toEqual([7, 10, 500]);
    expect(resultat.elements[0]).toEqual({ title: "Film 01", imageUrl: "https://site.fr/1.png" });
    expect(resultat.elements[1]?.title).toBe("Sans titre");
  });

  it("refuse une sélection vide", () => {
    expect(validerElements("[]")).toEqual({ ok: false, error: "Gardez au moins un élément, ou créez une collection vide." });
  });

  it.each([null, "pas du json", "{}", json([{ title: "x", imageUrl: "javascript:alert(1)" }]), json([null])])(
    "refuse une sélection illisible : %s",
    (saisie) => {
      expect(validerElements(saisie)).toMatchObject({ ok: false, error: "La sélection est illisible. Relancez l’analyse." });
    },
  );

  it(`refuse plus de ${IMPORT_MAX} éléments`, () => {
    const trop = Array.from({ length: IMPORT_MAX + 1 }, (_, i) => ({ title: `${i}`, imageUrl: `https://site.fr/${i}.png` }));
    expect(validerElements(json(trop)).ok).toBe(false);
  });
});
