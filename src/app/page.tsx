import { logout } from "@/app/actions/auth";
import { CollectionCard } from "@/components/CollectionCard";
import { toCollectionCards } from "@/lib/collections/cards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Accueil : liste des collections (US-02) — maquettes n° 1 et n° 6.
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  // La RLS ne renvoie que les collections de l'utilisateur connecté.
  const [collections, stats] = await Promise.all([
    supabase.from("collections").select("id, name, cover_path, created_at"),
    supabase.from("collection_stats").select("collection_id, owned, total"),
  ]);
  const erreur = collections.error ?? stats.error;
  const cartes = erreur ? [] : toCollectionCards(collections.data ?? [], stats.data ?? []);

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
            Créez une collection avec le bouton « Nouvelle collection » : donnez-lui un nom, puis ajoutez vos objets.
          </p>
        </main>
      ) : (
        <main className="px-4 py-3">
          <ul className="flex flex-col gap-2.5" aria-label="Mes collections">
            {cartes.map((carte) => (
              <CollectionCard key={carte.id} carte={carte} />
            ))}
          </ul>
        </main>
      )}
    </div>
  );
}
