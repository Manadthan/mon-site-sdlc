"use server";

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
