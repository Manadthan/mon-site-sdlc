import { supabaseEnv } from "@/lib/supabase/env";

/** Bucket des vignettes (migration 0003_images.sql). */
export const BUCKET_IMAGES = "items";

/** Chemin d'une vignette dans le bucket (ADR-05) : le dossier d'un utilisateur, puis celui de la collection. */
export function cheminImage(userId: string, collectionId: string, itemId: string): string {
  return `${userId}/${collectionId}/${itemId}.webp`;
}

/** Dossier de toutes les vignettes d'une collection (supprimé avec elle, US-04). */
export function dossierCollection(userId: string, collectionId: string): string {
  return `${userId}/${collectionId}`;
}

/** URL publique d'une vignette, affichable directement dans une balise <img>. */
export function urlImage(chemin: string): string {
  return `${supabaseEnv().url}/storage/v1/object/public/${BUCKET_IMAGES}/${chemin}`;
}
