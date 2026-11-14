/** Taille d'un lot d'images copiées par appel au serveur (ADR-03). */
export const TAILLE_LOT = 10;

/** Découpe une liste en lots de `taille` éléments, dans l'ordre. */
export function enLots<T>(liste: readonly T[], taille = TAILLE_LOT): T[][] {
  const lots: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) lots.push(liste.slice(i, i + taille));
  return lots;
}

/**
 * Exécute les tâches avec au plus `limite` en même temps (pour ne pas solliciter un site source
 * de 10 téléchargements simultanés). Les résultats gardent l'ordre des tâches.
 */
export async function enParallele<T>(taches: readonly (() => Promise<T>)[], limite: number): Promise<T[]> {
  const resultats: T[] = new Array(taches.length);
  let suivante = 0;
  const ouvrier = async () => {
    while (suivante < taches.length) {
      const index = suivante++;
      resultats[index] = await taches[index]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, taches.length) }, ouvrier));
  return resultats;
}
