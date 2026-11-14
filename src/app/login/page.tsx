import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Connexion · Suivi de collections" };

// Écran de connexion (US-01) — maquette n° 5.
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-7 flex flex-col gap-2">
        <div className="flex size-14 items-center justify-center rounded-[14px] bg-action text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M15 17.5l2 2 4-4" />
          </svg>
        </div>
        <h1 className="mt-2 text-[26px] font-bold tracking-tight">Suivi de collections</h1>
        <p className="text-[15px] text-texte-doux">Connectez-vous pour accéder à vos collections.</p>
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-xs text-[#6b7079]">Session conservée sur cet appareil.</p>
    </main>
  );
}
