import type { ImageBrute } from "@/lib/scraper/extract";

/** Un élément proposé dans l'aperçu (US-03). `decor` : probablement du décor, présenté décoché. */
export type Candidat = { imageUrl: string; title: string; decor: boolean };

const NOM_DE_DECOR = /logo|banni?ere|banner|icon|icone|sprite|avatar|pub\b|ads?\b|advert|footer|header|button|bouton|stamp|badge|arrow|fleche|spacer|pixel/i;
const TAILLE_DE_DECOR = 50;

/**
 * Nettoie la liste des images (DESIGN.md §6, étape 3) :
 * - retire ce qui n'est jamais un item : SVG, pixels de suivi, doublons d'adresse ;
 * - marque comme « décor » (décoché dans l'aperçu, l'utilisateur garde la main) : logos, bannières,
 *   icônes, petites images, images d'en-tête ou de pied de page, et images hors du dossier principal.
 */
export function filtrerImages(images: ImageBrute[]): Candidat[] {
  const vues = new Set<string>();
  const gardees = images.filter((image) => {
    const chemin = new URL(image.imageUrl).pathname.toLowerCase();
    if (chemin.endsWith(".svg")) return false;
    if ((image.largeur > 0 && image.largeur <= 2) || (image.hauteur > 0 && image.hauteur <= 2)) return false;
    if (vues.has(image.imageUrl)) return false;
    vues.add(image.imageUrl);
    return true;
  });

  const principal = dossierPrincipal(gardees);
  return gardees.map((image) => ({
    imageUrl: image.imageUrl,
    title: image.title,
    decor:
      image.horsContenu ||
      NOM_DE_DECOR.test(new URL(image.imageUrl).pathname) ||
      (image.largeur > 0 && image.largeur < TAILLE_DE_DECOR) ||
      (image.hauteur > 0 && image.hauteur < TAILLE_DE_DECOR) ||
      (principal !== undefined && dossier(image.imageUrl) !== principal),
  }));
}

/**
 * Les items d'une collection sont presque toujours rangés ensemble (ex. /guides/manga/film_comics/).
 * Le dossier qui regroupe le plus d'images, s'il en contient au moins 3 ; sinon on ne conclut rien.
 */
function dossierPrincipal(images: ImageBrute[]): string | undefined {
  const compte = new Map<string, number>();
  for (const image of images) {
    const d = dossier(image.imageUrl);
    compte.set(d, (compte.get(d) ?? 0) + 1);
  }
  const [meilleur] = [...compte].sort((a, b) => b[1] - a[1]);
  return meilleur && meilleur[1] >= 3 ? meilleur[0] : undefined;
}

function dossier(imageUrl: string): string {
  const url = new URL(imageUrl);
  return url.host + url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
}
