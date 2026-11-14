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
