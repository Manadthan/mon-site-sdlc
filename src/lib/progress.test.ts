import { describe, expect, it } from "vitest";
import { computeProgress, formatProgress } from "@/lib/progress";

describe("computeProgress", () => {
  it("calcule le pourcentage arrondi", () => {
    expect(computeProgress(12, 48)).toEqual({ owned: 12, total: 48, percent: 25 });
    expect(computeProgress(1, 3).percent).toBe(33);
    expect(computeProgress(2, 3).percent).toBe(67);
  });

  it("vaut 0 % pour une collection vide", () => {
    expect(computeProgress(0, 0).percent).toBe(0);
  });

  it("vaut 100 % quand tout est possédé", () => {
    expect(computeProgress(31, 31).percent).toBe(100);
  });

  it("refuse les valeurs incohérentes", () => {
    expect(() => computeProgress(5, 3)).toThrow(RangeError);
    expect(() => computeProgress(-1, 3)).toThrow(RangeError);
    expect(() => computeProgress(1.5, 3)).toThrow(RangeError);
  });
});

describe("formatProgress", () => {
  it("affiche « possédés / total · % » avec espaces insécables", () => {
    expect(formatProgress(computeProgress(12, 48))).toBe("12 / 48 · 25 %");
  });
});
