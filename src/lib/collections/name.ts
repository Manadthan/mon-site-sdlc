export const NOM_MAX = 200;

/** Vérifie le nom d'une collection (mêmes règles que la contrainte SQL de 0001_schema.sql). */
export function validateCollectionName(saisie: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = typeof saisie === "string" ? saisie.trim().replace(/\s+/g, " ") : "";
  if (name.length === 0) return { ok: false, error: "Donnez un nom à la collection." };
  if (name.length > NOM_MAX) return { ok: false, error: `Le nom ne doit pas dépasser ${NOM_MAX} caractères.` };
  return { ok: true, name };
}
