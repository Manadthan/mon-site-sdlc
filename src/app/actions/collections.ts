"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { validateCollectionName } from "@/lib/collections/name";
import { isUuid } from "@/lib/ids";
import { BUCKET_IMAGES, dossierCollection } from "@/lib/images/storage";
import { nextSort, parseSort, serializeSort, SORT_COOKIE, SORT_KEYS, type SortKey } from "@/lib/collections/sort";
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

/**
 * Supprime une collection (US-04). Ses items partent avec elle (ON DELETE CASCADE).
 * La RLS empêche de supprimer la collection d'un autre : 0 ligne supprimée = refus.
 * Ses images partent aussi : tout le dossier {user_id}/{collection_id}/ (ADR-05).
 */
export async function deleteCollection(id: string): Promise<{ error?: string }> {
  if (!isUuid(id)) return { error: "Collection introuvable." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("collections").delete().eq("id", id).select("id, user_id");
  if (error) return { error: "La suppression a échoué. Réessayez dans un instant." };
  if (data.length === 0) return { error: "Collection introuvable." };

  // Le stockage ne supprime pas un dossier d'un coup : on liste ses fichiers puis on les retire.
  const stockage = supabase.storage.from(BUCKET_IMAGES);
  const dossier = dossierCollection(data[0]!.user_id, id);
  for (;;) {
    const { data: fichiers } = await stockage.list(dossier, { limit: 1000 });
    if (!fichiers?.length) break;
    const { error: erreurRetrait } = await stockage.remove(fichiers.map((f) => `${dossier}/${f.name}`));
    if (erreurRetrait) break;
  }

  revalidatePath("/");
  return {};
}

/** Change le tri de l'accueil et le mémorise un an dans un cookie (US-05). */
export async function changeSort(formData: FormData) {
  const choisi = formData.get("key");
  if (!SORT_KEYS.includes(choisi as SortKey)) return;

  const cookieStore = await cookies();
  const actuel = parseSort(cookieStore.get(SORT_COOKIE)?.value);
  // « Secure » seulement en HTTPS (Vercel l'indique dans x-forwarded-proto) : Safari/WebKit refuse
  // un cookie Secure sur http://localhost, où tournent les tests.
  const enHttps = (await headers()).get("x-forwarded-proto") === "https";
  cookieStore.set(SORT_COOKIE, serializeSort(nextSort(actuel, choisi as SortKey)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: enHttps,
  });
  revalidatePath("/");
}
