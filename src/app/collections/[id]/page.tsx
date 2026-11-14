import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddItemForm } from "@/components/AddItemForm";
import { ItemTile } from "@/components/ItemTile";
import { isUuid } from "@/lib/ids";
import { computeProgress, formatProgress } from "@/lib/progress";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

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

// Page d'une collection (US-06) — maquette n° 2.
export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const collection = await chargerCollection(id);
  if (!collection) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: items, error } = await supabase
    .from("items")
    .select("id, title, image_path, owned")
    .eq("collection_id", id)
    .order("position");
  const liste = items ?? [];
  const progress = computeProgress(liste.filter((i) => i.owned).length, liste.length);

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-2.5 border-b border-bordure bg-white pt-[max(env(safe-area-inset-top),8px)] pr-2 pb-3 pl-2">
        <Link href="/" aria-label="Retour aux collections" className="flex size-11 items-center justify-center text-texte">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex flex-col gap-2 px-3">
          <h1 className="text-[22px] leading-tight font-bold tracking-tight break-words">{collection.name}</h1>
          <div className="flex items-center gap-2.5">
            <p className="text-sm whitespace-nowrap text-texte-doux">
              <span className="sr-only">Possédés : </span>
              <strong className="font-semibold text-texte">{formatProgress(progress)}</strong>
            </p>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9ecf1]"
              role="progressbar"
              aria-label={`${progress.percent} % complété`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <div className="h-1.5 bg-possede" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-8">
        {error ? (
          <p role="alert" className="py-16 text-center text-[15px] text-danger">
            Impossible de charger les items. Rechargez la page dans un instant.
          </p>
        ) : (
          <>
            {liste.length === 0 && (
              <p className="pt-6 pb-4 text-center text-[15px] text-texte-doux">Aucun item dans cette collection pour l’instant.</p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {liste.length > 0 && (
                // display: contents : vignettes et bouton « Ajouter » partagent la même grille.
                // role="list" explicite : sinon Safari (VoiceOver) ne l'annonce plus comme une liste.
                <ul role="list" aria-label="Items" className="contents">
                  {liste.map((item) => (
                    <ItemTile key={item.id} item={item} />
                  ))}
                </ul>
              )}
              <div>
                <AddItemForm collectionId={collection.id} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
