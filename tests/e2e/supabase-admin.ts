import { createClient } from "@supabase/supabase-js";
import type { TestInfo } from "@playwright/test";
import type { Database } from "../../src/types/database";

/**
 * Client d'administration de la base Supabase LOCALE des tests (contourne la RLS) :
 * sert uniquement à préparer des données. global-setup.ts a déjà vérifié que l'adresse est locale.
 */
export function adminSupabase() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.E2E_SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Crée un utilisateur propre à un test (et à un navigateur), pour que les tests ne se gênent pas. */
export async function nouvelUtilisateur(prefixe: string, testInfo: TestInfo) {
  const identifiants = {
    email: `${prefixe}-${testInfo.project.name}-${Date.now()}@exemple.fr`,
    password: "Mot-de-passe-e2e-42",
  };
  const { data, error } = await adminSupabase().auth.admin.createUser({ ...identifiants, email_confirm: true });
  if (error) throw error;
  return { ...identifiants, id: data.user.id };
}

/** Crée une collection et ses items (owned = nombre d'items possédés, les premiers). */
export async function creerCollection(userId: string, name: string, nbItems: number, owned: number) {
  const admin = adminSupabase();
  const { data, error } = await admin.from("collections").insert({ name, user_id: userId }).select("id").single();
  if (error) throw error;
  if (nbItems > 0) {
    const items = Array.from({ length: nbItems }, (_, i) => ({
      collection_id: data.id,
      title: `Item ${i + 1}`,
      position: i + 1,
      owned: i < owned,
    }));
    const { error: errItems } = await admin.from("items").insert(items);
    if (errItems) throw errItems;
  }
  return data.id;
}
