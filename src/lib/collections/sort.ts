import type { CollectionCard } from "@/lib/collections/cards";

export const SORT_KEYS = ["name", "date", "percent"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

/** Nom du cookie qui mémorise le dernier tri choisi (US-05, DESIGN.md §3). */
export const SORT_COOKIE = "tri-collections";

/** Sens proposé au premier choix d'un critère : A→Z, plus récentes d'abord, plus complètes d'abord. */
const SENS_PAR_DEFAUT: Record<SortKey, SortDir> = { name: "asc", date: "desc", percent: "desc" };
export const DEFAULT_SORT: Sort = { key: "date", dir: "desc" };

/** Lit la valeur du cookie (« name:asc ») ; toute valeur inconnue donne le tri par défaut. */
export function parseSort(valeur: string | undefined): Sort {
  const [key, dir] = (valeur ?? "").split(":");
  if (SORT_KEYS.includes(key as SortKey) && (dir === "asc" || dir === "desc")) {
    return { key: key as SortKey, dir };
  }
  return DEFAULT_SORT;
}

export function serializeSort(sort: Sort): string {
  return `${sort.key}:${sort.dir}`;
}

/** Toucher le critère actif inverse le sens ; toucher un autre critère le sélectionne avec son sens par défaut. */
export function nextSort(actuel: Sort, choisi: SortKey): Sort {
  if (actuel.key === choisi) return { key: choisi, dir: actuel.dir === "asc" ? "desc" : "asc" };
  return { key: choisi, dir: SENS_PAR_DEFAUT[choisi] };
}

const comparerNoms = new Intl.Collator("fr", { sensitivity: "base", numeric: true }).compare;

/** Trie les cartes sans modifier la liste d'origine. À égalité, ordre alphabétique. */
export function sortCards(cartes: CollectionCard[], { key, dir }: Sort): CollectionCard[] {
  const signe = dir === "asc" ? 1 : -1;
  return [...cartes].sort((a, b) => {
    let ecart = 0;
    if (key === "name") ecart = comparerNoms(a.name, b.name);
    else if (key === "date") ecart = a.createdAt.localeCompare(b.createdAt);
    else ecart = a.progress.percent - b.progress.percent;
    return ecart * signe || comparerNoms(a.name, b.name);
  });
}
