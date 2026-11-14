"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateCollectionName } from "@/lib/collections/name";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateCollectionState = { error?: string; name?: string };

/** Crée une collection vide (US-03, partie 1/2). user_id est rempli par la base (auth.uid()). */
export async function createCollection(
  _previous: CreateCollectionState,
  formData: FormData,
): Promise<CreateCollectionState> {
  const saisie = formData.get("name");
  const resultat = validateCollectionName(saisie);
  if (!resultat.ok) return { error: resultat.error, name: typeof saisie === "string" ? saisie : "" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("collections").insert({ name: resultat.name });
  if (error) {
    return { error: "La collection n'a pas pu être créée. Réessayez dans un instant.", name: resultat.name };
  }

  redirect("/");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Supprime une collection (US-04). Ses items partent avec elle (ON DELETE CASCADE).
 * La RLS empêche de supprimer la collection d'un autre : 0 ligne supprimée = refus.
 * Images : il n'y a pas encore de stockage d'images (étape 5-6) ; leur suppression
 * ({user_id}/{collection_id}/, ADR-05) sera ajoutée ici avec le bucket.
 */
export async function deleteCollection(id: string): Promise<{ error?: string }> {
  if (!UUID.test(id)) return { error: "Collection introuvable." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("collections").delete().eq("id", id).select("id");
  if (error) return { error: "La suppression a échoué. Réessayez dans un instant." };
  if (data.length === 0) return { error: "Collection introuvable." };

  revalidatePath("/");
  return {};
}
