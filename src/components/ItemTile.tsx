export type Item = { id: string; title: string; image_path: string | null; owned: boolean };

// Vignette d'un item (US-06) : un tap bascule possédé / non possédé (US-07) — maquette n° 2.
// Les images arrivent avec l'import (étape 6) : d'ici là, une vignette neutre.
export function ItemTile({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    // content-visibility : le navigateur ne dessine que les vignettes visibles (fluide avec 300+ items).
    <li className="[contain-intrinsic-size:auto_220px] [content-visibility:auto]">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.owned}
        className="flex w-full flex-col gap-1.5 text-left text-texte"
      >
        <span className="relative flex aspect-square w-full items-center justify-center rounded-xl bg-[#e9ecf1] text-[#8a909a]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          {item.owned && (
            // Coche verte dans l'angle haut droit (US-07).
            <span
              data-testid="coche-possede"
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border-2 border-white bg-possede text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
              aria-hidden="true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
          )}
        </span>
        <span data-testid="intitule" className="line-clamp-2 px-0.5 text-sm leading-snug font-medium break-words">
          {item.title}
        </span>
        <span className="sr-only">{item.owned ? "possédé" : "non possédé"}</span>
      </button>
    </li>
  );
}
