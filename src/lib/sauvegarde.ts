import { CATEGORIE_MAX } from "@/lib/collections/categorie";
import { NOM_MAX } from "@/lib/collections/name";
import { VERSION_EXPORT } from "@/lib/export";
import { INTITULE_MAX } from "@/lib/items/title";

/** Bornes d'une sauvegarde importée (US-11), pour refuser un fichier aberrant. */
export const COLLECTIONS_MAX = 500;
export const ITEMS_PAR_COLLECTION_MAX = 5000;
/** Items envoyés au serveur par appel : reste sous la limite de taille d'une action serveur (2 Mo). */
export const ITEMS_PAR_APPEL = 500;

export type ItemSauvegarde = { intitule: string; possede: boolean; image: string | null; image_source: string | null };
export type CollectionSauvegarde = { nom: string; categorie: string | null; page_source: string | null; items: ItemSauvegarde[] };

const ILLISIBLE = "Ce fichier n’est pas une sauvegarde de Suivi de collections.";

function texte(valeur: unknown, max: number): string {
  return typeof valeur === "string" ? valeur.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function adresse(valeur: unknown): string | null {
  if (typeof valeur !== "string" || valeur.length > 2000) return null;
  try {
    const url = new URL(valeur);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Chemin d'image dans le zip, tel que l'export l'écrit : images/<collection>/<item>.webp */
function cheminImage(valeur: unknown): string | null {
  return typeof valeur === "string" && /^images\/[\w-]+\/[\w-]+\.webp$/.test(valeur) ? valeur : null;
}

/**
 * Lit et vérifie donnees.json (format de src/lib/export.ts). Le fichier vient de l'utilisateur :
 * chaque champ est contrôlé, nettoyé et borné ; un intitulé vide devient « Sans titre ».
 */
export function lireSauvegarde(
  json: unknown,
): { ok: true; collections: CollectionSauvegarde[] } | { ok: false; error: string } {
  const racine = (json ?? {}) as Record<string, unknown>;
  if (racine.format !== "suivi-collections" || !Array.isArray(racine.collections)) return { ok: false, error: ILLISIBLE };
  if (typeof racine.version !== "number" || racine.version > VERSION_EXPORT) {
    return { ok: false, error: "Cette sauvegarde vient d’une version plus récente de l’application." };
  }
  if (racine.collections.length === 0) return { ok: false, error: "Cette sauvegarde ne contient aucune collection." };
  if (racine.collections.length > COLLECTIONS_MAX) return { ok: false, error: `${COLLECTIONS_MAX} collections au plus par import.` };

  const collections: CollectionSauvegarde[] = [];
  for (const brute of racine.collections as unknown[]) {
    const c = (brute ?? {}) as Record<string, unknown>;
    if (!Array.isArray(c.items)) return { ok: false, error: ILLISIBLE };
    if (c.items.length > ITEMS_PAR_COLLECTION_MAX) {
      return { ok: false, error: `Une collection dépasse ${ITEMS_PAR_COLLECTION_MAX} items.` };
    }
    collections.push({
      nom: texte(c.nom, NOM_MAX) || "Collection importée",
      categorie: texte(c.categorie, CATEGORIE_MAX) || null,
      page_source: adresse(c.page_source),
      items: (c.items as unknown[]).map(nettoyerItem),
    });
  }
  return { ok: true, collections };
}

/** Un item de la sauvegarde, contrôlé champ par champ (aussi revérifié côté serveur). */
export function nettoyerItem(brut: unknown): ItemSauvegarde {
  const i = (brut ?? {}) as Record<string, unknown>;
  return {
    intitule: texte(i.intitule, INTITULE_MAX) || "Sans titre",
    possede: i.possede === true,
    image: cheminImage(i.image),
    image_source: adresse(i.image_source),
  };
}

/**
 * Nom libre pour une collection importée (US-11) : « Cartes », sinon « Cartes (importée) », « Cartes (importée 2) »…
 * Avec `toujours` (duplication, US-18) : la mention est ajoutée même si le nom est libre (« Cartes (copie) »).
 */
export function nomSansDoublon(nom: string, existants: Iterable<string>, mention = "importée", toujours = false): string {
  const pris = new Set([...existants].map((n) => n.toLowerCase()));
  if (!toujours && !pris.has(nom.toLowerCase())) return nom;
  for (let n = 1; ; n++) {
    const suffixe = n === 1 ? ` (${mention})` : ` (${mention} ${n})`;
    const candidat = nom.slice(0, NOM_MAX - suffixe.length) + suffixe;
    if (!pris.has(candidat.toLowerCase())) return candidat;
  }
}
