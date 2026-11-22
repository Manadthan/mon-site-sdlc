import type { ImageBrute } from "@/lib/scraper/extract";

/** Un élément proposé dans l'aperçu (US-03). `decor` : probablement du décor, présenté décoché. */
export type Candidat = { imageUrl: string; title: string; decor: boolean };

/**
 * Candidats de la page : ses balises <img> ; si aucune n'est retenue (que du décor ou des images de
 * remplacement), les éléments trouvés dans ses données JSON passent devant (#82).
 */
export function candidatsDeLaPage(page: { images: ImageBrute[]; donnees: ImageBrute[] }): Candidat[] {
  const balises = filtrerImages(page.images);
  if (balises.some((c) => !c.decor)) return balises;
  const adresses = new Set(page.donnees.map((d) => d.imageUrl));
  return [...filtrerImages(page.donnees), ...balises.filter((c) => !adresses.has(c.imageUrl))];
}

const NOM_DE_DECOR = /logo|banni?ere|banner|icon|icone|sprite|avatar|pub\b|ads?\b|advert|footer|header|button|bouton|stamp|badge|arrow|fleche|spacer|pixel/i;
const TAILLE_DE_DECOR = 50;
/** Une même image répétée au moins ce nombre de fois est une image de remplacement (« couverture indisponible »). */
const REPETITIONS_DE_DECOR = 3;

/**
 * Nettoie la liste des images (DESIGN.md §6, étape 3) :
 * - retire ce qui n'est jamais un item : SVG, pixels de suivi, doublons d'adresse ;
 * - marque comme « décor » (décoché dans l'aperçu, l'utilisateur garde la main) : logos, bannières,
 *   icônes, petites images, images d'en-tête ou de pied de page, images répétées (remplacement), et
 *   images hors du dossier principal.
 */
export function filtrerImages(images: ImageBrute[]): Candidat[] {
  const repetitions = new Map<string, number>();
  for (const image of images) repetitions.set(image.imageUrl, (repetitions.get(image.imageUrl) ?? 0) + 1);
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
      (repetitions.get(image.imageUrl) ?? 0) >= REPETITIONS_DE_DECOR ||
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

/**
 * Le dossier d'une image, sans les morceaux qui contiennent un chiffre : un site range souvent ses
 * images par année ou par taille (/imgArticle/GLENAT/2019/, /fit-in/72x72/), ce qui ne les sépare pas (#82).
 */
function dossier(imageUrl: string): string {
  const url = new URL(imageUrl);
  const morceaux = url.pathname.split("/").slice(1, -1).filter((m) => !/\d/.test(m));
  return `${url.host}/${morceaux.map((m) => `${m}/`).join("")}`;
}
