import { cheminImage, dossierCollection } from "@/lib/images/storage";
import { nomSansDoublon } from "@/lib/sauvegarde";

/** Nom de la copie d'une collection (US-18) : « Cartes (copie) », puis « Cartes (copie 2) »… si déjà pris. */
export function nomDeCopie(nom: string, existants: Iterable<string>): string {
  return nomSansDoublon(nom, existants, "copie", true);
}

/**
 * Chemin de la vignette copiée, dans le dossier de la nouvelle collection (ADR-05).
 * La fin du nom (« -v2.webp », ou « .webp » pour une vignette d'avant le rognage) est gardée :
 * une ancienne vignette copiée reste reconnue comme « à recadrer » (issue #79).
 */
export function cheminCopie(
  origine: string,
  ancienItemId: string,
  copie: { userId: string; collectionId: string; itemId: string },
): string {
  const fichier = origine.slice(origine.lastIndexOf("/") + 1);
  if (!fichier.startsWith(ancienItemId)) return cheminImage(copie.userId, copie.collectionId, copie.itemId);
  return `${dossierCollection(copie.userId, copie.collectionId)}/${copie.itemId}${fichier.slice(ancienItemId.length)}`;
}
