/** Pages accessibles sans être connecté. */
export const PUBLIC_PATHS = ["/login"] as const;

/**
 * Où envoyer une requête selon la page demandée et l'état de connexion (US-01).
 * - non connecté sur une page protégée → /login
 * - déjà connecté sur /login → accueil
 * - sinon : on laisse passer (null)
 */
export function authRedirect(pathname: string, isAuthenticated: boolean): "/login" | "/" | null {
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isAuthenticated && !isPublic) return "/login";
  if (isAuthenticated && isPublic) return "/";
  return null;
}
