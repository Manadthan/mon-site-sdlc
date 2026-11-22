import type { CheerioAPI } from "cheerio";
import type { ImageBrute } from "@/lib/scraper/extract";
import { INTITULE_MAX } from "@/lib/items/title";

/** Les blocs de données qu'une page embarque pour son JavaScript (Next.js : __NEXT_DATA__) ou pour Google. */
const SCRIPTS_DE_DONNEES = 'script[type="application/json"], script[type="application/ld+json"]';
const EXTENSION_IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
/** Clés d'intitulé, par ordre de préférence. */
const CLES_INTITULE = [/titre|title/i, /^name$|_name$|^nom$|_nom$/i, /label|libelle/i];
const CLES_HORS_CONTENU = /header|footer|nav|menu|breadcrumb/i;
const PROFONDEUR_MAX = 40;

type Objet = Record<string, unknown>;

/**
 * Éléments décrits dans les données de la page plutôt que dans ses balises <img> (#82) : un site
 * construit en JavaScript (ex. glenat.com) n'affiche que des images de remplacement dans son HTML,
 * les vraies couvertures n'arrivent qu'avec le script. Chaque objet JSON qui a à la fois une adresse
 * d'image et un intitulé devient un élément, dans l'ordre des données.
 */
export function extraireDonnees($: CheerioAPI, base: URL): ImageBrute[] {
  const images: ImageBrute[] = [];
  $(SCRIPTS_DE_DONNEES).each((_, element) => {
    let donnees: unknown;
    try {
      donnees = JSON.parse($(element).text());
    } catch {
      return;
    }
    parcourir(donnees, false, 0);
  });
  return images;

  function parcourir(valeur: unknown, horsContenu: boolean, profondeur: number) {
    if (profondeur > PROFONDEUR_MAX || !valeur || typeof valeur !== "object") return;
    if (Array.isArray(valeur)) {
      for (const element of valeur) parcourir(element, horsContenu, profondeur + 1);
      return;
    }
    const objet = valeur as Objet;
    const element = elementDe(objet, base);
    if (element) images.push({ ...element, largeur: 0, hauteur: 0, horsContenu });
    for (const [cle, enfant] of Object.entries(objet)) {
      parcourir(enfant, horsContenu || CLES_HORS_CONTENU.test(cle), profondeur + 1);
    }
  }
}

function elementDe(objet: Objet, base: URL): { imageUrl: string; title: string } | undefined {
  let imageUrl: string | undefined;
  for (const valeur of Object.values(objet)) {
    imageUrl = adresseImage(premierTexte(valeur), base) ?? adresseImage(texteImbrique(valeur), base);
    if (imageUrl) break;
  }
  if (!imageUrl) return undefined;

  const cles = Object.keys(objet);
  for (const motif of CLES_INTITULE) {
    for (const cle of cles.filter((c) => motif.test(c))) {
      const texte = propre(premierTexte(objet[cle]));
      if (texte && !/^(https?:)?\/\//.test(texte)) return { imageUrl, title: texte.slice(0, INTITULE_MAX) };
    }
  }
  return undefined;
}

/** Une chaîne, ou la première d'un tableau de chaînes (["…"] est courant dans les index de recherche). */
function premierTexte(valeur: unknown): string | undefined {
  if (typeof valeur === "string") return valeur;
  if (Array.isArray(valeur) && typeof valeur[0] === "string") return valeur[0];
  return undefined;
}

/** { src: "…" } ou { url: "…" } : forme courante d'une image dans les données. */
function texteImbrique(valeur: unknown): string | undefined {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return undefined;
  const objet = valeur as Objet;
  return premierTexte(objet.src) ?? premierTexte(objet.url);
}

function adresseImage(texte: string | undefined, base: URL): string | undefined {
  const valeur = texte?.trim();
  if (!valeur || !/^(https?:\/\/|\/)/i.test(valeur)) return undefined;
  try {
    const url = new URL(valeur, base);
    if ((url.protocol === "http:" || url.protocol === "https:") && EXTENSION_IMAGE.test(url.pathname)) return url.href;
  } catch {
    // Adresse illisible.
  }
  return undefined;
}

function propre(texte: string | undefined): string {
  return (texte ?? "").replace(/\s+/g, " ").trim();
}
