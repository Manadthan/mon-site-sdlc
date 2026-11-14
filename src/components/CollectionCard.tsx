import { formatProgress } from "@/lib/progress";
import type { CollectionCard as Carte } from "@/lib/collections/cards";

// Carte d'une collection sur l'accueil (US-02) — maquette n° 1.
// L'image de couverture arrivera avec l'import (étape 6) ; d'ici là, une vignette neutre.
// Le lien vers la page de la collection arrivera avec US-06 (étape 4).
export function CollectionCard({ carte }: { carte: Carte }) {
  const { name, progress } = carte;
  return (
    <li className="flex items-center gap-3 rounded-[14px] border border-bordure bg-white p-2.5">
      <div className="flex size-16 shrink-0 items-center justify-center rounded-[10px] bg-[#e9ecf1] text-[#8a909a]" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="truncate text-base font-semibold">{name}</h2>
        <p className="text-[13px] text-texte-doux">
          <span className="sr-only">Possédés : </span>
          {formatProgress(progress)}
        </p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#e9ecf1]"
          role="progressbar"
          aria-label={`${name} : ${progress.percent} % complété`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          <div className="h-1.5 rounded-full bg-possede" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    </li>
  );
}
