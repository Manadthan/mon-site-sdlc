/** Taille maximale (plus grand côté) d'une photo avant envoi au serveur (DESIGN.md §5). */
export const COTE_MAX_ENVOI = 1200;

/** Dimensions réduites en gardant les proportions ; une petite image n'est jamais agrandie. */
export function dimensionsReduites(largeur: number, hauteur: number, coteMax = COTE_MAX_ENVOI) {
  const ratio = Math.min(1, coteMax / Math.max(largeur, hauteur));
  return { largeur: Math.round(largeur * ratio), hauteur: Math.round(hauteur * ratio) };
}

/**
 * Réduit une photo dans le navigateur avant l'envoi : une photo d'iPhone (3 à 5 Mo) dépasserait
 * la limite d'envoi. createImageBitmap applique l'orientation de la photo.
 */
export async function reduirePhoto(fichier: File): Promise<File> {
  const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const { largeur, hauteur } = dimensionsReduites(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, largeur, hauteur);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible"))), "image/jpeg", 0.85),
  );
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
