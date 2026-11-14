import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/ids";

describe("isUuid", () => {
  it("accepte un identifiant de la base", () => {
    expect(isUuid("10000000-0000-0000-0000-000000000001")).toBe(true);
    expect(isUuid("3F2504E0-4F89-11D3-9A0C-0305E82C3301")).toBe(true);
  });

  it("refuse tout le reste", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("123")).toBe(false);
    expect(isUuid("10000000-0000-0000-0000-00000000000z")).toBe(false);
    expect(isUuid("../../etc/passwd")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
