"use server";

import { revalidatePath } from "next/cache";
import { adresseWeb, validerElements } from "@/lib/collections/import";
import { enParallele, TAILLE_LOT } from "@/lib/collections/lots";
import { lireCategorie } from "@/lib/collections/categorieServeur";
import { validateCollectionName } from "@/lib/collections/name";
import {
  interrogerSourceExterne,
  messageErreurExterne,
  reconnaitreSourceExterne,
  type DonneesExterne,
} from "@/lib/externes/sources";
import { isUuid } from "@/lib/ids";
import { telechargerImage } from "@/lib/images/download";
import { enregistrerImage } from "@/lib/images/enregistrer";
import { scrapePreview, type Apercu } from "@/lib/scraper";
import { messageEchecPage, type MessageEchec } from "@/lib/scraper/messages";
import { ErreurRecuperation } from "@/lib/scraper/ssrf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AnalyseState = { url?: string; apercu?: Apercu; externe?: DonneesExterne; echec?: MessageEchec };

/**
 * Analyse une page (US-03, ADR-03 étape 1) : renvoie l'aperçu, n'écrit rien.
 * Si l'adresse appartient à un site compagnon autorisé (ex. Nintendo DB), interroge son endpoint /api/suivi.
 * Réservé à l'utilisateur connecté : le serveur ne doit pas aller chercher des pages pour n'importe qui.
 */
export async function analyserPage(_previous: AnalyseState, formData: FormData): Promise<AnalyseState> {
  const saisie = formData.get("url");
  const url = typeof saisie === "string" ? saisie.trim() : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url, echec: { titre: "Session expirée", texte: "Reconnectez-vous, puis réessayez." } };

  if (reconnaitreSourceExterne(url)) {
    const resultat = await interrogerSourceExterne(url);
    if (resultat.ok) return { url: resultat.donnees.url, externe: resultat.donnees };
    return { url, echec: messageErreurExterne(resultat.raison, resultat.label) };
  }

  try {
    return { url, apercu: await scrapePreview(url) };
  } catch (erreur) {
    return { url, echec: messageEchecPage(erreur instanceof ErreurRecuperation ? erreur.raison : undefined) };
  }
}

export type ImportState = { error?: string; collectionId?: string; itemIds?: string[] };

/**
 * Crée la collection et ses items à partir des éléments retenus (US-03), dans l'ordre de la page.
 * Les items gardent l'adresse de leur image (source_image) ; le navigateur fait ensuite copier
 * les images par lots avec importerImages (ADR-03 étape 2).
 */
export async function importerCollection(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const nom = validateCollectionName(formData.get("name"));
  if (!nom.ok) return { error: nom.error };
  const selection = validerElements(formData.get("items"));
  if (!selection.ok) return { error: selection.error };
  const sourceUrl = adresseWeb(formData.get("sourceUrl")) ?? null;

  const supabase = await createSupabaseServerClient();
  const categorie = await lireCategorie(supabase, formData.get("category"));
  if (!categorie.ok) return { error: categorie.error };
  const { data: collection, error } = await supabase
    .from("collections")
    .insert({ name: nom.name, source_url: sourceUrl, category: categorie.category })
    .select("id")
    .single();
  if (error) return { error: "La collection n’a pas pu être créée. Réessayez dans un instant." };

  const { data: items, error: erreurItems } = await supabase.from("items").insert(
    selection.elements.map((element, index) => ({
      collection_id: collection.id,
      title: element.title,
      source_image: element.imageUrl,
      position: index + 1,
    })),
  ).select("id, position");
  if (erreurItems) {
    // Pas de collection à moitié créée : on la retire (ses items éventuels partent avec elle).
    await supabase.from("collections").delete().eq("id", collection.id);
    return { error: "Les éléments n’ont pas pu être enregistrés. Réessayez dans un instant." };
  }

  revalidatePath("/");
  return { collectionId: collection.id, itemIds: items.sort((a, b) => a.position - b.position).map((i) => i.id) };
}

/**
 * Complète une collection existante (US-13) : ajoute les éléments retenus en fin de collection,
 * dans l'ordre de la page. Les images sont copiées ensuite par lots, comme à la création.
 */
export async function completerCollection(collectionId: string, _previous: ImportState, formData: FormData): Promise<ImportState> {
  if (!isUuid(collectionId)) return { error: "Collection introuvable." };
  const selection = validerElements(formData.get("items"));
  if (!selection.ok) return { error: selection.error };

  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie rien pour la collection d'un autre : même réponse qu'une collection inexistante.
  const { data: collection } = await supabase.from("collections").select("id").eq("id", collectionId).maybeSingle();
  if (!collection) return { error: "Collection introuvable." };
  const { data: dernier } = await supabase
    .from("items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const depart = (dernier?.position ?? 0) + 1;

  const { data: items, error } = await supabase
    .from("items")
    .insert(
      selection.elements.map((element, index) => ({
        collection_id: collectionId,
        title: element.title,
        source_image: element.imageUrl,
        position: depart + index,
      })),
    )
    .select("id, position");
  if (error) return { error: "Les éléments n’ont pas pu être ajoutés. Réessayez dans un instant." };

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/");
  return { collectionId, itemIds: items.sort((a, b) => a.position - b.position).map((i) => i.id) };
}

/** Téléchargements simultanés au plus, vers le site source. */
const SIMULTANES = 4;

export type LotState = { copiees: number; echecs: number };

/**
 * Copie les images d'un lot d'items (US-03, ADR-02, ADR-03 étape 2) : téléchargement depuis
 * source_image avec la protection SSRF, vignette WebP, rangement dans le Storage.
 * Une image en échec laisse l'item sans image (on pourra en ajouter une). Les items déjà pourvus sont ignorés.
 */
export async function importerImages(collectionId: string, itemIds: string[]): Promise<LotState> {
  const ids = Array.isArray(itemIds) ? itemIds.filter(isUuid).slice(0, TAILLE_LOT) : [];
  if (!isUuid(collectionId) || ids.length === 0) return { copiees: 0, echecs: 0 };

  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie que les items des collections de l'utilisateur.
  const { data: items } = await supabase
    .from("items")
    .select("id, source_image, image_path")
    .eq("collection_id", collectionId)
    .in("id", ids);
  const aCopier = (items ?? []).filter((item) => item.source_image && !item.image_path);

  const resultats = await enParallele(
    aCopier.map((item) => async () => {
      try {
        const donnees = await telechargerImage(item.source_image!);
        return await enregistrerImage(supabase, collectionId, item.id, { donnees, source: item.source_image });
      } catch {
        return false;
      }
    }),
    SIMULTANES,
  );

  revalidatePath(`/collections/${collectionId}`);
  const copiees = resultats.filter(Boolean).length;
  return { copiees, echecs: ids.length - copiees };
}
