import type { Metadata } from "next";
import Link from "next/link";
import { NewCollectionForm } from "@/components/NewCollectionForm";
import { chargerCategories } from "@/lib/collections/categorieServeur";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nouvelle collection · Suivi de collections" };

// Les actions serveur de cette page (analyse, copie d'un lot de 10 images) peuvent attendre des sites lents :
// jusqu'à 60 s par appel au lieu de la limite par défaut (ADR-03).
export const maxDuration = 60;

// Création d'une collection (US-03) : depuis l'adresse d'une page (aperçu puis import), ou vide.
export default async function NewCollectionPage() {
  // Catégories déjà utilisées, proposées dans le champ (US-19).
  const categories = await chargerCategories(await createSupabaseServerClient());
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center gap-1 border-b border-bordure bg-surface pt-[max(env(safe-area-inset-top),8px)] pr-2 pb-2.5 pl-2">
        <Link href="/" aria-label="Annuler et revenir" className="flex size-11 items-center justify-center text-texte">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Nouvelle collection</h1>
      </header>
      <main className="px-4 pt-4 pb-6">
        <NewCollectionForm categories={categories} />
      </main>
    </div>
  );
}
