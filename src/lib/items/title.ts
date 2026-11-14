export const INTITULE_MAX = 500;

/** Vérifie l'intitulé d'un item (mêmes règles que la contrainte SQL de 0001_schema.sql). */
export function validateItemTitle(saisie: unknown): { ok: true; title: string } | { ok: false; error: string } {
  const title = typeof saisie === "string" ? saisie.trim().replace(/\s+/g, " ") : "";
  if (title.length === 0) return { ok: false, error: "Donnez un intitulé à l’item." };
  if (title.length > INTITULE_MAX) {
    return { ok: false, error: `L’intitulé ne doit pas dépasser ${INTITULE_MAX} caractères.` };
  }
  return { ok: true, title };
}

/** Position d'un nouvel item : à la suite du dernier (US-10). */
export function positionSuivante(dernierePosition: number | null | undefined): number {
  return (dernierePosition ?? 0) + 1;
}
