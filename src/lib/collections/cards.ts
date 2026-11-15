import { computeProgress, type Progress } from "@/lib/progress";

export type CollectionRow = { id: string; name: string; cover_path: string | null; created_at: string };
export type StatsRow = { collection_id: string; owned: number | null; total: number | null; cover_path?: string | null };

/** Ce qu'affiche une carte de l'accueil (US-02). */
export type CollectionCard = {
  id: string;
  name: string;
  coverPath: string | null;
  createdAt: string;
  progress: Progress;
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
    return {
      id: c.id,
      name: c.name,
      coverPath: s?.cover_path ?? c.cover_path,
      createdAt: c.created_at,
      progress: computeProgress(s?.owned ?? 0, s?.total ?? 0),
    };
  });
}
