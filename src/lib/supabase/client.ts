import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

/** Client Supabase côté navigateur (composants « use client »). */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient(url, publishableKey);
}
