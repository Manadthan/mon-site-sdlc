import { supabaseEnv } from "@/lib/supabase/env";

/** Bucket des vignettes (migration 0003_images.sql). */
export const BUCKET_IMAGES = "items";

/**
 * Version de la fabrication des vignettes, inscrite dans leur nom.
 * v2 : bords vides rognés. Un nouveau nom donne une nouvelle URL : le navigateur, qui garde
 * les vignettes en cache un an, affiche bien l'image retraitée.
 */
export const VERSION_VIGNETTE = 2;

/** Chemin d'une vignette dans le bucket (ADR-05) : le dossier d'un utilisateur, puis celui de la collection. */
export function cheminImage(userId: string, collectionId: string, itemId: string): string {
  return `${userId}/${collectionId}/${itemId}-v${VERSION_VIGNETTE}.webp`;
}

/** Vignette fabriquée avant la version actuelle (bords non rognés) : à retraiter. */
export function vignetteAncienne(chemin: string | null): chemin is string {
  return chemin !== null && !chemin.endsWith(`-v${VERSION_VIGNETTE}.webp`);
}

/** Dossier de toutes les vignettes d'une collection (supprimé avec elle, US-04). */
export function dossierCollection(userId: string, collectionId: string): string {
  return `${userId}/${collectionId}`;
}

/** URL publique d'une vignette, affichable directement dans une balise <img>. */
export function urlImage(chemin: string): string {
  return `${supabaseEnv().url}/storage/v1/object/public/${BUCKET_IMAGES}/${chemin}`;
}
