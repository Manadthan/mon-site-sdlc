import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CollectionBoard } from "@/components/CollectionBoard";
import { isUuid } from "@/lib/ids";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

// La copie des images manquantes (lot de 10) peut attendre des sites lents : 60 s par appel (ADR-03).
export const maxDuration = 60;

// cache : une seule requête par affichage, partagée entre le titre de l'onglet et la page.
const chargerCollection = cache(async (id: string) => {
  if (!isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie rien pour la collection d'un autre utilisateur : même réponse qu'une collection inexistante.
  const { data } = await supabase.from("collections").select("id, name").eq("id", id).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await chargerCollection((await params).id);
  return { title: `${collection?.name ?? "Collection introuvable"} · Suivi de collections` };
}

// Page d'une collection (US-06, US-07) — maquette n° 2. L'affichage est dans CollectionBoard.
export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const collection = await chargerCollection(id);
  if (!collection) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: items, error }, { data: sansImage }] = await Promise.all([
    supabase.from("items").select("id, title, image_path, owned").eq("collection_id", id).order("position"),
    // Items importés dont l'image reste à copier (import interrompu ou échoué, issue #51).
    supabase
      .from("items")
      .select("id")
      .eq("collection_id", id)
      .not("source_image", "is", null)
      .is("image_path", null)
      .order("position"),
  ]);
  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-8 text-center">
        <h1 className="text-xl font-bold">{collection.name}</h1>
        <p role="alert" className="text-[15px] text-danger">
          Impossible de charger les items. Rechargez la page dans un instant.
        </p>
        <Link href="/" className="mt-2 font-semibold text-action">
          Retour à mes collections
        </Link>
      </main>
    );
  }

  return (
    <CollectionBoard
      collectionId={collection.id}
      name={collection.name}
      items={items}
      imagesACopier={(sansImage ?? []).map((item) => item.id)}
    />
  );
}
