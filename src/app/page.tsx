import { logout } from "@/app/actions/auth";

// Accueil provisoire : la liste des collections arrive à l'étape 3 (US-02).
export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between border-b border-bordure bg-white pt-[max(env(safe-area-inset-top),12px)] pr-4 pb-3 pl-5">
        <h1 className="text-[26px] font-bold tracking-tight">Mes collections</h1>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Se déconnecter"
            className="flex size-11 items-center justify-center rounded-full text-texte-doux"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-[15px] leading-relaxed text-texte-doux">Vous êtes connecté. Vos collections arrivent bientôt.</p>
      </main>
    </div>
  );
}
