"use server";

import { revalidatePath } from "next/cache";
import { nouveauJetonPartage } from "@/lib/collections/partage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Partage toutes les collections en lecture seule (US-17, ADR-06) : nouveau jeton secret à chaque appel,
 * ce qui invalide l'ancien lien. Renvoie le jeton ; le navigateur construit l'adresse complète.
 * user_id est rempli par la base (auth.uid()) ; la RLS limite chacun à sa propre ligne.
 */
export async function partagerCollections(): Promise<{ jeton?: string; error?: string }> {
  const jeton = nouveauJetonPartage();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Reconnectez-vous pour partager." };
  const { error } = await supabase.from("partages").upsert({ user_id: user.id, token: jeton }).select("token").single();
  if (error) return { error: "Le lien n’a pas pu être créé. Réessayez dans un instant." };
  revalidatePath("/");
  return { jeton };
}

/** Arrête le partage (US-17) : l'ancien lien affiche « Ce lien de partage n'est plus valide ». */
export async function arreterPartage(): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Reconnectez-vous pour arrêter le partage." };
  const { error } = await supabase.from("partages").delete().eq("user_id", user.id);
  if (error) return { error: "Le partage n’a pas pu être arrêté. Réessayez dans un instant." };
  revalidatePath("/");
  return {};
}
