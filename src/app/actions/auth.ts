"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

/** Connexion par e-mail et mot de passe (US-01). */
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Saisissez votre e-mail et votre mot de passe.", email };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Message volontairement vague : ne pas révéler lequel des deux champs est faux (US-01).
    const identifiantsRefuses = error.status === 400;
    return {
      error: identifiantsRefuses
        ? "E-mail ou mot de passe incorrect."
        : "Connexion impossible pour le moment. Réessayez dans un instant.",
      email,
    };
  }

  redirect("/");
}

/** Déconnexion (US-01). */
export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
