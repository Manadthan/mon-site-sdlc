import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { CollectionCard } from "@/components/CollectionCard";
import { LienInvalide } from "@/components/LienInvalide";
import { SortBar } from "@/components/SortBar";
import { estJetonPartage, lireCollectionsPartagees } from "@/lib/collections/partage";
import { parseSort, SORT_COOKIE, sortCards } from "@/lib/collections/sort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ jeton: string }> };

// cache : une seule lecture par affichage, partagée entre le titre de l'onglet et la page.
const chargerCollections = cache(async (jeton: string) => {
  if (!estJetonPartage(jeton)) return null;
  const supabase = await createSupabaseServerClient();
  // Fonction SQL shared_collections (ADR-06) : seule porte d'entrée d'un visiteur sans compte.
  const { data, error } = await supabase.rpc("shared_collections", { p_token: jeton });
  if (error) return null;
  return lireCollectionsPartagees(data);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cartes = await chargerCollections((await params).jeton);
  return { title: cartes ? "Collections partagées" : "Lien de partage invalide" };
}

// Liste des collections partagées (US-17) : comme l'accueil, sans création, suppression ni sauvegarde.
// Ouverte sans compte (voir proxy.ts et lib/auth/routes.ts).
export default async function PartagePage({ params }: Props) {
  const { jeton } = await params;
  const cartes = await chargerCollections(jeton);
  if (!cartes) return <LienInvalide />;

  const tri = parseSort((await cookies()).get(SORT_COOKIE)?.value);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex flex-col border-b border-bordure bg-surface pt-[max(env(safe-area-inset-top),12px)] pr-4 pb-3 pl-5">
        <h1 className="text-[26px] font-bold tracking-tight">Collections partagées</h1>
        <p className="text-[13px] text-texte-doux">Lecture seule</p>
      </header>
      {cartes.length === 0 ? (
        <main className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-[15px] text-texte-doux">Aucune collection pour l’instant.</p>
        </main>
      ) : (
        <main className="pb-10">
          <SortBar sort={tri} />
          <ul className="flex flex-col gap-2.5 px-4 pt-2" aria-label="Collections partagées">
            {sortCards(cartes, tri).map((carte) => (
              <CollectionCard key={carte.id} carte={carte} lien={`/partage/${jeton}/${carte.id}`} lectureSeule />
            ))}
          </ul>
        </main>
      )}
    </div>
  );
}
