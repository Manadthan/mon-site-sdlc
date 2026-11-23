import type { CollectionCard } from "@/lib/collections/cards";

/** Longueur maximale d'une catégorie (contrainte SQL de 0008_categorie.sql). */
export const CATEGORIE_MAX = 40;

/**
 * Vérifie la catégorie saisie (US-19) : facultative, espaces en trop retirés.
 * Un champ vide donne null (= sans catégorie).
 */
export function validerCategorie(saisie: unknown): { ok: true; category: string | null } | { ok: false; error: string } {
  const category = typeof saisie === "string" ? saisie.trim().replace(/\s+/g, " ") : "";
  if (category.length === 0) return { ok: true, category: null };
  if (category.length > CATEGORIE_MAX) {
    return { ok: false, error: `La catégorie ne doit pas dépasser ${CATEGORIE_MAX} caractères.` };
  }
  return { ok: true, category };
}

const cle = (categorie: string) => categorie.toLocaleLowerCase("fr");

/** « mangas » quand « Mangas » existe déjà : on reprend l'orthographe existante (pas de nouvelle catégorie). */
export function harmoniserCategorie(categorie: string | null, existantes: Iterable<string | null>): string | null {
  if (categorie === null) return null;
  for (const existante of existantes) if (existante !== null && cle(existante) === cle(categorie)) return existante;
  return categorie;
}

const comparer = new Intl.Collator("fr", { sensitivity: "base", numeric: true }).compare;

/** Catégories déjà utilisées, sans doublon, dans l'ordre alphabétique : les suggestions du champ. */
export function categoriesUtilisees(categories: Iterable<string | null>): string[] {
  const parCle = new Map<string, string>();
  for (const c of categories) if (c !== null && !parCle.has(cle(c))) parCle.set(cle(c), c);
  return [...parCle.values()].sort(comparer);
}

export type Section = { titre: string | null; cartes: CollectionCard[] };

/**
 * Sections de l'accueil (US-19) : une par catégorie, dans l'ordre alphabétique, « Sans catégorie » (titre null) en dernier.
 * Les cartes gardent, dans chaque section, l'ordre reçu (le tri choisi, US-05).
 * Aucune catégorie : une seule section sans titre, l'accueil reste une simple liste.
 */
export function grouperParCategorie(cartes: CollectionCard[]): Section[] {
  const sections = new Map<string, Section>();
  const sans: CollectionCard[] = [];
  for (const carte of cartes) {
    if (carte.category === null) {
      sans.push(carte);
      continue;
    }
    const section = sections.get(cle(carte.category)) ?? { titre: carte.category, cartes: [] };
    section.cartes.push(carte);
    sections.set(cle(carte.category), section);
  }
  const triees = [...sections.values()].sort((a, b) => comparer(a.titre!, b.titre!));
  return sans.length > 0 || triees.length === 0 ? [...triees, { titre: null, cartes: sans }] : triees;
}
