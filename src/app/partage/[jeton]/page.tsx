import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { CollectionBoard } from "@/components/CollectionBoard";
import { estJetonPartage, lireCollectionPartagee } from "@/lib/collections/partage";
import { COOKIE_GRILLE, parseColonnes } from "@/lib/items/grille";
import { COOKIE_TRI_ITEMS, parseTriItems } from "@/lib/items/sort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ jeton: string }> };

// cache : une seule lecture par affichage, partagée entre le titre de l'onglet et la page.
const chargerPartage = cache(async (jeton: string) => {
  if (!estJetonPartage(jeton)) return null;
  const supabase = await createSupabaseServerClient();
  // Fonction SQL shared_collection (ADR-06) : seule porte d'entrée d'un visiteur sans compte.
  const { data, error } = await supabase.rpc("shared_collection", { p_token: jeton });
  if (error) return null;
  return lireCollectionPartagee(data);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await chargerPartage((await params).jeton);
  return {
    title: collection ? `${collection.name} · Collection partagée` : "Lien de partage invalide",
    // US-17 : la page partagée n'est pas indexée par les moteurs de recherche.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

// Collection partagée en lecture seule (US-17) : ouverte sans compte (voir proxy.ts et lib/auth/routes.ts).
export default async function PartagePage({ params }: Props) {
  const collection = await chargerPartage((await params).jeton);
  if (!collection) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-8 text-center">
        <h1 className="text-xl font-bold">Ce lien de partage n’est plus valide</h1>
        <p className="text-[15px] text-texte-doux">Demandez un nouveau lien à la personne qui vous l’a envoyé.</p>
      </main>
    );
  }

  const cookieStore = await cookies();
  return (
    <CollectionBoard
      collectionId=""
      name={collection.name}
      items={collection.items}
      colonnes={parseColonnes(cookieStore.get(COOKIE_GRILLE)?.value)}
      tri={parseTriItems(cookieStore.get(COOKIE_TRI_ITEMS)?.value)}
      lectureSeule
    />
  );
}
