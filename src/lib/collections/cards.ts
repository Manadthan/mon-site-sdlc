import { computeProgress, type Progress } from "@/lib/progress";

export type CollectionRow = {
  id: string;
  name: string;
  cover_path: string | null;
  created_at: string;
  category?: string | null;
  external_url?: string | null;
  external_source?: string | null;
  external_cover_url?: string | null;
};
export type StatsRow = { collection_id: string; owned: number | null; total: number | null; cover_path?: string | null };

/** Ce qu'affiche une carte de l'accueil (US-02). */
export type CollectionCard = {
  id: string;
  name: string;
  /** Catégorie (US-19), null = sans catégorie. */
  category: string | null;
  coverPath: string | null;
  createdAt: string;
  progress: Progress;
  /** Présents uniquement pour une collection liée à un site compagnon (/api/suivi). */
  externalUrl?: string;
  externalSource?: string | null;
  externalCoverUrl?: string | null;
};

/**
 * Assemble les collections et leurs statistiques (vue collection_stats).
 * Une collection sans ligne de statistiques (cas limite) est affichée à 0 / 0.
 * Couverture : celle calculée par la vue (cover_path, sinon image du premier item — migration 0005).
 * L'ordre d'affichage est fixé ensuite par sortCards (US-05).
 */
export function toCollectionCards(collections: CollectionRow[], stats: StatsRow[]): CollectionCard[] {
  const statsParId = new Map(stats.map((s) => [s.collection_id, s]));
  return collections.map((c) => {
    const s = statsParId.get(c.id);
    const carte: CollectionCard = {
      id: c.id,
      name: c.name,
      category: c.category ?? null,
      coverPath: s?.cover_path ?? c.cover_path,
      createdAt: c.created_at,
      progress: computeProgress(s?.owned ?? 0, s?.total ?? 0),
    };
    if (c.external_url) {
      carte.externalUrl = c.external_url;
      carte.externalSource = c.external_source ?? null;
      carte.externalCoverUrl = c.external_cover_url ?? null;
    }
    return carte;
  });
}
