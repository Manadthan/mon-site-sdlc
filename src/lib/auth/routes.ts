/** Pages réservées aux visiteurs non connectés (un utilisateur connecté est renvoyé à l'accueil). */
export const PUBLIC_PATHS = ["/login"] as const;

/** Pages ouvertes à tous, connecté ou non : collection partagée en lecture seule (US-17). */
export const OPEN_PATHS = ["/partage"] as const;

function dans(pathname: string, chemins: readonly string[]) {
  return chemins.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Où envoyer une requête selon la page demandée et l'état de connexion (US-01).
 * - page ouverte à tous (/partage/…) → on laisse passer
 * - non connecté sur une page protégée → /login
 * - déjà connecté sur /login → accueil
 * - sinon : on laisse passer (null)
 */
export function authRedirect(pathname: string, isAuthenticated: boolean): "/login" | "/" | null {
  if (dans(pathname, OPEN_PATHS)) return null;
  const isPublic = dans(pathname, PUBLIC_PATHS);
  if (!isAuthenticated && !isPublic) return "/login";
  if (isAuthenticated && isPublic) return "/";
  return null;
}
