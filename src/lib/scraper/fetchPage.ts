import "server-only";
import { recupererSansRisque, type OptionsRecuperation } from "@/lib/scraper/ssrf";

/** Taille maximale d'une page (DESIGN.md §6). */
export const PAGE_TAILLE_MAX = 5 * 1024 * 1024;

const TYPES_HTML = new Set(["text/html", "application/xhtml+xml", ""]);

/**
 * Récupère une page HTML avec la protection SSRF : délai 10 s, 5 Mo au plus, HTTP accepté
 * (cas de dbzcollection.fr), redirections suivies et revérifiées. Lève une ErreurRecuperation.
 */
export async function recupererPage(adresse: string, filtre?: OptionsRecuperation["filtre"]) {
  const reponse = await recupererSansRisque(adresse, {
    tailleMax: PAGE_TAILLE_MAX,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    typeAccepte: (type) => TYPES_HTML.has(type),
    filtre,
  });
  return { url: reponse.url, html: decoderHtml(reponse.corps, reponse.contentType) };
}

/**
 * Décode le HTML dans le bon encodage : beaucoup de vieux sites sont en ISO-8859-1.
 * Ordre : en-tête HTTP → balise <meta> → UTF-8 s'il est valide → Windows-1252
 * (le surensemble d'ISO-8859-1 que les navigateurs utilisent à sa place).
 */
export function decoderHtml(corps: Uint8Array, contentType = ""): string {
  const annonce = charset(contentType) ?? charsetMeta(corps);
  if (annonce) {
    try {
      return new TextDecoder(annonce).decode(corps);
    } catch {
      // Encodage inconnu : on devine ci-dessous.
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(corps);
  } catch {
    return new TextDecoder("windows-1252").decode(corps);
  }
}

function charset(texte: string): string | undefined {
  return /charset\s*=\s*["']?([\w.:-]+)/i.exec(texte)?.[1]?.toLowerCase();
}

/** <meta charset="…"> ou <meta http-equiv="Content-Type" content="…; charset=…">, dans le début de la page. */
function charsetMeta(corps: Uint8Array): string | undefined {
  const debut = new TextDecoder("latin1").decode(corps.subarray(0, 4096));
  for (const balise of debut.match(/<meta\b[^>]*>/gi) ?? []) {
    const trouve = charset(balise);
    if (trouve) return trouve;
  }
  return undefined;
}
