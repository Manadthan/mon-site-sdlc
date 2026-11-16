import { ItemImage } from "@/components/ItemImage";
import type { Colonnes } from "@/lib/items/grille";

export type Item = { id: string; title: string; image_path: string | null; owned: boolean };

type Props = { item: Item; onToggle: () => void; densite?: Colonnes };

// Vignette d'un item (US-06) : un tap bascule possédé / non possédé (US-07) — maquette n° 2.
// Présentation en carte (#66) : image sur fond clair, puis intitulé en gras et état, sur fond blanc.
// Un item possédé a une bordure verte en plus de la coche.
// Densité (US-14) : 2 par ligne → carte complète ; 3 → intitulé seul ; 4 → image seule
// (l'intitulé et l'état restent lus par VoiceOver).
export function ItemTile({ item, onToggle, densite = 2 }: Props) {
  const etat = item.owned ? "Possédé" : "Manquant";
  return (
    // content-visibility : le navigateur ne dessine que les vignettes visibles (fluide avec 300+ items).
    <li className="[contain-intrinsic-size:auto_260px] [content-visibility:auto]">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.owned}
        className={`flex h-full w-full flex-col overflow-hidden border bg-surface text-left text-texte transition-colors ${
          densite === 4 ? "rounded-md" : "rounded-[10px]"
        } ${item.owned ? "border-possede" : "border-bordure"}`}
      >
        <span className="relative flex aspect-square w-full items-center justify-center bg-fond text-icone">
          {/* Marge autour de l'image, comme sur une fiche produit. */}
          <span className={`absolute flex items-center justify-center ${densite === 2 ? "inset-2.5" : "inset-1.5"}`}>
            <ItemImage chemin={item.image_path} taille={densite === 4 ? 18 : 24} />
          </span>
          {item.owned && (
            // Coche verte dans l'angle haut droit (US-07).
            <span
              data-testid="coche-possede"
              className={`absolute flex items-center justify-center rounded-full border-2 border-surface bg-possede text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${
                densite === 2 ? "top-2 right-2 size-7" : "top-1 right-1 size-5"
              }`}
              aria-hidden="true"
            >
              <svg width={densite === 2 ? 16 : 12} height={densite === 2 ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
          )}
        </span>
        {densite === 4 ? (
          <span className="sr-only">
            <span data-testid="intitule">{item.title}</span> {etat}
          </span>
        ) : (
          <span className={`flex flex-1 flex-col gap-0.5 border-t border-bordure ${densite === 2 ? "px-2.5 pt-2 pb-2.5" : "px-1.5 pt-1 pb-1.5"}`}>
            <span
              data-testid="intitule"
              className={`line-clamp-2 leading-snug font-semibold break-words ${densite === 2 ? "text-[15px]" : "text-xs"}`}
            >
              {item.title}
            </span>
            {densite === 2 ? (
              <span className={`text-[13px] ${item.owned ? "font-medium text-possede" : "text-texte-doux"}`}>{etat}</span>
            ) : (
              <span className="sr-only">{etat}</span>
            )}
          </span>
        )}
      </button>
    </li>
  );
}
