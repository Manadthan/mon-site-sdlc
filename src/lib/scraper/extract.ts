import { load } from "cheerio";
import { INTITULE_MAX } from "@/lib/items/title";
import { extraireDonnees } from "@/lib/scraper/donnees";

/** Une image trouvée dans la page, avant filtrage (DESIGN.md §6, étapes 2 et 4). */
export type ImageBrute = {
  imageUrl: string;
  title: string;
  /** Largeur et hauteur déclarées dans la balise (0 si absentes). */
  largeur: number;
  hauteur: number;
  /** Image placée dans l'en-tête, le pied de page, la navigation ou une colonne annexe. */
  horsContenu: boolean;
};

/** `donnees` : éléments trouvés dans les données JSON de la page (sites construits en JavaScript, #82). */
export type PageAnalysee = { pageTitle: string; images: ImageBrute[]; donnees: ImageBrute[] };

const ATTRIBUTS_PARESSEUX = ["data-src", "data-lazy-src", "data-original", "data-url"];

/**
 * Extrait les images d'une page dans leur ordre d'apparition, avec un intitulé pour chacune.
 * Intitulé, dans cet ordre : alt → title → <figcaption> → texte du lien parent →
 * texte le plus proche dans le même bloc (titre en priorité) → nom du fichier.
 */
export function extraireImages(html: string, urlPage: URL): PageAnalysee {
  const $ = load(html);
  const base = adresseDeBase($("base[href]").attr("href"), urlPage);

  const images: ImageBrute[] = [];
  $("img").each((_, element) => {
    const img = $(element);
    const imageUrl = adresseImage((nom) => img.attr(nom), base);
    if (!imageUrl) return;

    const intitule =
      propre(img.attr("alt")) ||
      propre(img.attr("title")) ||
      propre(img.closest("figure").find("figcaption").first().text()) ||
      propre(img.closest("a").text()) ||
      texteDuBloc() ||
      nomDeFichier(imageUrl);

    images.push({
      imageUrl,
      title: intitule.slice(0, INTITULE_MAX),
      largeur: Number.parseInt(img.attr("width") ?? "", 10) || 0,
      hauteur: Number.parseInt(img.attr("height") ?? "", 10) || 0,
      horsContenu: img.closest("header, footer, nav, aside").length > 0,
    });

    // Le « bloc » de l'image : le plus grand ancêtre qui ne contient qu'elle comme image
    // (ex. la fiche d'un produit). On y prend le premier titre, sinon le premier texte.
    function texteDuBloc(): string {
      let bloc = img;
      for (let parent = img.parent(); parent.length && !parent.is("body, html"); parent = parent.parent()) {
        if (parent.find("img").length > 1) break;
        bloc = parent;
      }
      if (bloc.is("img")) return "";
      const titre = bloc.find("h1, h2, h3, h4, h5, h6, figcaption, caption").filter((__, el) => !!propre($(el).text()));
      if (titre.length) return propre(titre.first().text());
      const copie = bloc.clone();
      copie.find("script, style, noscript").remove();
      // Le premier morceau de texte du bloc, ligne par ligne.
      copie.find("br").replaceWith("\n");
      copie.find("p, div, li, td, th, tr, span, a, strong, b, em").each((__, el) => {
        $(el).prepend("\n").append("\n");
      });
      return propre(copie.text().split("\n").find((ligne) => propre(ligne)));
    }
  });

  return { pageTitle: titreDeLaPage($), images, donnees: extraireDonnees($, base) };
}

/** Nom proposé pour la collection : og:title, sinon <title>, sans le nom du site. */
function titreDeLaPage($: ReturnType<typeof load>): string {
  const titre = propre($('meta[property="og:title"]').attr("content")) || propre($("title").first().text());
  const site = propre($('meta[property="og:site_name"]').attr("content"));
  if (!site) return titre.slice(0, 100);
  const morceaux = titre.split(/\s+[|–—-]\s+/).filter((m) => m.toLowerCase() !== site.toLowerCase());
  const sansLeSite = morceaux.length < titre.split(/\s+[|–—-]\s+/).length ? morceaux.join(" – ") : titre;
  return (sansLeSite || titre).slice(0, 100);
}

function adresseDeBase(href: string | undefined, urlPage: URL): URL {
  if (!href) return urlPage;
  try {
    return new URL(href, urlPage);
  } catch {
    return urlPage;
  }
}

/** Adresse absolue de l'image : src, ou un attribut de chargement différé, ou la plus grande du srcset. */
function adresseImage(attr: (nom: string) => string | undefined, base: URL): string | undefined {
  const candidats = [
    ...ATTRIBUTS_PARESSEUX.map(attr),
    attr("src"),
    plusGrandeDuSrcset(attr("data-srcset") ?? attr("srcset")),
  ];
  for (const candidat of candidats) {
    const valeur = candidat?.trim();
    if (!valeur || valeur.startsWith("data:")) continue;
    try {
      const url = new URL(valeur, base);
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch {
      // Adresse illisible : on essaie la suivante.
    }
  }
  return undefined;
}

function plusGrandeDuSrcset(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  let meilleure: { url: string; taille: number } | undefined;
  for (const morceau of srcset.split(/,\s+/)) {
    const [url, descripteur = "1x"] = morceau.trim().split(/\s+/);
    if (!url) continue;
    const taille = Number.parseFloat(descripteur) || 1;
    if (!meilleure || taille > meilleure.taille) meilleure = { url, taille };
  }
  return meilleure?.url;
}

/** Dernier recours : le nom du fichier, lisible (« carte_n-12.jpg » → « carte n 12 »). */
function nomDeFichier(imageUrl: string): string {
  const nom = new URL(imageUrl).pathname.split("/").pop() ?? "";
  let lisible = nom;
  try {
    lisible = decodeURIComponent(nom);
  } catch {
    // Encodage abîmé : on garde le nom tel quel.
  }
  return propre(lisible.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_+.]+/g, " ")) || "Sans titre";
}

function propre(texte: string | undefined): string {
  return (texte ?? "").replace(/\s+/g, " ").trim();
}
