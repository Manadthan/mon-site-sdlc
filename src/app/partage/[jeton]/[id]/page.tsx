import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { cache } from "react";
import { CollectionBoard } from "@/components/CollectionBoard";
import type { Item } from "@/components/ItemTile";
import { LienInvalide } from "@/components/LienInvalide";
import { estJetonPartage, lireCollectionPartagee, lireCollectionsPartagees } from "@/lib/collections/partage";
import { interrogerSourceExterne, libelleSourceExterne } from "@/lib/externes/sources";
import { isUuid } from "@/lib/ids";
import { COOKIE_GRILLE, parseColonnes } from "@/lib/items/grille";
import { COOKIE_TRI_ITEMS, parseTriItems } from "@/lib/items/sort";
import { formatProgress, type Progress } from "@/lib/progress";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ jeton: string; id: string }> };

type ResultatCollectionPartagee =
  | { type: "locale"; name: string; items: Item[] }
  | { type: "externe"; name: string; items: Item[]; externalUrl: string; sourceLabel: string }
  | { type: "externe-indisponible"; name: string; externalUrl: string; sourceLabel: string; progress: Progress };

const chargerCollection = cache(async (jeton: string, id: string): Promise<ResultatCollectionPartagee | null> => {
  if (!estJetonPartage(jeton) || !isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  // Fonctions SQL shared_collections / shared_collection (ADR-06) : seule porte d'entrée sans compte.
  const [listeRes, detailRes] = await Promise.all([
    supabase.rpc("shared_collections", { p_token: jeton }),
    supabase.rpc("shared_collection", { p_token: jeton, p_collection_id: id }),
  ]);

  const cartes = listeRes.error ? null : lireCollectionsPartagees(listeRes.data);
  const carte = cartes?.find((c) => c.id === id);

  if (carte?.externalUrl) {
    const sourceLabel = libelleSourceExterne(carte.externalSource);
    const externe = await interrogerSourceExterne(carte.externalUrl, { inclureItems: true });
    if (externe.ok && externe.donnees.items) {
      return {
        type: "externe",
        name: carte.name,
        externalUrl: carte.externalUrl,
        sourceLabel,
        items: externe.donnees.items.map((item) => ({
          id: item.id,
          title: item.title,
          image_path: null,
          image_url: item.imageUrl,
          owned: item.owned,
          external_url: item.url,
        })),
      };
    }
    return {
      type: "externe-indisponible",
      name: carte.name,
      externalUrl: carte.externalUrl,
      sourceLabel,
      progress: carte.progress,
    };
  }

  if (detailRes.error) return null;
  const locale = lireCollectionPartagee(detailRes.data);
  if (!locale) return null;
  return { type: "locale", ...locale };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jeton, id } = await params;
  const collection = await chargerCollection(jeton, id);
  return { title: collection ? `${collection.name} · Collection partagée` : "Lien de partage invalide" };
}

// Une collection partagée (locale ou liée), en lecture seule (US-17) ; le bouton retour ramène à la liste partagée.
export default async function CollectionPartageePage({ params }: Props) {
  const { jeton, id } = await params;
  const collection = await chargerCollection(jeton, id);
  if (!collection) return <LienInvalide />;

  if (collection.type === "externe-indisponible") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header className="flex flex-col gap-2 border-b border-bordure bg-surface pt-[max(env(safe-area-inset-top),8px)] pr-4 pb-3 pl-2">
          <div className="flex items-center">
            <Link href={`/partage/${jeton}`} aria-label="Retour aux collections" className="flex size-11 items-center justify-center text-texte">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <p className="text-[13px] text-texte-doux">Lecture seule</p>
          </div>
          <div className="flex flex-col gap-2 px-3">
            <h1 className="text-[22px] leading-tight font-bold tracking-tight break-words">{collection.name}</h1>
            <div className="flex items-center gap-2.5">
              <p className="text-sm whitespace-nowrap text-texte-doux">
                <strong className="font-semibold text-texte">{formatProgress(collection.progress)}</strong>
              </p>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutre">
                <div className="h-1.5 bg-possede" style={{ width: `${collection.progress.percent}%` }} />
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[15px] leading-relaxed text-texte-doux">
            Impossible de charger le détail des items depuis {collection.sourceLabel} pour l’instant.
          </p>
          <a
            href={collection.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-white"
          >
            Ouvrir sur {collection.sourceLabel}
          </a>
        </main>
      </div>
    );
  }

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
      lienExterne={collection.type === "externe" ? { url: collection.externalUrl, label: collection.sourceLabel } : undefined}
    />
  );
}
