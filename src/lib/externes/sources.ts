// Connecteur vers les sites compagnons (contrat commun GET /api/suivi).
// Liste blanche stricte d'origines pour éviter toute SSRF : seules les origines déclarées sont interrogées.

export type SourceExterneId = "nintendo-db" | "dragonball-db";

export type SourceExterneConfig = {
  source: SourceExterneId;
  label: string;
  origin: string;
  token: string | null;
};

export type DonneesExterne = {
  source: SourceExterneId;
  label: string;
  owned: number;
  total: number;
  coverUrl: string | null;
  suggestedTitle: string;
  url: string;
};

export type RaisonErreurExterne = "inconnue" | "non_configuree" | "auth" | "delai" | "reseau" | "http" | "format";

export type ResultatExterne =
  | { ok: true; donnees: DonneesExterne }
  | { ok: false; raison: RaisonErreurExterne; label?: string };

const NINTENDO_DB_URL_DEFAUT = "https://nintendo-db.vercel.app";
const DELAI_MS = 4000;

const LIBELLES: Record<SourceExterneId, string> = {
  "nintendo-db": "Nintendo DB",
  "dragonball-db": "Dragon Ball DB",
};

function lireOrigine(valeur: string | undefined): string | null {
  const propre = valeur?.trim();
  if (!propre) return null;
  try {
    const u = new URL(propre);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export type EnvSources = Partial<Record<string, string | undefined>>;

function sourcesAutorisees(env: EnvSources = process.env): SourceExterneConfig[] {
  const sources: SourceExterneConfig[] = [];
  const nintendoOrigin = lireOrigine(env.NINTENDO_DB_URL) ?? NINTENDO_DB_URL_DEFAUT;
  sources.push({
    source: "nintendo-db",
    label: LIBELLES["nintendo-db"],
    origin: nintendoOrigin,
    token: env.NINTENDO_DB_TOKEN?.trim() || null,
  });

  const dragonballOrigin = lireOrigine(env.DRAGONBALL_DB_URL);
  if (dragonballOrigin) {
    sources.push({
      source: "dragonball-db",
      label: LIBELLES["dragonball-db"],
      origin: dragonballOrigin,
      token: env.DRAGONBALL_DB_TOKEN?.trim() || null,
    });
  }
  return sources;
}

/** Nom lisible d'une source externe (« Nintendo DB », « Dragon Ball DB »…). */
export function libelleSourceExterne(source: string | null | undefined): string {
  if (!source) return "Site externe";
  return (LIBELLES as Record<string, string>)[source] ?? source;
}

/** Reconnaît une URL appartenant à un site compagnon autorisé ; null sinon. */
export function reconnaitreSourceExterne(
  url: string,
  env: EnvSources = process.env,
): (SourceExterneConfig & { url: URL }) | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const config = sourcesAutorisees(env).find((s) => s.origin === parsed.origin);
  return config ? { ...config, url: parsed } : null;
}

function estEntierPositif(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function estUrlHttp(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function nettoyerUrlCanonique(origin: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("collection");
  const query = params.toString();
  return query ? `${origin}/?${query}` : `${origin}/`;
}

/**
 * Interroge l'endpoint `GET /api/suivi` d'un site compagnon autorisé (timeout 4 s, jeton Bearer, validation JSON).
 * Ne suit jamais les redirections (`redirect: "error"`) pour préserver la liste blanche d'origines.
 */
export async function interrogerSourceExterne(
  url: string,
  options?: { env?: EnvSources; fetchFn?: typeof fetch },
): Promise<ResultatExterne> {
  const reconnue = reconnaitreSourceExterne(url, options?.env);
  if (!reconnue) return { ok: false, raison: "inconnue" };
  if (!reconnue.token) return { ok: false, raison: "non_configuree", label: reconnue.label };

  const params = new URLSearchParams(reconnue.url.search);
  params.delete("collection");
  const query = params.toString();
  const endpoint = `${reconnue.origin}/api/suivi${query ? `?${query}` : ""}`;
  const fetchImpl = options?.fetchFn ?? fetch;

  let reponse: Response;
  try {
    reponse = await fetchImpl(endpoint, {
      headers: {
        Authorization: `Bearer ${reconnue.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch (erreur) {
    const nom = erreur instanceof Error ? erreur.name : "";
    if (nom === "TimeoutError" || nom === "AbortError") {
      return { ok: false, raison: "delai", label: reconnue.label };
    }
    return { ok: false, raison: "reseau", label: reconnue.label };
  }

  if (reponse.status === 401 || reponse.status === 403) {
    return { ok: false, raison: "auth", label: reconnue.label };
  }
  if (reponse.status === 503) {
    return { ok: false, raison: "non_configuree", label: reconnue.label };
  }
  if (!reponse.ok) {
    return { ok: false, raison: "http", label: reconnue.label };
  }

  let corps: unknown;
  try {
    corps = await reponse.json();
  } catch {
    return { ok: false, raison: "format", label: reconnue.label };
  }
  if (typeof corps !== "object" || corps === null) {
    return { ok: false, raison: "format", label: reconnue.label };
  }
  const data = corps as Record<string, unknown>;
  if (
    !estEntierPositif(data.owned) ||
    !estEntierPositif(data.total) ||
    (data.coverUrl !== null && !estUrlHttp(data.coverUrl)) ||
    typeof data.suggestedTitle !== "string" ||
    !data.suggestedTitle.trim()
  ) {
    return { ok: false, raison: "format", label: reconnue.label };
  }

  const urlFinale =
    estUrlHttp(data.url) && new URL(data.url).origin === reconnue.origin
      ? data.url
      : nettoyerUrlCanonique(reconnue.origin, reconnue.url.search);

  return {
    ok: true,
    donnees: {
      source: reconnue.source,
      label: reconnue.label,
      owned: data.owned,
      total: data.total,
      coverUrl: data.coverUrl,
      suggestedTitle: data.suggestedTitle.trim(),
      url: urlFinale,
    },
  };
}

/** Message d'erreur lisible en français pour un échec d'interrogation d'une source externe. */
export function messageErreurExterne(
  raison: RaisonErreurExterne,
  label = "ce site",
): { titre: string; texte: string } {
  switch (raison) {
    case "non_configuree":
      return {
        titre: `Connexion à ${label} non configurée`,
        texte: `Ajoutez le jeton de suivi sur Vercel pour lire votre avancement depuis ${label}.`,
      };
    case "auth":
      return {
        titre: `Accès refusé par ${label}`,
        texte: `Le jeton de suivi configuré ne correspond pas à celui de ${label}.`,
      };
    case "delai":
      return {
        titre: `${label} met trop de temps à répondre`,
        texte: "Le site n’a pas répondu en 4 secondes. Réessayez dans un instant.",
      };
    case "reseau":
      return {
        titre: `${label} est injoignable`,
        texte: "Vérifiez que le site est en ligne, puis réessayez.",
      };
    case "http":
    case "format":
      return {
        titre: `Réponse inattendue de ${label}`,
        texte: `Impossible de lire les compteurs de ${label}. Réessayez dans un instant.`,
      };
    case "inconnue":
    default:
      return {
        titre: "Source non reconnue",
        texte: "Cette adresse ne correspond pas à un site compagnon autorisé.",
      };
  }
}
