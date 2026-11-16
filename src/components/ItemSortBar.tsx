"use client";

import type { CleTri, TriItems } from "@/lib/items/sort";

const CRITERES: { cle: CleTri; libelle: string; nom: string }[] = [
  { cle: "ordre", libelle: "Ordre", nom: "ordre de la collection" },
  { cle: "nom", libelle: "Nom", nom: "nom" },
];

type Props = { tri: TriItems; onChange: (cle: CleTri) => void };

// « Trier » les items d'une collection (US-15), comme le tri de l'accueil (US-05) :
// toucher le critère actif inverse le sens. Change l'affichage seulement, pas l'ordre enregistré.
export function ItemSortBar({ tri, onChange }: Props) {
  return (
    <div role="group" aria-label="Trier les items" className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-texte-doux">Trier</span>
      {CRITERES.map(({ cle, libelle, nom }) => {
        const actif = tri.cle === cle;
        const sens = tri.sens === "asc" ? "croissant" : "décroissant";
        return (
          <button
            key={cle}
            type="button"
            onClick={() => onChange(cle)}
            aria-pressed={actif}
            aria-label={actif ? `Trier par ${nom}, ordre ${sens}. Toucher pour inverser.` : `Trier par ${nom}`}
            className={
              actif
                ? "flex h-[34px] items-center gap-1 rounded-full border border-texte bg-texte px-3.5 text-[13px] font-semibold text-white"
                : "h-[34px] rounded-full border border-[#d3d6dc] bg-white px-3.5 text-[13px] font-medium text-texte"
            }
          >
            {libelle}
            {actif && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {tri.sens === "asc" ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
