import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompleterCollectionForm } from "@/components/CompleterCollectionForm";
import { isUuid } from "@/lib/ids";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Compléter une collection · Suivi de collections" };

// L'analyse et la copie d'un lot d'images peuvent attendre des sites lents : 60 s par appel (ADR-03).
export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

/** La base renvoie au plus 1000 lignes par requête (max_rows) : on lit par pages. */
const PAGE = 1000;

// Compléter une collection depuis une URL (US-13).
export default async function CompleterPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: collection } = await supabase.from("collections").select("id, name").eq("id", id).maybeSingle();
  if (!collection) notFound();

  // Images d'origine déjà présentes : pour signaler et décocher les doublons dans l'aperçu.
  const images: string[] = [];
  for (let debut = 0; ; debut += PAGE) {
    const { data } = await supabase
      .from("items")
      .select("source_image")
      .eq("collection_id", id)
      .not("source_image", "is", null)
      .order("id")
      .range(debut, debut + PAGE - 1);
    images.push(...(data ?? []).map((item) => item.source_image!));
    if (!data || data.length < PAGE) break;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center gap-1 border-b border-bordure bg-surface pt-[max(env(safe-area-inset-top),8px)] pr-2 pb-2.5 pl-2">
        <Link href={`/collections/${id}`} aria-label="Annuler et revenir" className="flex size-11 shrink-0 items-center justify-center text-texte">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-bold">Compléter la collection</h1>
          <p className="truncate text-[13px] text-texte-doux">{collection.name}</p>
        </div>
      </header>
      <main className="px-4 pt-4 pb-6">
        <CompleterCollectionForm collectionId={id} nom={collection.name} imagesExistantes={images} />
      </main>
    </div>
  );
}
