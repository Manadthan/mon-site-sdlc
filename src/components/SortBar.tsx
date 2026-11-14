import { changeSort } from "@/app/actions/collections";
import type { Sort, SortKey } from "@/lib/collections/sort";

const CRITERES: { key: SortKey; libelle: string; nom: string }[] = [
  { key: "name", libelle: "Nom", nom: "nom" },
  { key: "date", libelle: "Date", nom: "date de création" },
  { key: "percent", libelle: "% complété", nom: "pourcentage complété" },
];

// Barre « Trier par » de l'accueil (US-05) — maquette n° 1.
// Formulaire classique : fonctionne même avant le chargement du JavaScript.
export function SortBar({ sort }: { sort: Sort }) {
  return (
    <form action={changeSort} className="flex items-center gap-2 px-4 pt-3.5 pb-1.5" aria-label="Trier les collections">
      <span className="text-[13px] font-medium text-texte-doux">Trier par</span>
      {CRITERES.map(({ key, libelle, nom }) => {
        const actif = sort.key === key;
        const sens = sort.dir === "asc" ? "croissant" : "décroissant";
        return (
          <button
            key={key}
            type="submit"
            name="key"
            value={key}
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
                {sort.dir === "asc" ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
              </svg>
            )}
          </button>
        );
      })}
    </form>
  );
}
