/** Nombre d'items par ligne sur iPhone (US-14) ; les grands écrans en ajoutent. */
export const COLONNES_MIN = 2;
export const COLONNES_MAX = 4;
export type Colonnes = 2 | 3 | 4;

/** Cookie (lisible par le navigateur) : le choix vaut pour toutes les collections, sur cet appareil. */
export const COOKIE_GRILLE = "grille";

/** Lit la valeur du cookie ; 2 par défaut ou si elle est invalide. */
export function parseColonnes(valeur: string | undefined): Colonnes {
  const n = Number(valeur);
  return n === 3 || n === 4 ? n : 2;
}

/** Une colonne de plus (dézoomer) ou de moins (zoomer), dans les bornes. */
export function changerColonnes(actuel: Colonnes, sens: "plus" | "moins"): Colonnes {
  const n = actuel + (sens === "plus" ? 1 : -1);
  return Math.min(COLONNES_MAX, Math.max(COLONNES_MIN, n)) as Colonnes;
}

/** Classes de la grille : n colonnes sur iPhone, davantage sur les écrans plus larges. */
export const CLASSES_GRILLE: Record<Colonnes, string> = {
  2: "grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  3: "grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
  4: "grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
};
