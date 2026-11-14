import { describe, expect, it } from "vitest";
import { confirmationSuppression, nombreItems } from "@/lib/collections/messages";

describe("nombreItems", () => {
  it("accorde au singulier pour 0 et 1, au pluriel au-delà", () => {
    expect(nombreItems(0)).toBe("0 item");
    expect(nombreItems(1)).toBe("1 item");
    expect(nombreItems(48)).toBe("48 items");
  });
});

describe("confirmationSuppression", () => {
  it("annonce le nombre d'items supprimés avec la collection", () => {
    expect(confirmationSuppression("Cartes DBZ", 48)).toBe("Supprimer « Cartes DBZ » et ses 48 items ?");
  });

  it("accorde correctement pour un seul item", () => {
    expect(confirmationSuppression("Unique", 1)).toBe("Supprimer « Unique » et son item ?");
  });

  it("ne parle pas d'items pour une collection vide", () => {
    expect(confirmationSuppression("Film comics", 0)).toBe("Supprimer « Film comics » ?");
  });
});
