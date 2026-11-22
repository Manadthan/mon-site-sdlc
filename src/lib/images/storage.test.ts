import { describe, expect, it } from "vitest";
import { cheminImage, vignetteAncienne } from "@/lib/images/storage";

describe("chemins des vignettes", () => {
  it("rangés par utilisateur et collection, avec la version de fabrication (ADR-05, issue #79)", () => {
    expect(cheminImage("u", "c", "i")).toBe("u/c/i-v2.webp");
  });

  it("repère les vignettes fabriquées avant le rognage des bords", () => {
    expect(vignetteAncienne("u/c/i.webp")).toBe(true);
    expect(vignetteAncienne("u/c/i-v2.webp")).toBe(false);
    expect(vignetteAncienne(null)).toBe(false);
  });
});
