import { describe, expect, it, vi } from "vitest";
import {
  interrogerSourceExterne,
  libelleSourceExterne,
  messageErreurExterne,
  reconnaitreSourceExterne,
} from "./sources";

describe("reconnaitreSourceExterne", () => {
  it("reconnaît nintendo-db par défaut et refuse les autres origines", () => {
    const reconnue = reconnaitreSourceExterne("https://nintendo-db.vercel.app/?console=wii-u&marche=pal", {
      NINTENDO_DB_TOKEN: "secret",
    });
    expect(reconnue?.source).toBe("nintendo-db");
    expect(reconnue?.label).toBe("Nintendo DB");
    expect(reconnue?.token).toBe("secret");

    expect(reconnaitreSourceExterne("https://evil.example/?console=wii-u", {})).toBeNull();
    expect(reconnaitreSourceExterne("https://nintendo-db.vercel.app.evil.com/", {})).toBeNull();
    expect(reconnaitreSourceExterne("not-a-url", {})).toBeNull();
  });

  it("active dragonball-db dès que DRAGONBALL_DB_URL est renseignée", () => {
    expect(reconnaitreSourceExterne("https://dragonball-db.vercel.app/?type=manga-livre", {})).toBeNull();
    const reconnue = reconnaitreSourceExterne("https://dragonball-db.vercel.app/?type=manga-livre", {
      DRAGONBALL_DB_URL: "https://dragonball-db.vercel.app/",
      DRAGONBALL_DB_TOKEN: "db-secret",
    });
    expect(reconnue?.source).toBe("dragonball-db");
    expect(reconnue?.label).toBe("Dragon Ball DB");
    expect(reconnue?.token).toBe("db-secret");
  });
});

describe("interrogerSourceExterne", () => {
  it("appelle /api/suivi avec le jeton Bearer, retire ?collection= et valide le JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          source: "nintendo-db",
          owned: 14,
          total: 42,
          coverUrl: "https://exemple.supabase.co/jaquette-300.webp",
          suggestedTitle: "Wii U · Europe",
          url: "https://nintendo-db.vercel.app/?console=wii-u&marche=pal",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await interrogerSourceExterne(
      "https://nintendo-db.vercel.app/?console=wii-u&marche=pal&collection=manquants",
      { env: { NINTENDO_DB_TOKEN: "jeton-test" }, fetchFn: fetchMock },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://nintendo-db.vercel.app/api/suivi?console=wii-u&marche=pal",
      expect.objectContaining({
        headers: { Authorization: "Bearer jeton-test", Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
      }),
    );
    expect(res).toEqual({
      ok: true,
      donnees: {
        source: "nintendo-db",
        label: "Nintendo DB",
        owned: 14,
        total: 42,
        coverUrl: "https://exemple.supabase.co/jaquette-300.webp",
        suggestedTitle: "Wii U · Europe",
        url: "https://nintendo-db.vercel.app/?console=wii-u&marche=pal",
      },
    });
  });

  it("gère l'absence de jeton, 401, timeout et JSON invalide", async () => {
    const sansJeton = await interrogerSourceExterne("https://nintendo-db.vercel.app/", { env: {} });
    expect(sansJeton).toEqual({ ok: false, raison: "non_configuree", label: "Nintendo DB" });

    const auth = await interrogerSourceExterne("https://nintendo-db.vercel.app/", {
      env: { NINTENDO_DB_TOKEN: "bad" },
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 401 })),
    });
    expect(auth).toEqual({ ok: false, raison: "auth", label: "Nintendo DB" });

    const timeoutErr = new DOMException("Timed out", "TimeoutError");
    const delai = await interrogerSourceExterne("https://nintendo-db.vercel.app/", {
      env: { NINTENDO_DB_TOKEN: "ok" },
      fetchFn: vi.fn<typeof fetch>().mockRejectedValue(timeoutErr),
    });
    expect(delai).toEqual({ ok: false, raison: "delai", label: "Nintendo DB" });

    const invalide = await interrogerSourceExterne("https://nintendo-db.vercel.app/", {
      env: { NINTENDO_DB_TOKEN: "ok" },
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ owned: -1, total: 10 }))),
    });
    expect(invalide).toEqual({ ok: false, raison: "format", label: "Nintendo DB" });
  });
});

describe("libelleSourceExterne et messageErreurExterne", () => {
  it("formate les noms de sources et les messages d'erreur", () => {
    expect(libelleSourceExterne("nintendo-db")).toBe("Nintendo DB");
    expect(libelleSourceExterne("dragonball-db")).toBe("Dragon Ball DB");
    expect(libelleSourceExterne(null)).toBe("Site externe");
    expect(messageErreurExterne("auth", "Nintendo DB").titre).toContain("Nintendo DB");
    expect(messageErreurExterne("delai", "Nintendo DB").texte).toContain("8 secondes");
  });
});
