import { cookies } from "next/headers";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ExportButton } from "@/components/ExportButton";
import { ImportSauvegarde } from "@/components/ImportSauvegarde";
import { ListeCollections } from "@/components/ListeCollections";
import { PartageSheet } from "@/components/PartageSheet";
import { RafraichirAuRetour } from "@/components/RafraichirAuRetour";
import { SortBar } from "@/components/SortBar";
import { toCollectionCards, type CollectionRow, type StatsRow } from "@/lib/collections/cards";
import { parseSort, SORT_COOKIE, sortCards } from "@/lib/collections/sort";
import { interrogerSourceExterne } from "@/lib/externes/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Accueil : liste des collections (US-02) par catégorie (US-19), suppression (US-04), tri mémorisé (US-05) — maquettes n° 1 et n° 6.
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie que les collections de l'utilisateur connecté.
  const [collections, stats, partage] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, category, cover_path, created_at, external_url, external_source, external_cover_url"),
    supabase.from("collection_stats").select("collection_id, owned, total, cover_path"),
    // Lien de partage en cours (US-17), s'il y en a un.
    supabase.from("partages").select("token").maybeSingle(),
  ]);
  const erreur = collections.error ?? stats.error;
  const lignes: CollectionRow[] = (collections.data ?? []).map((c) => ({ ...c }));
  const statsLignes: StatsRow[] = (stats.data ?? []).map((s) => ({ ...s }));

  // Rafraîchit en parallèle les collections liées via /api/suivi ; en cas d'échec ou de délai, le cache en base reste affiché.
  if (!erreur) {
    const liees = lignes.filter((c): c is CollectionRow & { external_url: string } => !!c.external_url);
    if (liees.length > 0) {
      const statsParId = new Map(statsLignes.map((s) => [s.collection_id, s]));
      await Promise.all(
        liees.map(async (c) => {
          const res = await interrogerSourceExterne(c.external_url);
          if (!res.ok) return;
          const { owned, total, coverUrl } = res.donnees;
          c.external_cover_url = coverUrl;
          const stat = statsParId.get(c.id);
          if (stat) {
            stat.owned = owned;
            stat.total = total;
          } else {
            statsLignes.push({ collection_id: c.id, owned, total, cover_path: null });
          }
          await supabase
            .from("collections")
            .update({
              external_owned: owned,
              external_total: total,
              external_cover_url: coverUrl,
              external_synced_at: new Date().toISOString(),
            })
            .eq("id", c.id);
        }),
      );
    }
  }

  const tri = parseSort((await cookies()).get(SORT_COOKIE)?.value);
  const cartes = erreur ? [] : sortCards(toCollectionCards(lignes, statsLignes), tri);
  const categories = lignes.map((c) => c.category ?? null);
  const aCollectionsLiees = cartes.some((c) => !!c.externalUrl);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      {aCollectionsLiees && <RafraichirAuRetour />}
      <header className="flex items-center justify-between border-b border-bordure bg-surface pt-[max(env(safe-area-inset-top),12px)] pr-4 pb-3 pl-5">
        <div className="flex items-center gap-2.5">
          {/* Logo de l'application (même dessin que l'icône de l'écran d'accueil). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" width={32} height={32} className="size-8 rounded-lg" />
          <h1 className="text-[26px] font-bold tracking-tight">Mes collections</h1>
        </div>
        <div className="flex items-center">
        <PartageSheet jeton={partage.data?.token ?? null} />
        <form action={logout}>
          <button type="submit" aria-label="Se déconnecter" className="flex size-11 items-center justify-center rounded-full text-texte-doux">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </form>
        </div>
      </header>

      {erreur ? (
        <main className="flex flex-1 items-center justify-center px-8 text-center">
          <p role="alert" className="text-[15px] text-alarme">
            Impossible de charger vos collections. Rechargez la page dans un instant.
          </p>
        </main>
      ) : cartes.length === 0 ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3.5 px-8 pb-20 text-center">
          <div className="flex size-[88px] items-center justify-center rounded-3xl bg-neutre text-icone" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M17.5 14v7M14 17.5h7" />
            </svg>
          </div>
          <h2 className="mt-1 text-xl font-bold">Aucune collection pour l’instant</h2>
          <p className="text-[15px] leading-relaxed text-texte-doux">
            Créez une collection en lui donnant un nom, puis ajoutez-y vos objets.
          </p>
          <Link
            href="/collections/new"
            className="mt-2.5 flex h-[50px] items-center gap-2 rounded-xl bg-action px-6 text-base font-semibold text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Créer ma première collection
          </Link>
          <div className="mt-4">
            <ImportSauvegarde />
          </div>
        </main>
      ) : (
        <main className="pb-28">
          <SortBar sort={tri} />
          {/* Regroupées par catégorie (US-19), triées dans chaque section (US-05). */}
          <ListeCollections cartes={cartes} label="Mes collections" categories={categories} />
          <ExportButton />
          <ImportSauvegarde />
          {/* Bouton flottant, à portée de pouce (maquette n° 1). */}
          <Link
            href="/collections/new"
            className="fixed right-5 bottom-[max(env(safe-area-inset-bottom),24px)] flex h-14 items-center gap-2 rounded-full bg-action pr-5.5 pl-4.5 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(29,78,216,0.35)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nouvelle collection
          </Link>
        </main>
      )}
    </div>
  );
}
