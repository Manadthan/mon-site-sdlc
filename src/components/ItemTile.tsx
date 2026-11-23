import { ItemImage } from "@/components/ItemImage";
import type { Colonnes } from "@/lib/items/grille";

export type Item = { id: string; title: string; image_path: string | null; owned: boolean };

type Props = { item: Item; onToggle?: () => void; densite?: Colonnes };

/** Taille du fanion « possédé » selon le nombre d'items par ligne (US-14). */
const FANION: Record<Colonnes, string> = { 2: "size-14", 3: "size-11", 4: "size-9" };

// Vignette d'un item (US-06) : un tap bascule possédé / non possédé (US-07) — maquette n° 2.
// Présentation en carte (#66) : image sur fond clair, puis intitulé en gras, sur fond blanc.
// Un item possédé a un fanion et une bordure verts ; un item manquant a son image grisée (US-07, v1.9).
// Densité (US-14) : 2 ou 3 par ligne → image et intitulé ; 4 → image seule.
// L'état (possédé / manquant) n'est pas écrit, mais reste lu par VoiceOver (#79).
// Sans onToggle (collection partagée, US-17) : simple carte, rien à toucher.
export function ItemTile({ item, onToggle, densite = 2 }: Props) {
  const etat = item.owned ? "Possédé" : "Manquant";
  const Carte = onToggle ? "button" : "div";
  return (
    // content-visibility : le navigateur ne dessine que les vignettes visibles (fluide avec 300+ items).
    <li className="[contain-intrinsic-size:auto_300px] [content-visibility:auto]">
      <Carte
        {...(onToggle ? { type: "button" as const, onClick: onToggle, "aria-pressed": item.owned } : {})}
        className={`flex h-full w-full flex-col overflow-hidden border bg-surface text-left text-texte transition-colors ${
          densite === 4 ? "rounded-md" : "rounded-[10px]"
        } ${item.owned ? "border-possede ring-1 ring-possede" : "border-bordure"}`}
      >
        <span className="relative flex aspect-[3/4] w-full items-center justify-center bg-fond text-icone">
          {/* Case en hauteur (3:4), comme la plupart des cartes, boîtes et mangas ; petite marge autour de l'image,
              dont les bords vides ont été rognés à la création de la vignette (issue #79). */}
          <span className={`absolute flex items-center justify-center ${densite === 2 ? "inset-1.5" : "inset-1"}`}>
            {/* Item manquant : image grisée (couleurs atténuées à 40 %, pâlie), pour voir d'un coup d'œil ce qui manque
                sans empêcher de reconnaître l'objet (choix « B » du propriétaire). */}
            <span
              data-testid={item.owned ? undefined : "image-manquant"}
              className={`relative flex size-full items-center justify-center transition-[filter,opacity] ${item.owned ? "" : "opacity-70 grayscale-[40%]"}`}
            >
              <ItemImage chemin={item.image_path} taille={densite === 4 ? 18 : 24} />
            </span>
          </span>
          {item.owned && (
            // Fanion vert dans l'angle haut droit, avec une coche blanche (US-07, v1.9) : visible même en 4 par ligne.
            // Un carré découpé en triangle ; l'angle arrondi de la carte (overflow-hidden) l'arrondit aussi.
            <span
              data-testid="coche-possede"
              className={`absolute top-0 right-0 bg-possede text-white [clip-path:polygon(0_0,100%_0,100%_100%)] ${FANION[densite]}`}
              aria-hidden="true"
            >
              <svg
                className="absolute top-[12%] right-[12%] size-[46%]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
            {/* L'état n'est pas écrit : le fanion, la bordure et le gris suffisent à l'œil ; il reste lu par VoiceOver. */}
            <span className="sr-only">{etat}</span>
          </span>
        )}
      </Carte>
    </li>
  );
}
