import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase côté serveur (composants serveur, server actions, routes).
 * La session de l'utilisateur est lue dans les cookies : les requêtes passent par la RLS en son nom.
 * À créer à chaque requête, jamais partagé entre deux utilisateurs.
 */
export async function createSupabaseServerClient() {
  // Lire les cookies EN PREMIER : c'est ce qui indique à Next.js que la page dépend de l'utilisateur
  // (rendu à chaque requête, jamais pré-généré au build, où les variables Supabase n'existent pas).
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un composant serveur, où les cookies sont en lecture seule :
          // sans gravité, le proxy rafraîchit la session à chaque requête (US-01).
        }
      },
    },
  });
}
