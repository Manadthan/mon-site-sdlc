/** Tri des items à l'affichage (US-15) : l'ordre de la collection n'est jamais modifié. */
export type CleTri = "ordre" | "nom";
export type TriItems = { cle: CleTri; sens: "asc" | "desc" };

export const TRI_PAR_DEFAUT: TriItems = { cle: "ordre", sens: "asc" };
/** Cookie lisible par le navigateur : le choix vaut pour toutes les collections, sur cet appareil. */
export const COOKIE_TRI_ITEMS = "tri-items";

export function parseTriItems(valeur: string | undefined): TriItems {
  const [cle, sens] = (valeur ?? "").split("-");
  if ((cle === "ordre" || cle === "nom") && (sens === "asc" || sens === "desc")) return { cle, sens };
  return TRI_PAR_DEFAUT;
}

export function serialiserTriItems(tri: TriItems): string {
  return `${tri.cle}-${tri.sens}`;
}

/** Toucher le critère actif inverse le sens ; un autre critère repart en croissant. */
export function triSuivant(actuel: TriItems, cle: CleTri): TriItems {
  if (actuel.cle === cle) return { cle, sens: actuel.sens === "asc" ? "desc" : "asc" };
  return { cle, sens: "asc" };
}

// Comparaison « naturelle » en français : « Movie 2 » avant « Movie 10 », sans tenir compte des accents ni de la casse.
const comparateur = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/** Items triés ; « ordre » garde l'ordre reçu (celui de la collection, par position). */
export function trierItems<T extends { title: string }>(items: T[], tri: TriItems): T[] {
  const copie = [...items];
  if (tri.cle === "nom") copie.sort((a, b) => comparateur.compare(a.title, b.title));
  if (tri.sens === "desc") copie.reverse();
  return copie;
}
