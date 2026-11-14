import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

/**
 * Récupération « sans risque » d'une URL saisie par l'utilisateur (DESIGN.md §6, sécurité SSRF) :
 * notre serveur ne doit jamais servir à appeler une adresse interne (base, métadonnées du cloud, réseau local).
 *
 * - uniquement http et https, sans identifiants dans l'URL ;
 * - l'adresse IP est vérifiée au moment même de la connexion (option `lookup`) : un nom de domaine
 *   qui change d'adresse entre la vérification et l'appel (« DNS rebinding ») ne passe pas ;
 * - les redirections sont suivies à la main (5 au plus), chaque nouvelle adresse est revérifiée ;
 * - délai et taille maximum, pour ne pas bloquer ni saturer la fonction serveur.
 */

// Deux listes séparées : Node compare une IPv4 aux règles IPv6 encapsulées (::ffff:0:0/96),
// une liste commune bloquerait donc toutes les IPv4.
const INTERDITES_V4 = new BlockList();
const INTERDITES_V6 = new BlockList();
const RESEAUX_V4: [string, number][] = [
  ["0.0.0.0", 8], // « ce réseau », dont 0.0.0.0
  ["10.0.0.0", 8], // privé
  ["100.64.0.0", 10], // partagé (opérateurs)
  ["127.0.0.0", 8], // boucle locale
  ["169.254.0.0", 16], // lien local, dont les métadonnées cloud 169.254.169.254
  ["172.16.0.0", 12], // privé
  ["192.0.0.0", 24], // réservé IETF
  ["192.168.0.0", 16], // privé
  ["198.18.0.0", 15], // bancs de test
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // réservé, dont 255.255.255.255
];
const RESEAUX_V6: [string, number][] = [
  ["::", 96], // non spécifiée (::), boucle locale (::1), IPv4 « compatibles »
  ["::ffff:0:0", 96], // IPv4 encapsulées (::ffff:127.0.0.1)
  ["64:ff9b::", 96], // NAT64 : mène à une IPv4 quelconque
  ["2002::", 16], // 6to4 : idem
  ["fc00::", 7], // privé (unique local)
  ["fe80::", 10], // lien local
  ["ff00::", 8], // multicast
];
for (const [reseau, prefixe] of RESEAUX_V4) INTERDITES_V4.addSubnet(reseau, prefixe, "ipv4");
for (const [reseau, prefixe] of RESEAUX_V6) INTERDITES_V6.addSubnet(reseau, prefixe, "ipv6");

/** Vrai si l'adresse IP est privée, locale ou réservée (ou si ce n'est pas une adresse IP). */
export function adresseInterdite(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return INTERDITES_V4.check(ip, "ipv4");
  if (version === 6) return INTERDITES_V6.check(ip, "ipv6");
  return true;
}

export type RaisonEchec =
  | "url-invalide"
  | "adresse-interdite"
  | "delai"
  | "trop-gros"
  | "type"
  | "http"
  | "trop-de-redirections"
  | "reseau";

export class ErreurRecuperation extends Error {
  constructor(readonly raison: RaisonEchec) {
    super(raison);
    this.name = "ErreurRecuperation";
  }
}

type Filtre = (ip: string) => boolean;

