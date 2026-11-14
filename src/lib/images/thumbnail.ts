import "server-only";
import sharp from "sharp";

export const LARGEUR_VIGNETTE = 400;
/** Taille maximale acceptée à l'envoi (la photo est déjà réduite dans le navigateur, DESIGN.md §5). */
export const TAILLE_MAX_ENVOI = 2 * 1024 * 1024;

/**
 * Convertit une image en vignette WebP de 400 px de large (ADR-02).
 * Tient compte de l'orientation des photos d'iPhone, n'agrandit jamais une petite image,
 * et refuse les images démesurées (protection contre les « bombes » de pixels).
 */
export async function versVignette(entree: Buffer | ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(entree as ArrayBuffer), { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: LARGEUR_VIGNETTE, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
