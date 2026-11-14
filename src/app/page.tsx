import { cookies } from "next/headers";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { CollectionCard } from "@/components/CollectionCard";
import { SortBar } from "@/components/SortBar";
import { toCollectionCards } from "@/lib/collections/cards";
import { parseSort, SORT_COOKIE, sortCards } from "@/lib/collections/sort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Accueil : liste des collections (US-02), suppression (US-04), tri mémorisé (US-05) — maquettes n° 1 et n° 6.
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie que les collections de l'utilisateur connecté.
  const [collections, stats] = await Promise.all([
    supabase.from("collections").select("id, name, cover_path, created_at"),
    supabase.from("collection_stats").select("collection_id, owned, total"),
  ]);
  const erreur = collections.error ?? stats.error;
  const tri = parseSort((await cookies()).get(SORT_COOKIE)?.value);
  const cartes = erreur ? [] : sortCards(toCollectionCards(collections.data ?? [], stats.data ?? []), tri);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between border-b border-bordure bg-white pt-[max(env(safe-area-inset-top),12px)] pr-4 pb-3 pl-5">
        <h1 className="text-[26px] font-bold tracking-tight">Mes collections</h1>
        <form action={logout}>
          <button type="submit" aria-label="Se déconnecter" className="flex size-11 items-center justify-center rounded-full text-texte-doux">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </form>
      </header>

      {erreur ? (
        <main className="flex flex-1 items-center justify-center px-8 text-center">
          <p role="alert" className="text-[15px] text-danger">
            Impossible de charger vos collections. Rechargez la page dans un instant.
          </p>
        </main>
      ) : cartes.length === 0 ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3.5 px-8 pb-20 text-center">
          <div className="flex size-[88px] items-center justify-center rounded-3xl bg-[#e9ecf1] text-[#6b7079]" aria-hidden="true">
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
        </main>
      ) : (
        <main className="pb-28">
          <SortBar sort={tri} />
          <ul className="flex flex-col gap-2.5 px-4 pt-2" aria-label="Mes collections">
            {cartes.map((carte) => (
              <CollectionCard key={carte.id} carte={carte} />
            ))}
          </ul>
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
