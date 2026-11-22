import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { CollectionBoard } from "@/components/CollectionBoard";
import { LienInvalide } from "@/components/LienInvalide";
import { estJetonPartage, lireCollectionPartagee } from "@/lib/collections/partage";
import { isUuid } from "@/lib/ids";
import { COOKIE_GRILLE, parseColonnes } from "@/lib/items/grille";
import { COOKIE_TRI_ITEMS, parseTriItems } from "@/lib/items/sort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ jeton: string; id: string }> };

const chargerCollection = cache(async (jeton: string, id: string) => {
  if (!estJetonPartage(jeton) || !isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  // Fonction SQL shared_collection (ADR-06) : seulement une collection du propriétaire du jeton.
  const { data, error } = await supabase.rpc("shared_collection", { p_token: jeton, p_collection_id: id });
  if (error) return null;
  return lireCollectionPartagee(data);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jeton, id } = await params;
  const collection = await chargerCollection(jeton, id);
  return { title: collection ? `${collection.name} · Collection partagée` : "Lien de partage invalide" };
}

// Une collection partagée, en lecture seule (US-17) ; le bouton retour ramène à la liste partagée.
export default async function CollectionPartageePage({ params }: Props) {
  const { jeton, id } = await params;
  const collection = await chargerCollection(jeton, id);
  if (!collection) return <LienInvalide />;

  const cookieStore = await cookies();
  return (
    <CollectionBoard
      collectionId={id}
      name={collection.name}
      items={collection.items}
      colonnes={parseColonnes(cookieStore.get(COOKIE_GRILLE)?.value)}
      tri={parseTriItems(cookieStore.get(COOKIE_TRI_ITEMS)?.value)}
      lectureSeule
      retour={`/partage/${jeton}`}
    />
  );
}
