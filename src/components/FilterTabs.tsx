"use client";

import { FILTRES, type Filtre } from "@/lib/items/filter";

type Props = { valeur: Filtre; onChange: (valeur: Filtre) => void };

// Filtre « Tous / Possédés / Manquants » (US-09) — maquette n° 2 : contrôle segmenté.
export function FilterTabs({ valeur, onChange }: Props) {
  return (
    <div role="group" aria-label="Filtrer" className="grid grid-cols-3 rounded-[10px] bg-neutre p-[3px]">
      {FILTRES.map((filtre) => {
        const actif = filtre.valeur === valeur;
        return (
          <button
            key={filtre.valeur}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(filtre.valeur)}
            className={`h-[38px] rounded-lg text-[13px] ${
              actif ? "bg-surface font-semibold text-texte shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "font-medium text-texte-doux"
            }`}
          >
            {filtre.libelle}
          </button>
        );
      })}
    </div>
  );
}
