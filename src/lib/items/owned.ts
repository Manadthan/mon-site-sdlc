/** Remplace l'état « possédé » d'un item, sans modifier la liste d'origine (affichage immédiat, US-07). */
export function applyOwned<T extends { id: string; owned: boolean }>(items: T[], id: string, owned: boolean): T[] {
  return items.map((item) => (item.id === id ? { ...item, owned } : item));
}

export function countOwned(items: { owned: boolean }[]): number {
  return items.reduce((n, item) => n + (item.owned ? 1 : 0), 0);
}
