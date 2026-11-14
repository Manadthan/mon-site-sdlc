import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/** Client Supabase côté navigateur (composants « use client »). */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
