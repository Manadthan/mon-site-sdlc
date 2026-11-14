export type Filtre = "tous" | "possedes" | "manquants";

export const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: "tous", libelle: "Tous" },
  { valeur: "possedes", libelle: "Possédés" },
  { valeur: "manquants", libelle: "Manquants" },
];

/** Texte comparable : minuscules, sans accents, espaces simples (« Épis  de Blé » → « epis de ble »). */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Items à afficher (US-09) : filtre Tous / Possédés / Manquants, puis recherche sur l'intitulé.
 * Chaque mot cherché doit apparaître dans l'intitulé, dans n'importe quel ordre, sans tenir compte
 * des majuscules ni des accents. L'ordre de la collection est conservé.
 */
export function filtrerItems<T extends { title: string; owned: boolean }>(items: T[], filtre: Filtre, recherche: string): T[] {
  const mots = normaliser(recherche).split(" ").filter(Boolean);
  return items.filter((item) => {
    if (filtre === "possedes" && !item.owned) return false;
    if (filtre === "manquants" && item.owned) return false;
    if (mots.length === 0) return true;
    const intitule = normaliser(item.title);
    return mots.every((mot) => intitule.includes(mot));
  });
}
