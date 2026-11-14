import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { adresseInterdite, creerLookup, recupererSansRisque, verifierUrl } = await import(
  "@/lib/scraper/ssrf"
);

describe("adresseInterdite", () => {
  it.each([
    "0.0.0.0",
    "127.0.0.1",
    "127.255.0.9",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254",
    "100.64.0.1",
    "100.127.255.255",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:10.0.0.1",
    "64:ff9b::a00:1",
    "pas-une-ip",
  ])("refuse %s", (ip) => {
    expect(adresseInterdite(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "2a00:1450:4007::64"])(
    "accepte %s",
    (ip) => {
      expect(adresseInterdite(ip)).toBe(false);
    },
  );
});

describe("verifierUrl", () => {
  const raison = (texte: string) => {
    try {
      verifierUrl(texte);
      return "ok";
    } catch (e) {
      return (e as { raison: string }).raison;
    }
  };

  it("accepte http et https", () => {
    expect(raison("https://exemple.fr/image.jpg")).toBe("ok");
    expect(raison("http://www.dbzcollection.fr/cartes/1.jpg")).toBe("ok");
  });

  it.each(["ftp://exemple.fr/a.jpg", "file:///etc/passwd", "javascript:alert(1)", "pas une url", "https://moi:secret@exemple.fr/"])(
    "refuse la forme de %s",
    (texte) => {
      expect(raison(texte)).toBe("url-invalide");
    },
  );

  it.each([
    "http://localhost/",
    "http://admin.localhost/",
    "http://127.0.0.1:54321/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    // Écritures détournées de 127.0.0.1, normalisées par l'analyse de l'URL.
    "http://2130706433/",
    "http://0x7f.1/",
    "http://0/",
  ])("refuse l'adresse interne %s", (texte) => {
    expect(raison(texte)).toBe("adresse-interdite");
  });
});

describe("creerLookup", () => {
  const resoudreVers =
    (...ips: string[]) =>
    (_hote: string, _o: { all: true }, rappel: (e: Error | null, a: { address: string; family: number }[]) => void) =>
      rappel(null, ips.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));

  const appeler = (lookup: ReturnType<typeof creerLookup>, all: boolean) =>
    new Promise<unknown>((resolve, reject) =>
      lookup("site.exemple", { all } as never, (err: Error | null, adresse: unknown) => (err ? reject(err) : resolve(adresse))),
    );

  it("refuse un nom de domaine qui pointe vers une adresse interne", async () => {
    const lookup = creerLookup(undefined, resoudreVers("10.0.0.5"));
    await expect(appeler(lookup, false)).rejects.toMatchObject({ raison: "adresse-interdite" });
  });

  it("refuse si une seule des adresses est interne", async () => {
    const lookup = creerLookup(undefined, resoudreVers("93.184.216.34", "127.0.0.1"));
    await expect(appeler(lookup, true)).rejects.toMatchObject({ raison: "adresse-interdite" });
  });

  it("laisse passer une adresse publique", async () => {
    const lookup = creerLookup(undefined, resoudreVers("93.184.216.34"));
    await expect(appeler(lookup, false)).resolves.toBe("93.184.216.34");
  });
});

describe("recupererSansRisque (serveur local de test)", () => {
  let serveur: Server;
  let base: string;
  const appels: string[] = [];
  // Pour ces tests seulement : le serveur de test est en 127.0.0.1, tout le reste est interdit.
  const filtre = (ip: string) => ip !== "127.0.0.1";

  beforeAll(async () => {
    serveur = createServer((req, res) => {
      appels.push(req.url ?? "");
      if (req.url === "/image") return res.writeHead(200, { "content-type": "image/png" }).end(Buffer.alloc(100, 1));
      if (req.url === "/page") return res.writeHead(200, { "content-type": "text/html" }).end("<html></html>");
      if (req.url === "/grosse") return res.writeHead(200, { "content-type": "image/png" }).end(Buffer.alloc(5000));
      if (req.url === "/redirection") return res.writeHead(302, { location: "/image" }).end();
      if (req.url === "/vers-interne") return res.writeHead(302, { location: "http://10.0.0.1/image" }).end();
      if (req.url === "/vers-boucle-v6") return res.writeHead(301, { location: "http://[::1]/image" }).end();
      if (req.url === "/boucle") return res.writeHead(302, { location: "/boucle" }).end();
      if (req.url === "/absente") return res.writeHead(404).end();
      if (req.url === "/lente") return; // ne répond jamais
      res.writeHead(500).end();
    });
    await new Promise<void>((ok) => serveur.listen(0, "127.0.0.1", ok));
    base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    serveur.closeAllConnections();
    serveur.close();
  });

  const options = { tailleMax: 1000, filtre, delaiMs: 2000 };
  const echec = (chemin: string, plus = {}) =>
    recupererSansRisque(base + chemin, { ...options, ...plus }).then(
      () => "ok",
      (e: { raison: string }) => e.raison,
    );

  it("récupère le contenu et son type", async () => {
    const reponse = await recupererSansRisque(`${base}/image`, options);
    expect(reponse.type).toBe("image/png");
    expect(reponse.corps.length).toBe(100);
  });

  it("refuse le serveur local avec le filtre normal, sans même l'appeler", async () => {
    const avant = appels.length;
    await expect(recupererSansRisque(`${base}/image`, { tailleMax: 1000 })).rejects.toMatchObject({
      raison: "adresse-interdite",
    });
    expect(appels.length).toBe(avant);
  });

  it("suit une redirection autorisée", async () => {
    const reponse = await recupererSansRisque(`${base}/redirection`, options);
    expect(reponse.url.pathname).toBe("/image");
  });

  it("revérifie l'adresse à chaque redirection", async () => {
    expect(await echec("/vers-interne")).toBe("adresse-interdite");
    expect(await echec("/vers-boucle-v6")).toBe("adresse-interdite");
  });

  it("limite le nombre de redirections", async () => {
    expect(await echec("/boucle")).toBe("trop-de-redirections");
  });

  it("refuse un contenu trop gros", async () => {
    expect(await echec("/grosse")).toBe("trop-gros");
  });

  it("refuse un type non accepté avant d'en lire le contenu", async () => {
    expect(await echec("/page", { typeAccepte: (t: string) => t.startsWith("image/") })).toBe("type");
  });

  it("signale une erreur HTTP", async () => {
    expect(await echec("/absente")).toBe("http");
  });

  it("abandonne après le délai", async () => {
    expect(await echec("/lente", { delaiMs: 200 })).toBe("delai");
  });
});
