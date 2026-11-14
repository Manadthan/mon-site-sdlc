"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/ids";
import { messageEchecImage, telechargerImage } from "@/lib/images/download";
import { enregistrerImage } from "@/lib/images/enregistrer";
import { BUCKET_IMAGES } from "@/lib/images/storage";
import { TAILLE_MAX_ENVOI } from "@/lib/images/thumbnail";
import { positionSuivante, validateItemTitle } from "@/lib/items/title";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AddItemState = { error?: string; warning?: string; title?: string; imageUrl?: string; ok?: number };

const POSITION_DEJA_PRISE = "23505";

/**
 * Ajoute un item en fin de collection (US-08, US-10 « un item ajouté se place en fin de liste »),
 * avec une image facultative convertie en vignette WebP (ADR-02) :
 * - soit une photo, déjà réduite dans le navigateur ;
 * - soit l'adresse d'une image, téléchargée côté serveur avec la protection SSRF (DESIGN.md §6).
 * La RLS refuse l'ajout dans la collection d'un autre.
 */
export async function addItem(collectionId: string, _previous: AddItemState, formData: FormData): Promise<AddItemState> {
  const saisie = formData.get("title");
  const champUrl = formData.get("imageUrl");
  const imageUrl = typeof champUrl === "string" ? champUrl.trim() : "";
  const resultat = validateItemTitle(saisie);
  if (!resultat.ok) return { error: resultat.error, title: typeof saisie === "string" ? saisie : "", imageUrl };
  if (!isUuid(collectionId)) return { error: "Collection introuvable." };
  const retour = (error: string): AddItemState => ({ error, title: resultat.title, imageUrl });

  const photo = formData.get("image");
  const avecPhoto = photo instanceof File && photo.size > 0;
  if (avecPhoto && imageUrl) return retour("Choisissez une photo ou une adresse d’image, pas les deux.");
  if (avecPhoto && (!photo.type.startsWith("image/") || photo.size > TAILLE_MAX_ENVOI)) {
    return retour("Cette image n’est pas acceptée (photo de 2 Mo au plus).");
  }

  // L'image par adresse est téléchargée avant de créer l'item : si l'adresse est mauvaise,
  // rien n'est enregistré et l'utilisateur peut la corriger.
  let image: { donnees: Buffer | ArrayBuffer; source: string | null } | undefined;
  if (avecPhoto) image = { donnees: await photo.arrayBuffer(), source: null };
  else if (imageUrl) {
    try {
      image = { donnees: await telechargerImage(imageUrl), source: imageUrl };
    } catch (erreur) {
      return retour(messageEchecImage(erreur));
    }
  }

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

    const { data: cree, error } = await supabase
      .from("items")
      .insert({ collection_id: collectionId, title: resultat.title, position: positionSuivante(dernier?.position) })
      .select("id")
      .single();

    if (!error) {
      const imageOk = image ? await enregistrerImage(supabase, collectionId, cree.id, image) : true;
      revalidatePath(`/collections/${collectionId}`);
      revalidatePath("/");
      // ok : valeur changeante, le formulaire sait qu'un ajout vient de réussir et se vide.
      return imageOk
        ? { ok: Date.now() }
        : { ok: Date.now(), warning: "Item ajouté, mais l’image n’a pas pu être enregistrée." };
    }
    if (error.code !== POSITION_DEJA_PRISE) break;
  }
  return retour("L’item n’a pas pu être ajouté. Réessayez dans un instant.");
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
  const { data, error } = await supabase.from("items").delete().eq("id", itemId).select("collection_id, image_path");
  if (error || data.length === 0) return { error: "La suppression a échoué. Réessayez dans un instant." };
  // Son image part avec lui (un échec ici ne laisse qu'un fichier orphelin, sans effet visible).
  if (data[0]!.image_path) await supabase.storage.from(BUCKET_IMAGES).remove([data[0]!.image_path]);

  revalidatePath(`/collections/${data[0]!.collection_id}`);
  revalidatePath("/");
  return {};
}

/** Monte ou descend un item d'une place (US-10), via la fonction SQL move_item (ADR-04). */
export async function moveItem(collectionId: string, itemId: string, direction: "up" | "down"): Promise<{ error?: string }> {
  if (!isUuid(collectionId) || !isUuid(itemId) || (direction !== "up" && direction !== "down")) {
    return { error: "Item introuvable." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("move_item", { p_item_id: itemId, p_direction: direction });
  if (error) return { error: "Le nouvel ordre n’a pas pu être enregistré. Réessayez." };

  revalidatePath(`/collections/${collectionId}`);
  return {};
}
