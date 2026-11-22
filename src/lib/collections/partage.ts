import type { Item } from "@/components/ItemTile";

/** Forme d'un jeton de partage (ADR-06) : 32 octets aléatoires en base64url = 43 caractères. */
const JETON = /^[A-Za-z0-9_-]{43}$/;

/** Vrai si la valeur a la forme d'un jeton de partage. Évite d'interroger la base pour rien. */
export function estJetonPartage(valeur: unknown): valeur is string {
  return typeof valeur === "string" && JETON.test(valeur);
}

/** Nouveau jeton, impossible à deviner (générateur cryptographique). */
export function nouveauJetonPartage(): string {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return Buffer.from(octets).toString("base64url");
}

/** Adresse du lien à envoyer (US-17). */
export function lienPartage(origine: string, jeton: string): string {
  return `${origine.replace(/\/+$/, "")}/partage/${jeton}`;
}

export type CollectionPartagee = { name: string; items: Item[] };

function estItem(valeur: unknown): valeur is Item {
  if (typeof valeur !== "object" || valeur === null) return false;
  const v = valeur as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    (v.image_path === null || typeof v.image_path === "string") &&
    typeof v.owned === "boolean"
  );
}

/** Lecture vérifiée de la réponse de shared_collection(token) ; null si le lien n'est pas (ou plus) valide. */
export function lireCollectionPartagee(donnees: unknown): CollectionPartagee | null {
  if (typeof donnees !== "object" || donnees === null) return null;
  const { name, items } = donnees as Record<string, unknown>;
  if (typeof name !== "string" || !Array.isArray(items) || !items.every(estItem)) return null;
  return {
    name,
    items: items.map(({ id, title, image_path, owned }) => ({ id, title, image_path, owned })),
  };
}
