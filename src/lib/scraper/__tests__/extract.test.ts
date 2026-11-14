import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extraireImages } from "@/lib/scraper/extract";
import { filtrerImages } from "@/lib/scraper/filters";

vi.mock("server-only", () => ({}));
const { decoderHtml } = await import("@/lib/scraper/fetchPage");
const { scrapePreview } = await import("@/lib/scraper");

const fixture = (nom: string) => readFileSync(join(import.meta.dirname, "fixtures", nom));

const apercu = (html: string, url: string) => {
  const page = extraireImages(html, new URL(url));
  return { pageTitle: page.pageTitle, candidats: filtrerImages(page.images) };
};

describe("kanzenshuu.com — Film Animation Comics (page de référence)", () => {
  const { pageTitle, candidats } = apercu(
    decoderHtml(fixture("kanzenshuu-film-comics.html"), "text/html; charset=UTF-8"),
    "https://www.kanzenshuu.com/manga/film-comics/",
  );
  const items = candidats.filter((c) => !c.decor);

  it("propose le titre de la page comme nom", () => {
    expect(pageTitle).toBe("Manga Guide | Film Animation Comics");
  });

  it("retient les 24 items, dans l'ordre de la page, avec leur titre de fiche", () => {
    expect(items).toHaveLength(24);
    expect(items[0]).toEqual({
      imageUrl: "https://www.kanzenshuu.com/guides/manga/film_comics/01.png",
      title: "Dragon Ball Movie 01",
      decor: false,
    });
    expect(items.slice(0, 4).map((c) => c.title)).toEqual([
      "Dragon Ball Movie 01",
      "Dragon Ball Movie 02",
      "Dragon Ball Movie 03",
      "Dragon Ball Z Movie 01",
    ]);
    // Fiche sans lien autour de l'image : le titre vient quand même du bloc.
    expect(items.find((c) => c.imageUrl.endsWith("/13.png"))?.title).toBe("Dragon Ball Z Movie 08");
    expect(items.at(-1)?.title).toBe("Jump Super Anime Tour");
  });

  it("décoche le décor : bannière, tampon, logos du pied de page", () => {
    const decor = candidats.filter((c) => c.decor).map((c) => new URL(c.imageUrl).pathname);
    expect(decor).toContain("/wp-content/uploads/2025/01/40th-tribute-super-gallery-oda.png");
    expect(decor).toContain("/wp-content/themes/kanzenshuu3/images/pages/stamps/stamp_manga.png");
    expect(decor).toContain("/wp-content/themes/kanzenshuu3/images/footer/footer_logo.png");
    expect(decor.every((chemin) => !chemin.startsWith("/guides/manga/film_comics/"))).toBe(true);
  });

  it("retire les doublons d'adresse", () => {
    const adresses = candidats.map((c) => c.imageUrl);
    expect(new Set(adresses).size).toBe(adresses.length);
  });
});

describe("vieux site en ISO-8859-1, en tableaux (page inventée)", () => {
  const corps = fixture("ferme-iso-8859-1.html");
  // Sans en-tête HTTP : l'encodage vient de la balise <meta http-equiv>.
  const { pageTitle, candidats } = apercu(decoderHtml(corps), "http://www.exemple-ferme.fr/cartes/serie12.php");
  const items = candidats.filter((c) => !c.decor);

  it("décode les accents", () => {
    expect(pageTitle).toBe("Cartes à collectionner - Série 12 - Exemple Ferme");
  });

  it("trouve l'intitulé dans le texte de la cellule, l'alt ou le nom du fichier", () => {
    expect(items.map((c) => c.title)).toEqual([
      "N°1 - Le tracteur rouge",
      "N°2 - La vache Marguerite",
      "N°3 - Carte holographique",
      "N°4 - Le coq",
      "N°5 - Les épis de blé",
      "006",
    ]);
  });

  it("résout les chemins relatifs et les images à chargement différé", () => {
    expect(items[0]?.imageUrl).toBe("http://www.exemple-ferme.fr/cartes/cartes/s12/001.jpg");
    expect(items[4]?.imageUrl).toBe("http://www.exemple-ferme.fr/cartes/cartes/s12/005.jpg");
  });

  it("retire le pixel de suivi, le SVG et le doublon ; décoche bandeau et compteur", () => {
    const chemins = candidats.map((c) => new URL(c.imageUrl).pathname);
    expect(chemins).not.toContain("/cartes/images/pixel.gif");
    expect(chemins).not.toContain("/cartes/images/logo.svg");
    expect(chemins.filter((c) => c.endsWith("/001.jpg"))).toHaveLength(1);
    expect(candidats.filter((c) => c.decor).map((c) => new URL(c.imageUrl).pathname)).toEqual([
      "/cartes/images/bandeau_haut.jpg",
      "/cartes/images/compteur.gif",
    ]);
  });
});

