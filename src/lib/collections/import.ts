import { INTITULE_MAX } from "@/lib/items/title";

/** Nombre maximum d'éléments importés d'un coup (même borne que le scraper). */
export const IMPORT_MAX = 1000;
const URL_MAX = 2000;

export type ElementImporte = { title: string; imageUrl: string };

/** Adresse web (http ou https) raisonnable, sinon undefined. */
export function adresseWeb(saisie: unknown): string | undefined {
  if (typeof saisie !== "string" || saisie.length > URL_MAX) return undefined;
  try {
    const url = new URL(saisie);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Vérifie les éléments retenus dans l'aperçu (envoyés en JSON par le navigateur, donc à ne pas croire sur parole).
 * Intitulé vide → nom tiré de l'adresse ; intitulé trop long → coupé.
 */
export function validerElements(json: unknown): { ok: true; elements: ElementImporte[] } | { ok: false; error: string } {
  let liste: unknown;
  try {
    liste = typeof json === "string" ? JSON.parse(json) : undefined;
  } catch {
    liste = undefined;
  }
  if (!Array.isArray(liste)) return { ok: false, error: "La sélection est illisible. Relancez l’analyse." };
  if (liste.length === 0) return { ok: false, error: "Gardez au moins un élément, ou créez une collection vide." };
  if (liste.length > IMPORT_MAX) return { ok: false, error: `${IMPORT_MAX} éléments au plus par import.` };

  const elements: ElementImporte[] = [];
  for (const brut of liste) {
    const { title, imageUrl } = (brut ?? {}) as Record<string, unknown>;
    const adresse = adresseWeb(imageUrl);
    if (!adresse) return { ok: false, error: "La sélection est illisible. Relancez l’analyse." };
    const propre = typeof title === "string" ? title.trim().replace(/\s+/g, " ").slice(0, INTITULE_MAX) : "";
    elements.push({ title: propre || "Sans titre", imageUrl: adresse });
  }
  return { ok: true, elements };
}
