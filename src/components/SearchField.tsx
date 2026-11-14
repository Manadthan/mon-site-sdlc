"use client";

type Props = { valeur: string; onChange: (valeur: string) => void };

// Recherche sur l'intitulé (US-09) — maquette n° 2. Police 16 px : évite le zoom automatique de Safari iOS.
export function SearchField({ valeur, onChange }: Props) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-[10px] border border-[#d3d6dc] bg-white px-3 text-[#6b7079] focus-within:border-action focus-within:ring-2 focus-within:ring-action/20">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="sr-only">Rechercher dans la collection</span>
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        placeholder="Rechercher…"
        value={valeur}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="min-w-0 flex-1 bg-transparent text-base text-texte outline-none"
      />
    </label>
  );
}