describe("extraireImages — cas particuliers", () => {
  const page = (corps: string) => extraireImages(`<html><body>${corps}</body></html>`, new URL("https://site.fr/a/b.html"));

  it("ordre : alt, title, figcaption, lien parent", () => {
    const { images } = page(`
      <img src="1.jpg" alt=" Alt  1 " title="Titre">
      <img src="2.jpg" title="Titre 2">
      <figure><img src="3.jpg"><figcaption>Légende 3</figcaption></figure>
      <div><a href="x"><img src="4.jpg"> Lien 4</a><img src="autre.jpg"></div>`);
    expect(images.map((i) => i.title).slice(0, 4)).toEqual(["Alt 1", "Titre 2", "Légende 3", "Lien 4"]);
  });

  it("prend la plus grande image du srcset quand il n'y a pas de src", () => {
    const { images } = page(`<img srcset="petite.jpg 200w, grande.jpg 800w, moyenne.jpg 400w" alt="x">`);
    expect(images[0]?.imageUrl).toBe("https://site.fr/a/grande.jpg");
  });

  it("respecte la balise <base>", () => {
    const { images } = extraireImages(
      `<html><head><base href="https://cdn.site.fr/img/"></head><body><img src="1.jpg" alt="x"></body></html>`,
      new URL("https://site.fr/a/b.html"),
    );
    expect(images[0]?.imageUrl).toBe("https://cdn.site.fr/img/1.jpg");
  });

  it("ignore les adresses non web", () => {
    expect(page(`<img src="javascript:alert(1)"><img src="data:image/png;base64,AAAA">`).images).toEqual([]);
  });

  it("retire le nom du site du titre de la page", () => {
    const { pageTitle } = extraireImages(
      `<html><head><title>Mes cartes | MonSite</title><meta property="og:site_name" content="MonSite"></head></html>`,
      new URL("https://site.fr/"),
    );
    expect(pageTitle).toBe("Mes cartes");
  });
});

describe("decoderHtml", () => {
  const latin1 = Buffer.from("<p>Série à é</p>", "latin1");

  it("suit le charset de l'en-tête HTTP", () => {
    expect(decoderHtml(latin1, "text/html; charset=ISO-8859-1")).toBe("<p>Série à é</p>");
  });

  it("devine Windows-1252 si le texte n'est pas de l'UTF-8 valide", () => {
    expect(decoderHtml(latin1)).toBe("<p>Série à é</p>");
  });

  it("lit l'UTF-8 par défaut", () => {
    expect(decoderHtml(Buffer.from("<p>Série</p>", "utf8"))).toBe("<p>Série</p>");
  });
});

describe("scrapePreview (serveur local de test)", () => {
  let serveur: Server;
  let base: string;
  const filtre = (ip: string) => ip !== "127.0.0.1";

  beforeAll(async () => {
    serveur = createServer((req, res) => {
      if (req.url === "/ferme") {
        return res.writeHead(200, { "content-type": "text/html" }).end(fixture("ferme-iso-8859-1.html"));
      }
      if (req.url === "/vide") return res.writeHead(200, { "content-type": "text/html" }).end("<p>Rien</p>");
      if (req.url === "/image") return res.writeHead(200, { "content-type": "image/png" }).end("x");
      res.writeHead(404).end();
    });
    await new Promise<void>((ok) => serveur.listen(0, "127.0.0.1", ok));
    base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
  });
  afterAll(() => serveur.close());

  it("renvoie le titre et les candidats", async () => {
    const resultat = await scrapePreview(`${base}/ferme`, filtre);
    expect(resultat.pageTitle).toBe("Cartes à collectionner - Série 12 - Exemple Ferme");
    expect(resultat.candidates.filter((c) => !c.decor)).toHaveLength(6);
  });

  it("signale une page sans élément", async () => {
    await expect(scrapePreview(`${base}/vide`, filtre)).rejects.toMatchObject({ raison: "aucun-element" });
  });

  it("refuse ce qui n'est pas une page HTML", async () => {
    await expect(scrapePreview(`${base}/image`, filtre)).rejects.toMatchObject({ raison: "type" });
  });

  it("garde la protection SSRF", async () => {
    await expect(scrapePreview(`${base}/ferme`)).rejects.toMatchObject({ raison: "adresse-interdite" });
  });
});
