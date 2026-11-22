"use server";

import { revalidatePath } from "next/cache";
import { enParallele, TAILLE_LOT } from "@/lib/collections/lots";
import { isUuid } from "@/lib/ids";
import { BUCKET_IMAGES, cheminImage, vignetteAncienne } from "@/lib/images/storage";
import { rognerVignette } from "@/lib/images/thumbnail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Vignettes traitées en même temps (le travail se fait entre notre serveur et le Storage). */
const SIMULTANES = 4;

export type RecadrageState = { traitees: number; echecs: number };

/**
 * Retraite les vignettes d'un lot d'items importés avant le rognage des bords (issue #79) :
 * la vignette stockée est rognée, puis rangée sous son nouveau nom (VERSION_VIGNETTE) et l'ancienne supprimée.
 * Sans bord à retirer, elle est recopiée telle quelle sous le nouveau nom, sans être recompressée.
 * Piloté par le navigateur par lots de 10, comme l'import (ADR-03).
 */
export async function recadrerImages(collectionId: string, itemIds: string[]): Promise<RecadrageState> {
  const ids = Array.isArray(itemIds) ? itemIds.filter(isUuid).slice(0, TAILLE_LOT) : [];
  if (!isUuid(collectionId) || ids.length === 0) return { traitees: 0, echecs: 0 };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { traitees: 0, echecs: ids.length };

  // La RLS ne renvoie que les items des collections de l'utilisateur.
  const { data: items } = await supabase.from("items").select("id, image_path").eq("collection_id", collectionId).in("id", ids);
  const stockage = supabase.storage.from(BUCKET_IMAGES);

  const resultats = await enParallele(
    (items ?? []).map((item) => async () => {
      if (!vignetteAncienne(item.image_path)) return true; // déjà à jour
      const ancien = item.image_path;
      const nouveau = cheminImage(user.id, collectionId, item.id);
      try {
        const { data: fichier, error: lecture } = await stockage.download(ancien);
        if (lecture) return false;
        const origine = await fichier.arrayBuffer();
        const contenu = (await rognerVignette(origine)) ?? Buffer.from(origine);
        const { error: ecriture } = await stockage.upload(nouveau, contenu, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "31536000",
        });
        if (ecriture) return false;
        const { error: lien } = await supabase.from("items").update({ image_path: nouveau }).eq("id", item.id);
        if (lien) {
          await stockage.remove([nouveau]);
          return false;
        }
        await stockage.remove([ancien]);
        return true;
      } catch {
        return false;
      }
    }),
    SIMULTANES,
  );

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/");
  const traitees = resultats.filter(Boolean).length;
  return { traitees, echecs: ids.length - traitees };
}
