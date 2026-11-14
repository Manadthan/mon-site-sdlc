import "server-only";
import { ErreurRecuperation, recupererSansRisque, type OptionsRecuperation, type RaisonEchec } from "@/lib/scraper/ssrf";

/** Taille maximale d'une image téléchargée, avant conversion en vignette. */
export const IMAGE_TAILLE_MAX = 10 * 1024 * 1024;

/** Images matricielles seulement : le SVG (du code, pas des pixels) est refusé. */
export function typeImageAccepte(type: string): boolean {
  return type.startsWith("image/") && !type.includes("svg");
}

/**
 * Télécharge une image par son URL, avec la protection SSRF (DESIGN.md §6) :
 * seules les réponses `image/*` sont acceptées. Lève une ErreurRecuperation.
 */
export async function telechargerImage(url: string, filtre?: OptionsRecuperation["filtre"]): Promise<Buffer> {
  const { corps } = await recupererSansRisque(url, {
    tailleMax: IMAGE_TAILLE_MAX,
    accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    typeAccepte: typeImageAccepte,
    filtre,
  });
  return corps;
}

const MESSAGES: Record<RaisonEchec, string> = {
  "url-invalide": "Adresse d’image invalide : elle doit commencer par http:// ou https://.",
  "adresse-interdite": "Cette adresse n’est pas autorisée.",
  delai: "Le site de l’image n’a pas répondu dans les 10 secondes.",
  "trop-gros": "Image trop lourde (10 Mo au plus).",
  type: "Cette adresse ne mène pas à une image (JPEG, PNG, WebP…).",
  http: "L’image n’a pas pu être récupérée à cette adresse.",
  "trop-de-redirections": "L’image n’a pas pu être récupérée à cette adresse.",
  reseau: "L’image n’a pas pu être récupérée à cette adresse.",
  "aucun-element": "L’image n’a pas pu être récupérée à cette adresse.",
};

/** Message à afficher à l'utilisateur pour un échec de téléchargement. */
export function messageEchecImage(erreur: unknown): string {
  return erreur instanceof ErreurRecuperation ? MESSAGES[erreur.raison] : MESSAGES.reseau;
}
