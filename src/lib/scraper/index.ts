import "server-only";
import { extraireImages } from "@/lib/scraper/extract";
import { recupererPage } from "@/lib/scraper/fetchPage";
import { filtrerImages, type Candidat } from "@/lib/scraper/filters";
import { ErreurRecuperation, type OptionsRecuperation } from "@/lib/scraper/ssrf";

export type Apercu = { url: string; pageTitle: string; candidates: Candidat[] };

/** Nombre maximum d'éléments proposés : au-delà, la page n'est sans doute pas une liste d'items. */
export const CANDIDATS_MAX = 1000;

/**
 * Aperçu d'une page (ADR-03, étape 1) : récupère la page, en extrait les images et leurs intitulés,
 * marque le décor. N'écrit rien. Lève une ErreurRecuperation ; « aucun-element » si rien n'est trouvé.
 */
export async function scrapePreview(adresse: string, filtre?: OptionsRecuperation["filtre"]): Promise<Apercu> {
  const { url, html } = await recupererPage(adresse, filtre);
  const { pageTitle, images } = extraireImages(html, url);
  const candidates = filtrerImages(images).slice(0, CANDIDATS_MAX);
  if (candidates.length === 0) throw new ErreurRecuperation("aucun-element");
  return { url: url.href, pageTitle, candidates };
}
