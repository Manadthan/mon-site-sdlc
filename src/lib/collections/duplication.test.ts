import { describe, expect, it } from "vitest";
import { cheminCopie, nomDeCopie } from "@/lib/collections/duplication";

describe("nomDeCopie", () => {
  it("ajoute « (copie) », puis un numéro si le nom est déjà pris", () => {
    expect(nomDeCopie("Cartes DBZ", ["Cartes DBZ"])).toBe("Cartes DBZ (copie)");
    expect(nomDeCopie("Cartes DBZ", ["Cartes DBZ", "cartes dbz (copie)"])).toBe("Cartes DBZ (copie 2)");
  });
});

describe("cheminCopie", () => {
  const copie = { userId: "u", collectionId: "c2", itemId: "i2" };

  it("range la vignette dans le dossier de la copie, avec sa version", () => {
    expect(cheminCopie("u/c1/i1-v2.webp", "i1", copie)).toBe("u/c2/i2-v2.webp");
  });

  it("garde une ancienne vignette reconnaissable (à recadrer)", () => {
    expect(cheminCopie("u/c1/i1.webp", "i1", copie)).toBe("u/c2/i2.webp");
  });

  it("nom inattendu : chemin de la version actuelle", () => {
    expect(cheminCopie("u/c1/autre.webp", "i1", copie)).toBe("u/c2/i2-v2.webp");
  });
});
