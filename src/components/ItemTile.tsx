export type Item = { id: string; title: string; image_path: string | null; owned: boolean };

// Vignette d'un item (US-06) — maquette n° 2.
// Les images arrivent avec l'import (étape 6) : d'ici là, une vignette neutre.
// La coche verte et le tap pour cocher arrivent avec US-07.
export function ItemTile({ item }: { item: Item }) {
  return (
    // content-visibility : le navigateur ne dessine que les vignettes visibles (fluide avec 300+ items).
    <li className="flex flex-col gap-1.5 [contain-intrinsic-size:auto_220px] [content-visibility:auto]">
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#e9ecf1] text-[#8a909a]" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <h2 className="line-clamp-2 px-0.5 text-sm leading-snug font-medium break-words">{item.title}</h2>
    </li>
  );
}
