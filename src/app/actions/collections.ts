"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { lireCategorie } from "@/lib/collections/categorieServeur";
import { cheminCopie, nomDeCopie } from "@/lib/collections/duplication";
import { enParallele, TAILLE_LOT } from "@/lib/collections/lots";
import { validateCollectionName } from "@/lib/collections/name";
import { isUuid } from "@/lib/ids";
import { BUCKET_IMAGES, dossierCollection } from "@/lib/images/storage";
import { nextSort, parseSort, serializeSort, SORT_COOKIE, SORT_KEYS, type SortKey } from "@/lib/collections/sort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateCollectionState = { error?: string; name?: string };

/** Crée une collection vide (US-03, partie 1/2), avec sa catégorie facultative (US-19). user_id est rempli par la base (auth.uid()). */
export async function createCollection(
  _previous: CreateCollectionState,
  formData: FormData,
): Promise<CreateCollectionState> {
  const saisie = formData.get("name");
  const resultat = validateCollectionName(saisie);
  if (!resultat.ok) return { error: resultat.error, name: typeof saisie === "string" ? saisie : "" };

  const supabase = await createSupabaseServerClient();
  const categorie = await lireCategorie(supabase, formData.get("category"));
  if (!categorie.ok) return { error: categorie.error, name: resultat.name };
  const { error } = await supabase.from("collections").insert({ name: resultat.name, category: categorie.category });
  if (error) {
    return { error: "La collection n'a pas pu être créée. Réessayez dans un instant.", name: resultat.name };
  }

  redirect("/");
}

export type RenameCollectionState = { error?: string; name?: string; category?: string; ok?: number };

/**
 * Renomme une collection (US-12) et change sa catégorie (US-19).
 * L'identifiant arrive par un champ caché ; la RLS refuse la collection d'un autre.
 */
export async function renameCollection(_previous: RenameCollectionState, formData: FormData): Promise<RenameCollectionState> {
  const id = formData.get("collectionId");
  const saisie = formData.get("name");
  const saisieCategorie = formData.get("category");
  const category = typeof saisieCategorie === "string" ? saisieCategorie : "";
  if (!isUuid(id)) return { error: "Collection introuvable." };
  const resultat = validateCollectionName(saisie);
  if (!resultat.ok) return { error: resultat.error, name: typeof saisie === "string" ? saisie : "", category };

  const supabase = await createSupabaseServerClient();
  const categorie = await lireCategorie(supabase, saisieCategorie);
  if (!categorie.ok) return { error: categorie.error, name: resultat.name, category };
  const { data, error } = await supabase
    .from("collections")
    .update({ name: resultat.name, category: categorie.category })
    .eq("id", id)
    .select("id");
  if (error || data.length === 0) {
    return { error: "Les modifications n’ont pas pu être enregistrées. Réessayez dans un instant.", name: resultat.name, category };
  }
  revalidatePath(`/collections/${id}`);
  revalidatePath("/");
  return { ok: Date.now() };
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
  // Même tri sur la liste partagée (US-17) : le visiteur a son propre cookie.
  revalidatePath("/partage", "layout");
}

const ECHEC_DUPLICATION = "La collection n’a pas pu être dupliquée. Réessayez dans un instant.";

/**
 * Duplique une collection (US-18) : « Nom (copie) », même catégorie et page source, mêmes items dans le même ordre,
 * aucun coché. Les vignettes sont copiées par Supabase dans le dossier de la copie (10 à la fois) : supprimer
 * l'original ne les efface pas. Une copie d'image ratée laisse l'item sans image, rattrapable par la reprise
 * d'import (#51) grâce à son adresse d'origine. Si les items ne peuvent pas être enregistrés, rien ne reste.
 */
export async function dupliquerCollection(id: string): Promise<{ error?: string; id?: string }> {
  if (!isUuid(id)) return { error: "Collection introuvable." };

  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie que les collections et items de l'utilisateur connecté.
  const [{ data: source }, { data: items, error: erreurItems }, { data: noms }] = await Promise.all([
    supabase.from("collections").select("user_id, name, category, source_url").eq("id", id).maybeSingle(),
    supabase.from("items").select("id, title, image_path, source_image, position").eq("collection_id", id).order("position"),
    supabase.from("collections").select("name"),
  ]);
  if (!source) return { error: "Collection introuvable." };
  if (erreurItems) return { error: ECHEC_DUPLICATION };

  const { data: copie, error } = await supabase
    .from("collections")
    .insert({
      name: nomDeCopie(source.name, (noms ?? []).map((n) => n.name)),
      category: source.category,
      source_url: source.source_url,
    })
    .select("id")
    .single();
  if (error) return { error: ECHEC_DUPLICATION };

  const stockage = supabase.storage.from(BUCKET_IMAGES);
  const nouveaux = items.map((item) => ({ ancien: item, id: crypto.randomUUID() }));
  const chemins = await enParallele(
    nouveaux.map(({ ancien, id: itemId }) => async () => {
      if (!ancien.image_path) return null;
      const chemin = cheminCopie(ancien.image_path, ancien.id, { userId: source.user_id, collectionId: copie.id, itemId });
      const { error: erreurCopie } = await stockage.copy(ancien.image_path, chemin);
      return erreurCopie ? null : chemin;
    }),
    TAILLE_LOT,
  );

  const { error: erreurInsertion } = await supabase.from("items").insert(
    nouveaux.map(({ ancien, id: itemId }, index) => ({
      id: itemId,
      collection_id: copie.id,
      title: ancien.title,
      position: ancien.position,
      source_image: ancien.source_image,
      image_path: chemins[index] ?? null,
      owned: false,
    })),
  );
  if (erreurInsertion) {
    // Pas de copie à moitié faite : la collection et les fichiers déjà copiés sont retirés.
    await supabase.from("collections").delete().eq("id", copie.id);
    const copies = chemins.filter((c): c is string => c !== null);
    if (copies.length > 0) await stockage.remove(copies);
    return { error: ECHEC_DUPLICATION };
  }

  revalidatePath("/");
  return { id: copie.id };
}
