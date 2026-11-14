import type { Metadata } from "next";
import Link from "next/link";
import { NewCollectionForm } from "@/components/NewCollectionForm";

export const metadata: Metadata = { title: "Nouvelle collection · Suivi de collections" };

// Création d'une collection (US-03). Partie 1/2 : collection vide — maquette n° 11 (bas de l'écran).
// L'adresse de la page source, l'aperçu et l'import s'ajouteront ici à l'étape 6.
export default function NewCollectionPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center gap-1 border-b border-bordure bg-white pt-[max(env(safe-area-inset-top),8px)] pr-2 pb-2.5 pl-2">
        <Link href="/" aria-label="Annuler et revenir" className="flex size-11 items-center justify-center text-texte">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Nouvelle collection</h1>
      </header>
      <main className="px-4 pt-4">
        <NewCollectionForm />
      </main>
    </div>
  );
}
