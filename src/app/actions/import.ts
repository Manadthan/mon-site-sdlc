"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adresseWeb, validerElements } from "@/lib/collections/import";
import { validateCollectionName } from "@/lib/collections/name";
import { scrapePreview, type Apercu } from "@/lib/scraper";
import { messageEchecPage, type MessageEchec } from "@/lib/scraper/messages";
import { ErreurRecuperation } from "@/lib/scraper/ssrf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AnalyseState = { url?: string; apercu?: Apercu; echec?: MessageEchec };

/**
 * Analyse une page (US-03, ADR-03 étape 1) : renvoie l'aperçu, n'écrit rien.
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

  try {
    return { url, apercu: await scrapePreview(url) };
  } catch (erreur) {
    return { url, echec: messageEchecPage(erreur instanceof ErreurRecuperation ? erreur.raison : undefined) };
  }
}

export type ImportState = { error?: string };

/**
 * Crée la collection et ses items à partir des éléments retenus (US-03), dans l'ordre de la page.
 * Les items gardent l'adresse de leur image (source_image) : la copie des images vient ensuite (ADR-03 étape 2).
 */
export async function importerCollection(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const nom = validateCollectionName(formData.get("name"));
  if (!nom.ok) return { error: nom.error };
  const selection = validerElements(formData.get("items"));
  if (!selection.ok) return { error: selection.error };
  const sourceUrl = adresseWeb(formData.get("sourceUrl")) ?? null;

  const supabase = await createSupabaseServerClient();
  const { data: collection, error } = await supabase
    .from("collections")
    .insert({ name: nom.name, source_url: sourceUrl })
    .select("id")
    .single();
  if (error) return { error: "La collection n’a pas pu être créée. Réessayez dans un instant." };

  const { error: erreurItems } = await supabase.from("items").insert(
    selection.elements.map((element, index) => ({
      collection_id: collection.id,
      title: element.title,
      source_image: element.imageUrl,
      position: index + 1,
    })),
  );
  if (erreurItems) {
    // Pas de collection à moitié créée : on la retire (ses items éventuels partent avec elle).
    await supabase.from("collections").delete().eq("id", collection.id);
    return { error: "Les éléments n’ont pas pu être enregistrés. Réessayez dans un instant." };
  }

  revalidatePath("/");
  redirect(`/collections/${collection.id}`);
}
