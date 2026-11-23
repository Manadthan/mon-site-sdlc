import "server-only";
import { harmoniserCategorie, validerCategorie } from "@/lib/collections/categorie";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Catégorie saisie (US-19), vérifiée puis alignée sur l'orthographe d'une catégorie existante
 * (« mangas » → « Mangas ») : la casse ne crée pas de nouvelle section sur l'accueil.
 */
export async function lireCategorie(
  supabase: Client,
  saisie: unknown,
): Promise<{ ok: true; category: string | null } | { ok: false; error: string }> {
  const resultat = validerCategorie(saisie);
  if (!resultat.ok || resultat.category === null) return resultat;
  // La RLS limite la lecture aux collections de l'utilisateur.
  const { data } = await supabase.from("collections").select("category").not("category", "is", null);
  return { ok: true, category: harmoniserCategorie(resultat.category, (data ?? []).map((c) => c.category)) };
}

/** Catégories déjà utilisées, pour les suggestions du champ. */
export async function chargerCategories(supabase: Client): Promise<(string | null)[]> {
  const { data } = await supabase.from("collections").select("category").not("category", "is", null);
  return (data ?? []).map((c) => c.category);
}
