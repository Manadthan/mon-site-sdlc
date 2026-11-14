import { ItemImage } from "@/components/ItemImage";
import type { Item } from "@/components/ItemTile";

type Props = {
  item: Item;
  position: number;
  premier: boolean;
  dernier: boolean;
  onMove: (direction: "up" | "down") => void;
  onRename: () => void;
  onDelete: () => void;
};

// Vignette en mode édition — maquette n° 3. Un tap ne coche plus : on réordonne (US-10),
// on renomme en touchant l'intitulé ou on supprime (US-08).
export function ItemEditTile({ item, position, premier, dernier, onMove, onRename, onDelete }: Props) {
  return (
    <li className="flex flex-col gap-1.5 rounded-[14px] border border-bordure bg-white p-1.5 [contain-intrinsic-size:auto_240px] [content-visibility:auto]">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center rounded-[10px] bg-[#e9ecf1] text-[#8a909a]">
        <ItemImage chemin={item.image_path} taille={26} />
        <span className="absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[rgba(21,23,26,0.75)] px-1.5 text-xs font-semibold text-white" aria-hidden="true">
          {position}
        </span>
      </div>
      <button
        type="button"
        onClick={onRename}
        aria-label={`Renommer « ${item.title} »`}
        className="flex min-h-11 items-center gap-1 px-0.5 text-left text-[13px] leading-snug font-medium"
      >
        <span data-testid="intitule" className="line-clamp-2 flex-1 break-words">
          {item.title}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-texte-doux">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={premier}
          aria-label={`Monter « ${item.title} »`}
          className="flex h-11 items-center justify-center rounded-[10px] border border-[#d3d6dc] bg-white text-texte disabled:opacity-35"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={dernier}
          aria-label={`Descendre « ${item.title} »`}
          className="flex h-11 items-center justify-center rounded-[10px] border border-[#d3d6dc] bg-white text-texte disabled:opacity-35"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Supprimer « ${item.title} »`}
          className="flex h-11 items-center justify-center rounded-[10px] border border-[#f1c4c4] bg-[#fff5f5] text-danger"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>
    </li>
  );
}
