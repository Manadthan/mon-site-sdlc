import { describe, expect, it } from "vitest";
import { messageEchecPage } from "@/lib/scraper/messages";

describe("messageEchecPage", () => {
  it("distingue page inaccessible et page sans élément (maquette n° 11)", () => {
    expect(messageEchecPage("delai")).toEqual({
      titre: "Page inaccessible",
      texte: "Le site n’a pas répondu dans les 10 secondes. Vérifiez l’adresse ou réessayez plus tard.",
    });
    expect(messageEchecPage("aucun-element").titre).toBe("Aucun élément trouvé sur cette page");
  });

  it("a un message pour chaque cause", () => {
    for (const raison of ["url-invalide", "adresse-interdite", "trop-gros", "type", "http", "reseau", undefined] as const) {
      expect(messageEchecPage(raison).texte).not.toBe("");
    }
  });
});
