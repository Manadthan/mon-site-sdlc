# Conception technique — Suivi de collections

> Phase 2 du SDLC : **conception**. Ce document décrit *comment* on construit ce que décrit [SPEC.md](./SPEC.md).
>
> Version 0.1 — 13/11/2026 — statut : brouillon à valider

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
| Hébergement | **Vercel** (gratuit) | Déploiement automatique à chaque merge sur `main` |
| Tests | **Vitest** (unitaires) + **Playwright** (bout en bout, viewport iPhone 12 mini) | Standard, intégrés à la CI |
| CI | **GitHub Actions** | Lint + types + tests à chaque pull request |

### Décisions d'architecture (ADR)

- **ADR-01 — Un seul utilisateur.** Le compte est créé à la main dans Supabase ; les inscriptions publiques sont désactivées.
- **ADR-02 — Images copiées et redimensionnées.** Chaque image est téléchargée, convertie en WebP 400 px de large, puis stockée. L'URL d'origine est gardée pour information.
- **ADR-03 — Import en deux temps.** (1) *Aperçu* : on scrape et on montre les candidats, sans rien enregistrer. (2) *Import* : on enregistre les items retenus, puis on copie les images **par lots de 10**, pilotés par le navigateur, pour rester sous la limite de durée des fonctions Vercel gratuites et afficher une progression.
- **ADR-04 — Ordre par entier `position`.** Monter/descendre un item = échanger sa `position` avec son voisin, dans une seule transaction.

## 2. Architecture

```
 iPhone (Safari)
     │  HTTPS
     ▼
 ┌──────────────── Vercel ────────────────┐
 │  Next.js                               │
 │   • pages (accueil, collection, …)     │
 │   • server actions (CRUD, cocher, …)   │
 │   • /api/scrape  ──────────────┐       │
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
```

- Le compteur « possédés / total » et le % sont **calculés** par une vue SQL `collection_stats` (pas stockés → jamais désynchronisés).
- Index : `items (collection_id, position)`.
- **Row Level Security** activée : chaque requête ne voit que les lignes où `user_id = auth.uid()`.
- Le tri préféré de l'accueil (US-05) est mémorisé dans un cookie : inutile de créer une table pour ça.

## 4. Écrans et routes

| Route | Écran | User stories |
|---|---|---|
| `/login` | Connexion | US-01 |
| `/` | Accueil : liste des collections, tri, bouton « + » | US-02, US-04, US-05 |
| `/collections/new` | Création : URL → aperçu → import avec progression | US-03 |
| `/collections/[id]` | Collection : grille de vignettes, mode cocher / mode édition | US-06 à US-10 |

Les maquettes de ces écrans sont à valider avant le développement.

## 5. Actions serveur

| Action | Effet |
|---|---|
| `scrapePreview(url)` | Retourne `{ pageTitle, candidates: [{ imageUrl, title }] }` — n'écrit rien |
| `createCollection(name, url, candidates)` | Crée la collection et ses items (sans images encore) |
| `importImages(collectionId, itemIds[≤10])` | Télécharge, redimensionne, stocke un lot d'images |
| `toggleOwned(itemId)` | Bascule `owned` |
| `moveItem(itemId, 'up' \| 'down')` | Échange les positions avec le voisin |
| `addItem(collectionId, title, image?)` | Ajoute en fin de liste |
| `renameItem` / `deleteItem` / `deleteCollection` | Évident ; la suppression efface aussi les fichiers du Storage |

## 6. Le scraper

1. **Récupérer** la page : délai max 10 s, taille max 5 Mo, HTTP accepté (cas dbzcollection), encodage détecté (beaucoup de vieux sites sont en ISO-8859-1).
2. **Extraire** chaque `<img>` (attributs `src`, `data-src`, `srcset`), convertir en URL absolue.
3. **Filtrer** le bruit : SVG, GIF d'1 px, images dont le nom évoque `logo`, `banner`, `icon`, `pub` ; doublons d'URL.
4. **Trouver un intitulé**, dans cet ordre : `alt` → `title` → `<figcaption>` → texte du lien parent → texte le plus proche dans le même bloc → nom du fichier.
5. **Retourner** les candidats dans l'ordre de la page ; l'utilisateur décoche le bruit restant dans l'aperçu.

Les adaptateurs spécifiques à un site viendront plus tard, seulement si l'extracteur générique ne suffit pas.

### Sécurité du scraper (important)

Le serveur va chercher des URL saisies par l'utilisateur : c'est une porte d'entrée classique pour une attaque **SSRF**
(faire appeler par notre serveur des adresses internes). Protections :
- uniquement `http` et `https` ;
- refus des adresses privées / locales (`localhost`, `127.*`, `10.*`, `192.168.*`, `169.254.*`…) après résolution DNS, y compris après redirection ;
- 5 redirections max ; seules les réponses `image/*` sont acceptées lors de la copie des images.

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
| Projet Supabase gratuit mis en pause après 7 jours sans activité | Site indisponible | Usage régulier, ou tâche planifiée de « ping » |

## 10. Plan de découpage (préparation de la phase 3)

1. **Socle** : projet Next.js, Tailwind, CI, déploiement Vercel d'une page vide.
2. **Connexion** (US-01) + schéma de base de données.
3. **Accueil** (US-02, US-04, US-05) avec données saisies à la main.
4. **Page collection** (US-06, US-07).
5. **Édition** (US-08, US-10).
6. **Scraper** + création depuis une URL (US-03).
7. **Recherche et filtres** (US-09).

Chaque étape produit un site déployé et utilisable : on peut s'arrêter ou réorienter à tout moment.
