/** Variables publiques de connexion à Supabase (visibles dans le navigateur, protégées par la RLS). */
export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

/**
 * Vérifie les variables et renvoie un message clair si l'une manque,
 * plutôt qu'une erreur obscure de Supabase au premier appel.
 */
export function readSupabaseEnv(env: Record<string, string | undefined>): SupabaseEnv {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  const manquantes = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);
  if (manquantes.length > 0) {
    throw new Error(
      `Variable(s) d'environnement manquante(s) : ${manquantes.join(", ")}. ` +
        "En local : copier .env.example en .env.local. En ligne : réglages Vercel → Environment Variables.",
    );
  }

  if (!URL.canParse(url!) || !/^https?:$/.test(new URL(url!).protocol)) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL n'est pas une adresse valide : « ${url} ».`);
  }

  return { url: url!, publishableKey: publishableKey! };
}

/**
 * Next.js ne remplace les NEXT_PUBLIC_* dans le code du navigateur que s'ils sont écrits en toutes lettres :
 * d'où cet objet explicite plutôt que `process.env` passé tel quel.
 */
export function supabaseEnv(): SupabaseEnv {
  return readSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
