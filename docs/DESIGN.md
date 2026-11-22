# Conception technique — Suivi de collections

> Phase 2 du SDLC : **conception**. Ce document décrit *comment* on construit ce que décrit [SPEC.md](./SPEC.md).
>
> Version 1.13 — 22/11/2026 — statut : **validé**
>
> | Version | Date | Changements |
> |---|---|---|
> | 0.1 | 13/11/2026 | Premier brouillon |
> | 1.13 | 22/11/2026 | §6 : éléments lus dans les données JSON de la page quand ses `<img>` ne donnent rien (sites construits en JavaScript, ex. Glénat, issue #82) ; images répétées décochées ; dossier principal sans les morceaux chiffrés |
> | 1.12 | 22/11/2026 | ADR-02 : bords vides des images rognés, cases 3:4 ; ADR-05 : version dans le nom des vignettes, retraitement des anciennes (issue #79) |
> | 1.11 | 22/11/2026 | ADR-06 révisé : un jeton par compte (table `partages`, migration 0007) au lieu d'un par collection ; routes `/partage/[jeton]` et `/partage/[jeton]/[id]` |
> | 1.10 | 22/11/2026 | ADR-06, §3, §4, §5, §9 : partage d'une collection en lecture seule par lien secret (US-17) |
> | 1.9 | 15/11/2026 | §4, §5 : compléter une collection depuis une URL (US-13) |
> | 1.8 | 15/11/2026 | §3 : couverture d'une collection calculée par `collection_stats` (migration 0005, issue #59) |
> | 1.7 | 15/11/2026 | §5 : import d'une sauvegarde (US-11) |
> | 1.6 | 15/11/2026 | §5 : sauvegarde (export .zip fabriqué dans le navigateur, issue #53) |
> | 1.5 | 15/11/2026 | §6 : relais des images de l'aperçu par notre serveur (sites en HTTP, issue #49) |
> | 1.4 | 15/11/2026 | §2, §5 : l'analyse d'une page est une server action (`analyserPage`), pas une route `/api/scrape` ; `importerCollection` crée la collection et ses items |
> | 1.3 | 14/11/2026 | Image par URL d'US-08 déplacée à l'étape 6 (#35), avec la protection SSRF ; §6 : vérification de l'adresse à la connexion, plages réservées complétées |
> | 1.2 | 14/11/2026 | Plan §10 : ajout d'un item (intitulé seul) avancé à l'étape 4 (issue #32) ; étapes suivies par des milestones GitHub |
> | 1.1 | 14/11/2026 | Plan §10 : création d'une collection vide avancée à l'étape 3 (issue #24) ; `proxy.ts` remplace `middleware.ts` (Next.js 16) |
> | 1.0 | 13/11/2026 | Revue (issue #6) : `move_item` en fonction SQL, RLS des items via la collection, images publiques (ADR-05) et chemins de stockage, réduction des photos dans le navigateur, liste SSRF complétée, maquettes complétées |

## 1. Stack retenue

| Besoin | Choix | Pourquoi |
|---|---|---|
| Pages + serveur | **Next.js** (App Router, TypeScript) | Front et back dans un seul projet ; le scraper tourne côté serveur |
| Lecture du HTML scrapé | **cheerio** | Analyse le HTML comme jQuery, léger, sans navigateur |
| Redimensionnement des images | **sharp** | Vignettes WebP légères, rapides sur iPhone |
| Base de données | **Supabase Postgres** | Gratuit, géré, sauvegardes |
| Stockage des images | **Supabase Storage** | Les images copiées survivent aux redéploiements |
| Connexion | **Supabase Auth** (e-mail + mot de passe) | Rien à coder côté sécurité des mots de passe |
| Style | **Tailwind CSS** | Mise en page mobile rapide, cohérente |
| Hébergement | **Vercel** (gratuit), fonctions en région **Paris** (`cdg1`) | Déploiement automatique à chaque merge sur `main` ; serveur proche de l'utilisateur et de Supabase (UE) |
| Tests | **Vitest** (unitaires) + **Playwright** (bout en bout, viewport iPhone 12 mini) | Standard, intégrés à la CI |
| CI | **GitHub Actions** | Lint + types + tests à chaque pull request |

### Décisions d'architecture (ADR)

- **ADR-01 — Un seul utilisateur.** Le compte est créé à la main dans Supabase ; les inscriptions publiques sont désactivées.
- **ADR-02 — Images copiées et redimensionnées.** Chaque image est téléchargée, convertie en WebP 400 px de large, puis stockée. L'URL d'origine est gardée pour information. Les bords unis (blanc, transparent) sont rognés avant la réduction (sharp `trim`, tolérance 20) pour que l'objet remplisse sa case, affichée en 3:4 (issue #79).
- **ADR-03 — Import en deux temps.** (1) *Aperçu* : on scrape et on montre les candidats, sans rien enregistrer. (2) *Import* : on enregistre les items retenus, puis on copie les images **par lots de 10**, pilotés par le navigateur, pour rester sous la limite de durée des fonctions Vercel gratuites et afficher une progression.
- **ADR-04 — Ordre par entier `position`.** Monter/descendre un item = échanger sa `position` avec son voisin, dans une seule transaction.
  Le client Supabase ne sait pas enchaîner plusieurs requêtes dans une transaction : l'échange est donc fait par une **fonction SQL `move_item(item_id, direction)`** appelée en RPC (une fonction Postgres s'exécute d'un seul bloc).
- **ADR-05 — Bucket d'images public.** Les vignettes sont servies par URL publique, avec des chemins impossibles à deviner (identifiants UUID) : `{user_id}/{collection_id}/{item_id}-v2.webp` (`v2` = version de fabrication : un nouveau nom donne une nouvelle URL, malgré le cache d'un an ; les vignettes sans version, d'avant le rognage, se retraitent en mode édition avec `recadrerImages`, par lots de 10). Seule l'écriture est protégée. Pourquoi : chargement rapide de 300+ vignettes sans générer de liens signés, et ces images sont déjà publiques sur les sites sources. Supprimer une collection = supprimer le dossier `{user_id}/{collection_id}/`.

- **ADR-06 — Partage en lecture seule par lien secret (US-17, révisé en v1.11).** Un **seul** jeton aléatoire par compte (table `partages`, 32 octets, impossible à deviner) donne accès à **toutes** les collections : lien `/partage/{jeton}`. La lecture passe par deux **fonctions SQL** `security definer` : `shared_collections(token)` (liste avec statistiques et couverture) et `shared_collection(token, collection_id)` (une collection et ses items, seulement si elle appartient au propriétaire du jeton). Elles renvoient NULL pour un jeton inconnu. On n'ouvre **aucune** politique RLS au visiteur anonyme. ADR-01 reste valable : toujours un seul compte, le visiteur n'en a pas. Les images sont déjà publiques (ADR-05). Arrêter le partage = supprimer la ligne de `partages` ; partager à nouveau = nouveau jeton. La v1.10 (un jeton par collection, `collections.share_token`) est retirée par la migration 0007.

## 2. Architecture

```
 iPhone (Safari)
     │  HTTPS
     ▼
 ┌──────────────── Vercel ────────────────┐
 │  Next.js                               │
 │   • pages (accueil, collection, …)     │
 │   • server actions (CRUD, cocher, …)   │
 │   • analyse d'une page ───────┐       │
 └───────────┬────────────────────┼───────┘
             │                    │ HTTP(S)
             ▼                    ▼
   ┌──── Supabase ────┐    Sites sources
   │ Auth             │    (kanzenshuu,
   │ Postgres         │     dbzcollection…)
   │ Storage (images) │
   └──────────────────┘
```

## 3. Modèle de données

```
collections                         items
───────────                         ─────
id           uuid  PK               id            uuid  PK
user_id      uuid  → auth.users     collection_id uuid  → collections (ON DELETE CASCADE)
name         text  NOT NULL         title         text  NOT NULL
source_url   text                   image_path    text        -- chemin dans Storage, NULL si pas d'image
cover_path   text                   source_image  text        -- URL d'origine (info)
created_at   timestamptz            position      integer NOT NULL
                                    owned         boolean NOT NULL DEFAULT false
                                    created_at    timestamptz

partages (US-17)
────────
user_id      uuid  PK → auth.users (ON DELETE CASCADE)
token        text  NOT NULL UNIQUE  -- 43 caractères base64url
created_at   timestamptz
```

- Le compteur « possédés / total » et le % sont **calculés** par une vue SQL `collection_stats` (pas stockés → jamais désynchronisés).
- La **couverture** d'une collection (accueil) est aussi calculée par cette vue : `cover_path` si renseignée, sinon l'image du premier item (dans l'ordre) qui en a une.
- Index : `items (collection_id, position)`.
- **Row Level Security** activée :
  - `collections` : une ligne n'est visible et modifiable que si `user_id = auth.uid()` ;
  - `items` (pas de colonne `user_id`) : une ligne n'est visible et modifiable que si sa collection appartient à `auth.uid()` (`exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid())`) ;
  - Storage : lecture publique (ADR-05) ; écriture et suppression réservées à l'utilisateur connecté, dans son dossier `{user_id}/`.
- `partages` (migration 0007) : pas de ligne = rien n'est partagé (ADR-06). RLS : chacun ne voit et ne modifie que sa ligne. Seules `shared_collections` et `shared_collection` sont exécutables par le rôle anonyme.
- Le tri préféré de l'accueil (US-05) est mémorisé dans un cookie : inutile de créer une table pour ça.

## 4. Écrans et routes

| Route | Écran | User stories |
|---|---|---|
| `/login` | Connexion | US-01 |
| `/` | Accueil : liste des collections, tri, bouton « + » | US-02, US-04, US-05 |
| `/collections/new` | Création : URL → aperçu → import avec progression | US-03 |
| `/collections/[id]` | Collection : grille de vignettes, mode cocher / mode édition | US-06 à US-10, US-12 |
| `/collections/[id]/completer` | Compléter : URL → aperçu (doublons décochés) → ajout en fin de collection | US-13 |
| `/partage/[jeton]` | Collections partagées, **sans connexion** : liste comme l'accueil (couverture, compteur, tri), sans création ni suppression ; `noindex` ; exclue de la redirection vers `/login` (`proxy.ts`) | US-17 |
| `/partage/[jeton]/[id]` | Une collection partagée : grille en lecture seule, recherche, filtre, tri, zoom ; retour à la liste partagée | US-17 |

Maquettes validées (v1.0) : voir [MAQUETTES.md](./MAQUETTES.md), y compris les états vides, confirmations, progression et erreurs.

## 5. Actions serveur

| Action | Effet |
|---|---|
| `analyserPage(url)` | Appelle `scrapePreview(url)` : retourne `{ pageTitle, candidates: [{ imageUrl, title, decor }] }` — n'écrit rien ; réservé à l'utilisateur connecté |
| `importerCollection(name, url, éléments retenus)` | Crée la collection et ses items dans l'ordre de la page (adresse de l'image dans `source_image`, sans image copiée encore) |
| `createCollection(name)` | Crée une collection vide |
| `completerCollection(id, éléments retenus)` | Ajoute les éléments en fin de collection (positions après la dernière) ; images copiées ensuite par `importerImages`. Doublons = même `source_image`, décochés dans l'aperçu |
| `importImages(collectionId, itemIds[≤10])` | Télécharge, redimensionne, stocke un lot d'images |
| `toggleOwned(itemId)` | Bascule `owned` |
| `moveItem(itemId, 'up' \| 'down')` | Échange les positions avec le voisin via la fonction SQL `move_item` (ADR-04) |
| `addItem(collectionId, title, image?)` | Ajoute en fin de liste. Une photo de l'iPhone est d'abord **réduite dans le navigateur** (≈ 1200 px, JPEG) : une photo brute fait 3 à 5 Mo, au-delà de la limite d'envoi des server actions (1 Mo par défaut). Ou bien l'**adresse d'une image**, téléchargée côté serveur avec la protection SSRF (§6) *avant* de créer l'item : une adresse refusée n'enregistre rien |
| `preparerExport()` | Sauvegarde (SPEC §4) : renvoie `donnees.json` et l'adresse publique des images ; le **navigateur** télécharge les images et fabrique le .zip (`fflate`), car une réponse serveur Vercel est limitée en taille |
| `creerCollectionImportee` / `ajouterItemsImportes` / `enregistrerImagesImportees` | Import d'une sauvegarde (US-11), piloté par le navigateur qui ouvre le .zip : collections **ajoutées** (nom suffixé « (importée) » si déjà pris), items par paquets de 500, images par lots de 10 ré-encodées par sharp |
| `partagerCollections()` / `arreterPartage()` | Crée (ou remplace) le jeton de `partages` et le renvoie / supprime la ligne (US-17, ADR-06). Bouton « Partager » de l'accueil |
| `renameItem` / `deleteItem` / `deleteCollection` | Évident ; la suppression efface aussi les fichiers du Storage |

## 6. Le scraper

1. **Récupérer** la page : délai max 10 s, taille max 5 Mo, HTTP accepté (cas dbzcollection), encodage détecté (beaucoup de vieux sites sont en ISO-8859-1).
2. **Extraire** chaque `<img>` (attributs `src`, `data-src`, `srcset`), convertir en URL absolue.
3. **Filtrer** le bruit : SVG, GIF d'1 px, images dont le nom évoque `logo`, `banner`, `icon`, `pub` ; doublons d'URL. Décochés aussi : une image répétée 3 fois ou plus (image de remplacement), une image hors du « dossier principal » (dossier qui regroupe le plus d'images, sans ses morceaux chiffrés comme `/2019/` ou `/72x72/`).
4. **Trouver un intitulé**, dans cet ordre : `alt` → `title` → `<figcaption>` → texte du lien parent → texte le plus proche dans le même bloc → nom du fichier.
5. **Sites construits en JavaScript** (ex. Glénat, Next.js) : si aucune `<img>` n'est retenue, on lit les données JSON de la page (`<script type="application/json">`, dont `__NEXT_DATA__`, et `application/ld+json`) ; chaque objet qui a une adresse d'image et un intitulé (`titre`/`title`, sinon `nom`/`name`, sinon `label`) devient un candidat. Limite : ce que la page charge ensuite (pages 2, 3… d'une liste) n'est pas lu.
6. **Retourner** les candidats dans l'ordre de la page ; l'utilisateur décoche le bruit restant dans l'aperçu.

Les adaptateurs spécifiques à un site viendront plus tard, seulement si l'extracteur générique ne suffit pas.

### Sécurité du scraper (important)

Le serveur va chercher des URL saisies par l'utilisateur : c'est une porte d'entrée classique pour une attaque **SSRF**
(faire appeler par notre serveur des adresses internes). Protections :
- uniquement `http` et `https` ;
- refus des adresses privées / locales après résolution DNS : `localhost`, `0.0.0.0`, `127.*`, `10.*`, `172.16.*` à `172.31.*`, `192.168.*`, `169.254.*`, `100.64.*` à `100.127.*`, et en IPv6 `::1`, `fc00::/7`, `fe80::/10`, adresses IPv4 encapsulées (`::ffff:…`) ; aussi multicast et plages réservées, NAT64 et 6to4 (`src/lib/scraper/ssrf.ts`) ;
- l'adresse est vérifiée **au moment de la connexion** (et non dans une étape séparée) : un domaine qui changerait d'adresse entre-temps (« DNS rebinding ») est bloqué ;
- la vérification est refaite **à chaque redirection** (on suit les redirections nous-mêmes, pas automatiquement) ;
- **Aperçu** : une image en HTTP est refusée par Safari dans une page HTTPS ; elle passe par la route `/apercu-image` (même protection, vignette WebP, rien d'enregistré, utilisateur connecté seulement). Une image HTTPS est affichée depuis le site source, la route servant de second essai.
- 5 redirections max ; délai total 10 s ; seules les réponses `image/*` (hors SVG, 10 Mo max) sont acceptées lors de la copie des images.

## 7. Stratégie de test

- **Unitaires (Vitest)** : le scraper est testé sur des **copies HTML enregistrées** des pages de référence (fixtures), pas sur les sites en direct → tests rapides et stables.
- **Bout en bout (Playwright)** : parcours principaux en viewport 375×812 (iPhone 12 mini) : connexion, création, cocher, réordonner, supprimer.
- **CI** : chaque pull request lance lint, vérification des types, tests unitaires et build. Merge interdit si c'est rouge.

## 8. Organisation du dépôt et workflow

```
docs/            SPEC.md, DESIGN.md, maquettes
src/app/         pages et routes Next.js
src/lib/scraper/ extracteur + tests + fixtures
supabase/        migrations SQL (le schéma est versionné dans Git)
.github/         workflows CI
```

- Branche `main` protégée : on n'y pousse jamais directement.
- Une issue → une branche (`feat/us-07-cocher-item`) → une pull request → revue → merge.
- Messages de commit au format *Conventional Commits* (`feat:`, `fix:`, `docs:`, `test:`…).

## 9. Risques

| Risque | Impact | Parade |
|---|---|---|
| Un site source bloque ou change de structure | Import raté | Création d'une collection vide + ajout manuel ; adaptateur dédié si besoin |
| Import de centaines d'images trop long | Délai dépassé | Lots de 10 pilotés par le navigateur (ADR-03) |
| Quota gratuit Supabase (1 Go de stockage) | Plus de place | Vignettes WebP ~30 Ko → ~30 000 images possibles |
| Lien de partage transféré à un inconnu | La collection est visible par lui (lecture seule) | « Arrêter le partage » invalide le lien ; rien d'autre n'est exposé (ADR-06) |
| Projet Supabase gratuit mis en pause après 7 jours sans activité | Site indisponible | Usage régulier, ou tâche planifiée de « ping » |

## 10. Plan de découpage (préparation de la phase 3)

1. **Socle** : projet Next.js, Tailwind, CI, déploiement Vercel d'une page vide.
2. **Connexion** (US-01) + schéma de base de données.
3. **Accueil** (US-02, US-04, US-05) + **création d'une collection vide** (US-03, partie 1/2) : sans elle, le site en ligne resterait vide jusqu'à l'étape 6.
4. **Page collection** (US-06, US-07) + **ajout d'un item, intitulé seul** (US-08, partie 1/2) : sans lui, il n'y aurait rien à cocher avant l'étape 5.
5. **Édition** (US-08 partie 2/2 : mode édition, photo, renommer, supprimer ; US-10).
6. **Scraper** + création depuis une URL (US-03, partie 2/2 : aperçu et import) ; image par URL d'US-08, qui partage la protection SSRF.
7. **Recherche et filtres** (US-09).

Chaque étape produit un site déployé et utilisable : on peut s'arrêter ou réorienter à tout moment.
Chaque étape est suivie par un **milestone GitHub** (« Étape 4 — Page collection », etc.) qui regroupe ses issues.
