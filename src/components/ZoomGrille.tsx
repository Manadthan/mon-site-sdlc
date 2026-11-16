"use client";

import { COLONNES_MAX, COLONNES_MIN, type Colonnes } from "@/lib/items/grille";

type Props = { colonnes: Colonnes; onChange: (sens: "plus" | "moins") => void };

// Dans la barre du haut, toujours visible au défilement : même gabarit que « Modifier ».
// Zone de toucher agrandie (after:) à 44 px pour le pouce, bouton dessiné à 36 px.
const BOUTON =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full border border-champ bg-surface text-texte after:absolute after:-inset-1 disabled:opacity-35";

// Zoomer / dézoomer la grille (US-14) : moins ou plus d'items par ligne.
export function ZoomGrille({ colonnes, onChange }: Props) {
  return (
    <div role="group" aria-label={`Taille de la grille : ${colonnes} par ligne`} className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange("plus")}
        disabled={colonnes >= COLONNES_MAX}
        aria-label="Plus d’items par ligne"
        className={BOUTON}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("moins")}
        disabled={colonnes <= COLONNES_MIN}
        aria-label="Moins d’items par ligne"
        className={BOUTON}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
