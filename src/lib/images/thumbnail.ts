import "server-only";
import sharp from "sharp";

export const LARGEUR_VIGNETTE = 400;
/** Taille maximale acceptée à l'envoi (la photo est déjà réduite dans le navigateur, DESIGN.md §5). */
export const TAILLE_MAX_ENVOI = 2 * 1024 * 1024;
/**
 * Tolérance du rognage des bords : écart de couleur accepté avec le coin haut gauche.
 * 20 absorbe les petits défauts de la compression JPEG autour d'un fond blanc.
 */
const SEUIL_ROGNAGE = 20;

const ouvrir = (entree: Buffer | ArrayBuffer) =>
  sharp(Buffer.from(entree as ArrayBuffer), { limitInputPixels: 40_000_000 });

/**
 * Convertit une image en vignette WebP de 400 px de large (ADR-02).
 * Retire les bords unis (blanc, transparent…) que beaucoup de sites laissent autour de l'objet,
 * pour qu'il remplisse la case. Tient compte de l'orientation des photos d'iPhone, n'agrandit
 * jamais une petite image, et refuse les images démesurées (protection contre les « bombes » de pixels).
 */
export async function versVignette(entree: Buffer | ArrayBuffer): Promise<Buffer> {
  return ouvrir(entree)
    .rotate()
    .trim({ threshold: SEUIL_ROGNAGE })
    .resize({ width: LARGEUR_VIGNETTE, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Rogne une vignette déjà stockée (retraitement des images importées avant le rognage).
 * Renvoie null s'il n'y a aucun bord à retirer : la vignette est gardée telle quelle,
 * sans la recompresser.
 */
export async function rognerVignette(vignette: Buffer | ArrayBuffer): Promise<Buffer | null> {
  const avant = await ouvrir(vignette).metadata();
  const { data, info } = await ouvrir(vignette)
    .trim({ threshold: SEUIL_ROGNAGE })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return info.width === avant.width && info.height === avant.height ? null : data;
}
