import { ItemImage } from "@/components/ItemImage";

export type Item = { id: string; title: string; image_path: string | null; owned: boolean };

// Vignette d'un item (US-06) : un tap bascule possédé / non possédé (US-07) — maquette n° 2.
// Présentation en carte (issue #66) : image sur fond clair, puis intitulé en gras et état en dessous,
// sur fond blanc. Un item possédé a une bordure verte en plus de la coche.
export function ItemTile({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    // content-visibility : le navigateur ne dessine que les vignettes visibles (fluide avec 300+ items).
    <li className="[contain-intrinsic-size:auto_260px] [content-visibility:auto]">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.owned}
        className={`flex h-full w-full flex-col overflow-hidden rounded-[10px] border bg-white text-left text-texte transition-colors ${
          item.owned ? "border-possede" : "border-bordure"
        }`}
      >
        <span className="relative flex aspect-square w-full items-center justify-center bg-fond text-[#8a909a]">
          {/* Marge autour de l'image, comme sur une fiche produit. */}
          <span className="absolute inset-2.5 flex items-center justify-center">
            <ItemImage chemin={item.image_path} taille={28} />
          </span>
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
        <span className="flex flex-1 flex-col gap-0.5 border-t border-bordure px-2.5 pt-2 pb-2.5">
          <span data-testid="intitule" className="line-clamp-2 text-[15px] leading-snug font-semibold break-words">
            {item.title}
          </span>
          <span className={`text-[13px] ${item.owned ? "font-medium text-possede" : "text-texte-doux"}`}>
            {item.owned ? "Possédé" : "Manquant"}
          </span>
        </span>
      </button>
    </li>
  );
}
