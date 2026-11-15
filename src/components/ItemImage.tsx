import { urlImage } from "@/lib/images/storage";

type Props = { chemin: string | null; taille?: number };

// Image d'un item, ou vignette neutre s'il n'en a pas (US-06).
export function ItemImage({ chemin, taille = 28 }: Props) {
  if (chemin) {
    return (
      // object-contain : l'image entière reste visible, quelles que soient ses proportions (bandes grises si besoin).
      // Vignettes déjà optimisées (WebP 400 px, ADR-02) : <img> simple, chargée seulement à l'approche
      // de l'écran (loading="lazy") pour rester fluide avec 300+ items (US-06).
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urlImage(chemin)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full rounded-[inherit] object-contain" />
    );
  }
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
