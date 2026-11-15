"use server";

import { revalidatePath } from "next/cache";
import { validateCollectionName } from "@/lib/collections/name";
import { isUuid } from "@/lib/ids";
import { enregistrerImage } from "@/lib/images/enregistrer";
import { TAILLE_MAX_ENVOI } from "@/lib/images/thumbnail";
import { adresse, ITEMS_PAR_APPEL, nettoyerItem, nomSansDoublon } from "@/lib/sauvegarde";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Import d'une sauvegarde (US-11), piloté par le navigateur qui a ouvert le .zip :
// 1. creerCollectionImportee, 2. ajouterItemsImportes par paquets, 3. enregistrerImagesImportees par lots de 10.
// Tout ce qui arrive du navigateur est revérifié ici ; la RLS limite chaque écriture à l'utilisateur connecté.

const ERREUR = "L’import a échoué. Réessayez dans un instant.";
const IMAGES_PAR_APPEL = 10;

/** Ajoute une collection, renommée « Nom (importée) » si le nom est déjà pris. */
export async function creerCollectionImportee(nom: string, pageSource: string | null): Promise<{ id: string; nom: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: existantes, error: erreurLecture } = await supabase.from("collections").select("name");
  if (erreurLecture) return { error: ERREUR };

  const valide = validateCollectionName(nom);
  const libre = nomSansDoublon(valide.ok ? valide.name : "Collection importée", existantes.map((c) => c.name));
  const { data, error } = await supabase
    .from("collections")
    .insert({ name: libre, source_url: adresse(pageSource) })
    .select("id")
    .single();
  if (error) return { error: ERREUR };
  revalidatePath("/");
  return { id: data.id, nom: libre };
}

/** Ajoute des items dans l'ordre, à partir de la position `depart` ; renvoie leurs identifiants dans le même ordre. */
export async function ajouterItemsImportes(collectionId: string, items: unknown[], depart: number): Promise<{ ids: string[] } | { error: string }> {
  if (!isUuid(collectionId) || !Array.isArray(items) || items.length > ITEMS_PAR_APPEL || !Number.isInteger(depart) || depart < 1) {
    return { error: ERREUR };
  }
  if (items.length === 0) return { ids: [] };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("items")
    .insert(
      items.map(nettoyerItem).map((item, index) => ({
        collection_id: collectionId,
        title: item.intitule,
        owned: item.possede,
        source_image: item.image_source,
        position: depart + index,
      })),
    )
    .select("id, position");
  if (error) return { error: ERREUR };
  return { ids: data.sort((a, b) => a.position - b.position).map((item) => item.id) };
}

/**
 * Range les images d'un lot (champs `itemId` et `image`, dans le même ordre). Chaque image est ré-encodée
 * en vignette WebP par sharp : on ne stocke jamais le fichier reçu tel quel. Renvoie le nombre d'échecs.
 */
export async function enregistrerImagesImportees(formData: FormData): Promise<{ echecs: number }> {
  const collectionId = formData.get("collectionId");
  const ids = formData.getAll("itemId").slice(0, IMAGES_PAR_APPEL);
  const images = formData.getAll("image").slice(0, IMAGES_PAR_APPEL);
  if (!isUuid(collectionId) || ids.length !== images.length) return { echecs: images.length };

  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase
    .from("items")
    .select("id, source_image")
    .eq("collection_id", collectionId)
    .in("id", ids.filter(isUuid));
  const sources = new Map((items ?? []).map((item) => [item.id, item.source_image]));

  let echecs = 0;
  for (const [index, id] of ids.entries()) {
    const image = images[index];
    const ok =
      typeof id === "string" &&
      sources.has(id) &&
      image instanceof File &&
      image.size > 0 &&
      image.size <= TAILLE_MAX_ENVOI &&
      (await enregistrerImage(supabase, collectionId, id, { donnees: await image.arrayBuffer(), source: sources.get(id) ?? null }));
    if (!ok) echecs++;
  }
  revalidatePath(`/collections/${collectionId}`);
  return { echecs };
}
