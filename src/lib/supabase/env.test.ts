import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "@/lib/supabase/env";

const valide = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcd.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xyz",
};

describe("readSupabaseEnv", () => {
  it("renvoie l'URL et la clé quand tout est renseigné", () => {
    expect(readSupabaseEnv(valide)).toEqual({ url: "https://abcd.supabase.co", publishableKey: "sb_publishable_xyz" });
  });

  it("ignore les espaces autour des valeurs (copier-coller)", () => {
    expect(readSupabaseEnv({ ...valide, NEXT_PUBLIC_SUPABASE_URL: "  https://abcd.supabase.co \n" }).url).toBe(
      "https://abcd.supabase.co",
    );
  });

  it("nomme toutes les variables manquantes", () => {
    expect(() => readSupabaseEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
    expect(() => readSupabaseEnv({ ...valide, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " " })).toThrow(
      /manquante\(s\) : NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\./,
    );
  });

  it("refuse une URL invalide", () => {
    expect(() => readSupabaseEnv({ ...valide, NEXT_PUBLIC_SUPABASE_URL: "abcd.supabase.co" })).toThrow(
      /pas une adresse valide/,
    );
    expect(() => readSupabaseEnv({ ...valide, NEXT_PUBLIC_SUPABASE_URL: "ftp://abcd.supabase.co" })).toThrow(
      /pas une adresse valide/,
    );
  });
});
