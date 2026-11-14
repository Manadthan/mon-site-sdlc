"use client";

import { useState } from "react";
import type { Candidat } from "@/lib/scraper/filters";

type Props = {
  candidats: Candidat[];
  exclus: ReadonlySet<number>;
  onBasculer: (index: number) => void;
};

// Aperçu du scraping (US-03, maquette n° 4) : grille de 3 vignettes, un tap exclut ou reprend l'élément.
// Les images sont affichées depuis le site source, le temps de l'aperçu : elles ne sont copiées qu'à l'import.
export function ScrapePreview({ candidats, exclus, onBasculer }: Props) {
  return (
    <ul aria-label="Éléments trouvés" className="grid grid-cols-3 gap-2.5">
      {candidats.map((candidat, index) => {
        const retenu = !exclus.has(index);
        return (
          <li key={candidat.imageUrl} className="min-w-0">
            <button
              type="button"
              aria-pressed={retenu}
              onClick={() => onBasculer(index)}
              className={`flex w-full flex-col gap-1 text-left text-texte transition-opacity ${retenu ? "" : "opacity-45"}`}
            >
              <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[10px] bg-[#e9ecf1] text-[#8a909a]">
                <Vignette src={candidat.imageUrl} />
                <span
                  aria-hidden="true"
                  className={`absolute top-1.5 left-1.5 flex size-[22px] items-center justify-center rounded-md border-2 text-white ${
                    retenu ? "border-action bg-action" : "border-[#8a909a] bg-white"
                  }`}
                >
                  {retenu && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="line-clamp-2 text-xs leading-tight break-words">{candidat.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Image du site source ; vignette neutre si elle ne s'affiche pas (site en HTTP, image protégée…). */
function Vignette({ src }: { src: string }) {
  const [echec, setEchec] = useState(false);
  if (echec) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setEchec(true)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}
