import { createClient } from "@supabase/supabase-js";
import { UTILISATEUR_TEST } from "./utilisateur";

/**
 * Crée le compte de test sur la base Supabase locale (ADR-01 : les inscriptions sont fermées,
 * le compte est créé par l'API d'administration, comme le propriétaire le fait à la main en production).
 */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.E2E_SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Tests e2e : une base Supabase locale est nécessaire (npm run db:start), avec NEXT_PUBLIC_SUPABASE_URL, " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY et E2E_SUPABASE_SECRET_KEY dans .env.local (voir README).",
    );
  }
  // Garde-fou : jamais de compte de test sur la base de production.
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error(`Tests e2e refusés : ${url} n'est pas une base Supabase locale.`);
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.createUser({
    email: UTILISATEUR_TEST.email,
    password: UTILISATEUR_TEST.password,
    email_confirm: true,
  });
  if (error && error.code !== "email_exists") throw error;
}
