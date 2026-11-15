"use client";

import { COLONNES_MAX, COLONNES_MIN, type Colonnes } from "@/lib/items/grille";

type Props = { colonnes: Colonnes; onChange: (sens: "plus" | "moins") => void };

const BOUTON =
  "flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#d3d6dc] bg-white text-texte disabled:opacity-35";

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
