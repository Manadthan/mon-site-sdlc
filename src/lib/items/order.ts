export type Direction = "up" | "down";

/** Échange un item avec son voisin dans la liste affichée (US-10) ; ne fait rien en bout de liste. */
export function moveInList<T extends { id: string }>(items: T[], id: string, direction: Direction): T[] {
  const index = items.findIndex((item) => item.id === id);
  const voisin = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || voisin < 0 || voisin >= items.length) return items;
  const copie = [...items];
  [copie[index], copie[voisin]] = [copie[voisin]!, copie[index]!];
  return copie;
}
