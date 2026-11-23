"use server";

import { construireExport, type Export } from "@/lib/export";
import { urlImage } from "@/lib/images/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** La base renvoie au plus 1000 lignes par requête (supabase/config.toml, max_rows) : on lit par pages. */
const PAGE = 1000;

export type ExportPrepare = { donnees: Export["donnees"]; images: { cheminZip: string; url: string }[] } | { error: string };

/**
 * Prépare la sauvegarde (SPEC.md §4) : toutes les collections et tous les items de l'utilisateur (RLS),
 * et l'adresse publique de chaque image. Le navigateur télécharge ensuite les images et fabrique le zip :
 * le serveur n'a pas à transporter des dizaines de Mo (limite de taille des réponses Vercel).
 */
export async function preparerExport(): Promise<ExportPrepare> {
  const supabase = await createSupabaseServerClient();
  const { data: collections, error } = await supabase.from("collections").select("id, name, category, source_url, created_at");
  if (error) return { error: "L’export n’a pas pu être préparé. Réessayez dans un instant." };

  const items = [];
  for (let debut = 0; ; debut += PAGE) {
    const { data, error: erreurItems } = await supabase
      .from("items")
      .select("id, collection_id, title, position, owned, image_path, source_image, created_at")
      .order("id")
      .range(debut, debut + PAGE - 1);
    if (erreurItems) return { error: "L’export n’a pas pu être préparé. Réessayez dans un instant." };
    items.push(...data);
    if (data.length < PAGE) break;
  }

  const { donnees, images } = construireExport(collections, items, new Date());
  return { donnees, images: images.map((image) => ({ cheminZip: image.cheminZip, url: urlImage(image.cheminStockage) })) };
}
