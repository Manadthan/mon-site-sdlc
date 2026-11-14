"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/ids";
import { positionSuivante, validateItemTitle } from "@/lib/items/title";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AddItemState = { error?: string; title?: string; ok?: number };

const POSITION_DEJA_PRISE = "23505";

/**
 * Ajoute un item en fin de collection (US-08 partie 1/2, US-10 « un item ajouté se place en fin de liste »).
 * La RLS refuse l'ajout dans la collection d'un autre. L'image facultative arrive avec la partie 2/2.
 */
export async function addItem(collectionId: string, _previous: AddItemState, formData: FormData): Promise<AddItemState> {
  const saisie = formData.get("title");
  const resultat = validateItemTitle(saisie);
  if (!resultat.ok) return { error: resultat.error, title: typeof saisie === "string" ? saisie : "" };
  if (!isUuid(collectionId)) return { error: "Collection introuvable." };

  const supabase = await createSupabaseServerClient();
  // Deux essais : si deux ajouts simultanés visent la même position, la contrainte d'unicité refuse le second.
  for (let essai = 0; essai < 2; essai++) {
    const { data: dernier } = await supabase
      .from("items")
      .select("position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase
      .from("items")
      .insert({ collection_id: collectionId, title: resultat.title, position: positionSuivante(dernier?.position) });

    if (!error) {
      revalidatePath(`/collections/${collectionId}`);
      revalidatePath("/");
      // Valeur changeante : le formulaire sait qu'un ajout vient de réussir et se vide.
      return { ok: Date.now() };
    }
    if (error.code !== POSITION_DEJA_PRISE) break;
  }
  return { error: "L’item n’a pas pu être ajouté. Réessayez dans un instant.", title: resultat.title };
}

/**
 * Enregistre l'état « possédé » d'un item (US-07). On envoie l'état voulu plutôt que « inverse » :
 * deux taps rapides donnent toujours le bon résultat, même si les requêtes se croisent.
 */
export async function setOwned(itemId: string, owned: boolean): Promise<{ error?: string }> {
  if (!isUuid(itemId) || typeof owned !== "boolean") return { error: "Item introuvable." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("items").update({ owned }).eq("id", itemId).select("collection_id");
  if (error || data.length === 0) return { error: "Le changement n’a pas pu être enregistré. Réessayez." };

  revalidatePath(`/collections/${data[0]!.collection_id}`);
  revalidatePath("/");
  return {};
}

export type RenameItemState = { error?: string; title?: string; itemId?: string; ok?: number };

/** Modifie l'intitulé d'un item (US-08, mode édition). L'identifiant arrive par un champ caché. */
export async function renameItem(_previous: RenameItemState, formData: FormData): Promise<RenameItemState> {
  const itemId = formData.get("itemId");
  const saisie = formData.get("title");
  const resultat = validateItemTitle(saisie);
  if (!isUuid(itemId)) return { error: "Item introuvable." };
  if (!resultat.ok) return { error: resultat.error, title: typeof saisie === "string" ? saisie : "", itemId };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("items")
    .update({ title: resultat.title })
    .eq("id", itemId)
    .select("collection_id");
  if (error || data.length === 0) {
    return { error: "L’intitulé n’a pas pu être modifié. Réessayez dans un instant.", title: resultat.title, itemId };
  }

  revalidatePath(`/collections/${data[0]!.collection_id}`);
  return { ok: Date.now() };
}

/**
 * Supprime un item (US-08, mode édition, après confirmation).
 * Les positions des suivants ne sont pas renumérotées : l'ordre reste juste avec des « trous ».
 */
export async function deleteItem(itemId: string): Promise<{ error?: string }> {
  if (!isUuid(itemId)) return { error: "Item introuvable." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("items").delete().eq("id", itemId).select("collection_id");
  if (error || data.length === 0) return { error: "La suppression a échoué. Réessayez dans un instant." };

  revalidatePath(`/collections/${data[0]!.collection_id}`);
  revalidatePath("/");
  return {};
}
