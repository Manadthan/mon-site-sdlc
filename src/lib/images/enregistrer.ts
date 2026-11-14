import "server-only";
import { BUCKET_IMAGES, cheminImage } from "@/lib/images/storage";
import { versVignette } from "@/lib/images/thumbnail";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Convertit l'image en vignette, la range dans le dossier de l'utilisateur (ADR-05) et la relie à l'item. */
export async function enregistrerImage(
  supabase: Supabase,
  collectionId: string,
  itemId: string,
  image: { donnees: Buffer | ArrayBuffer; source: string | null },
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const chemin = cheminImage(user.id, collectionId, itemId);
    const vignette = await versVignette(image.donnees);
    const { error } = await supabase.storage
      .from(BUCKET_IMAGES)
      .upload(chemin, vignette, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (error) return false;
    const { error: lien } = await supabase
      .from("items")
      .update({ image_path: chemin, source_image: image.source })
      .eq("id", itemId);
    return !lien;
  } catch {
    // Image illisible (fichier abîmé, format inconnu) : l'item reste, sans image.
    return false;
  }
}
