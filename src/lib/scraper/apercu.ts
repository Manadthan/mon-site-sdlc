/** Route qui relaie une image de l'aperçu par notre serveur (src/app/apercu-image/route.ts). */
export const ROUTE_APERCU_IMAGE = "/apercu-image";

/**
 * Adresses à essayer, dans l'ordre, pour afficher une image dans l'aperçu (US-03, issue #49).
 * - Image en HTTP : Safari la refuse dans une page HTTPS (« contenu mixte ») → directement par notre serveur.
 * - Image en HTTPS : depuis le site source d'abord (rien à faire côté serveur), notre serveur en second essai
 *   (site qui refuse d'être affiché ailleurs).
 */
export function sourcesApercu(imageUrl: string): string[] {
  const relais = `${ROUTE_APERCU_IMAGE}?url=${encodeURIComponent(imageUrl)}`;
  return imageUrl.startsWith("https://") ? [imageUrl, relais] : [relais];
}