/** Vérifie la forme de l'URL ; une adresse IP écrite en clair est vérifiée tout de suite. */
export function verifierUrl(texte: string, interdite: Filtre = adresseInterdite): URL {
  let url: URL;
  try {
    url = new URL(texte.trim());
  } catch {
    throw new ErreurRecuperation("url-invalide");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ErreurRecuperation("url-invalide");
  if (url.username || url.password || !url.hostname) throw new ErreurRecuperation("url-invalide");

  const hote = url.hostname.replace(/^\[|\]$/g, "");
  if (hote === "localhost" || hote.endsWith(".localhost")) throw new ErreurRecuperation("adresse-interdite");
  if (isIP(hote) && interdite(hote)) throw new ErreurRecuperation("adresse-interdite");
  return url;
}

type Resolveur = (hote: string, options: { all: true }, rappel: (err: Error | null, adresses: LookupAddress[]) => void) => void;

/**
 * Résolution DNS utilisée par la connexion elle-même : refuse si l'une des adresses est interdite.
 * (Node n'appelle pas `lookup` pour une IP écrite en clair : verifierUrl s'en charge.)
 */
export function creerLookup(interdite: Filtre = adresseInterdite, resoudre: Resolveur = dnsLookup): LookupFunction {
  return (hote, options, rappel) => {
    resoudre(hote, { all: true }, (err, adresses) => {
      if (err) return rappel(err, "", 0);
      if (adresses.length === 0 || adresses.some((a) => interdite(a.address))) {
        return rappel(new ErreurRecuperation("adresse-interdite"), "", 0);
      }
      if (options.all) return (rappel as unknown as (e: null, a: LookupAddress[]) => void)(null, adresses);
      rappel(null, adresses[0]!.address, adresses[0]!.family);
    });
  };
}

export type Reponse = { url: URL; type: string; corps: Buffer };

export type OptionsRecuperation = {
  /** Délai total, redirections comprises (10 s par défaut, DESIGN.md §6). */
  delaiMs?: number;
  /** Taille maximale du contenu, en octets. */
  tailleMax: number;
  /** En-tête Accept envoyé. */
  accept?: string;
  /** Refuse la réponse d'après son type (Content-Type), avant d'en lire le contenu. */
  typeAccepte?: (type: string) => boolean;
  /** Remplace le filtre d'adresses : uniquement pour les tests. */
  filtre?: Filtre;
};

export const REDIRECTIONS_MAX = 5;
const REDIRECTIONS = new Set([301, 302, 303, 307, 308]);

/** Récupère une URL en appliquant toutes les protections ci-dessus. Lève une ErreurRecuperation. */
export async function recupererSansRisque(adresse: string, options: OptionsRecuperation): Promise<Reponse> {
  const interdite = options.filtre ?? adresseInterdite;
  const signal = AbortSignal.timeout(options.delaiMs ?? 10_000);
  const lookup = creerLookup(interdite);
  let url = verifierUrl(adresse, interdite);

  for (let saut = 0; saut <= REDIRECTIONS_MAX; saut++) {
    const resultat = await unAppel(url, lookup, signal, options);
    if (!("redirection" in resultat)) return resultat;
    url = verifierUrl(new URL(resultat.redirection, url).href, interdite);
  }
  throw new ErreurRecuperation("trop-de-redirections");
}

function unAppel(
  url: URL,
  lookup: LookupFunction,
  signal: AbortSignal,
  options: OptionsRecuperation,
): Promise<Reponse | { redirection: string }> {
  return new Promise((resolve, reject) => {
    const echec = (raison: RaisonEchec) => {
      requete.destroy();
      reject(new ErreurRecuperation(raison));
    };
    const client = url.protocol === "https:" ? https : http;
    const requete = client.get(
      url,
      {
        lookup,
        signal,
        // Pas d'Accept-Encoding : le contenu arrive non compressé, sa taille est donc bien celle mesurée.
        headers: { "user-agent": "SuiviCollections/1.0", accept: options.accept ?? "*/*" },
      },
      (reponse) => {
        const statut = reponse.statusCode ?? 0;
        const location = reponse.headers.location;
        if (REDIRECTIONS.has(statut) && location) {
          reponse.resume();
          return resolve({ redirection: location });
        }
        if (statut < 200 || statut >= 300) return echec("http");

        const type = (reponse.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
        if (options.typeAccepte && !options.typeAccepte(type)) return echec("type");
        if (Number(reponse.headers["content-length"] ?? 0) > options.tailleMax) return echec("trop-gros");

        const morceaux: Buffer[] = [];
        let taille = 0;
        reponse.on("data", (morceau: Buffer) => {
          taille += morceau.length;
          if (taille > options.tailleMax) return echec("trop-gros");
          morceaux.push(morceau);
        });
        reponse.on("end", () => resolve({ url, type, corps: Buffer.concat(morceaux) }));
        reponse.on("error", () => reject(new ErreurRecuperation(signal.aborted ? "delai" : "reseau")));
      },
    );
    requete.on("error", (err) => {
      if (err instanceof ErreurRecuperation) return reject(err);
      // L'erreur de notre lookup peut arriver enveloppée par Node.
      if ((err as { cause?: unknown }).cause instanceof ErreurRecuperation) return reject((err as { cause: unknown }).cause);
      reject(new ErreurRecuperation(signal.aborted ? "delai" : "reseau"));
    });
  });
}
