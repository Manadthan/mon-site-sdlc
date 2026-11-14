const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai si la valeur a la forme d'un identifiant de la base (UUID). Évite d'interroger la base pour rien. */
export function isUuid(valeur: unknown): valeur is string {
  return typeof valeur === "string" && UUID.test(valeur);
}
