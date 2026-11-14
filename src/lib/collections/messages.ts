/** « 1 item », « 48 items », « 0 item » (règle française : singulier pour 0 et 1). */
export function nombreItems(n: number): string {
  return `${n} ${n <= 1 ? "item" : "items"}`;
}

/** Question de confirmation avant suppression (US-04, maquette n° 7). */
export function confirmationSuppression(nom: string, total: number): string {
  if (total === 0) return `Supprimer « ${nom} » ?`;
  if (total === 1) return `Supprimer « ${nom} » et son item ?`;
  return `Supprimer « ${nom} » et ses ${nombreItems(total)} ?`;
}
