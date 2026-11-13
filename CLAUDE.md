# CLAUDE.md — Suivi de collections

Ce fichier est lu par Claude au début de chaque session. Il résume le projet et les règles de travail.

## Objectif

Application web **personnelle** pour suivre des collections (jeux, cartes, mangas, objets).
Une collection est créée à partir de l'URL d'une page qui recense déjà ses éléments : un scraper
récupère images et intitulés, l'utilisateur corrige le résultat, puis coche ce qu'il possède
(coche verte en haut à droite de la vignette).

**Projet d'apprentissage** : le propriétaire apprend à travailler avec Claude selon le SDLC.
→ Explique brièvement *pourquoi* tu fais chaque choix, et fais-lui valider les décisions importantes.
Il travaille surtout depuis l'app Claude sur **iPhone** : réponses courtes, pas de commandes à taper
sur son ordinateur.

- Un seul utilisateur, appareil principal **iPhone 12 mini** (375 × 812, Safari iOS).
- Interface en **français**.

## Documents de référence (à lire avant de coder)

| Fichier | Contenu | Statut |
|---|---|---|
| `docs/SPEC.md` | Besoins : user stories US-01 à US-10 + critères d'acceptation | v1.0 validée |
| `docs/DESIGN.md` | Conception : stack, ADR, modèle de données, scraper, tests, risques | v1.0 validée |
| `docs/MAQUETTES.md` | Lien vers les maquettes : 4 écrans + 7 états complémentaires | v1.0 validée |

Les critères d'acceptation de SPEC.md sont la **définition de « terminé »** d'une fonctionnalité.

## Stack

- **Next.js** (App Router, TypeScript strict) — pages + server actions + route `/api/scrape`
- **Tailwind CSS** — mobile d'abord
- **Supabase** — Postgres (RLS activée), Storage (images), Auth (e-mail + mot de passe, inscriptions désactivées)
- **cheerio** (analyse HTML du scraper), **sharp** (vignettes WebP 400 px)
- **Vitest** (unitaires), **Playwright** (e2e, viewport 375 × 812)
- **Vercel** (hébergement), **GitHub Actions** (CI)

## Architecture en bref

```
iPhone ──HTTPS──▶ Vercel / Next.js ──▶ Supabase (Auth, Postgres, Storage)
                         │
                         └──HTTP(S)──▶ sites sources (scraping côté serveur uniquement)
```

Modèle de données :
- `collections(id, user_id, name, source_url, cover_path, created_at)`
- `items(id, collection_id, title, image_path, source_image, position, owned, created_at)`
- vue `collection_stats` : possédés / total / % (calculés, jamais stockés)

Décisions clés (détail dans DESIGN.md) :
- **ADR-01** un seul utilisateur, compte créé à la main.
- **ADR-02** images copiées dans Supabase Storage, converties en WebP 400 px.
- **ADR-03** import en deux temps : `scrapePreview` (n'écrit rien) puis import des images **par lots de 10** pilotés par le navigateur.
- **ADR-04** ordre des items = entier `position` ; monter/descendre = fonction SQL `move_item` (échange avec le voisin en une transaction).
- **ADR-05** bucket d'images public, chemins `{user_id}/{collection_id}/{item_id}.webp` ; écriture protégée.
- RLS des `items` via la propriété de leur collection (pas de `user_id` sur `items`).

## Arborescence cible

`✅` = existe déjà · sinon : numéro de l'étape du plan qui le crée.

```
mon-site-sdlc/
├── CLAUDE.md                          ✅
├── README.md                          ✅
├── .gitignore                         ✅
├── .env.example                       ✅
├── .nvmrc                             ✅
├── package.json                       ✅
├── tsconfig.json                      ✅
├── next.config.ts                     ✅
├── eslint.config.mjs                  ✅
├── postcss.config.mjs                 ✅
├── vitest.config.ts                   ✅
├── playwright.config.ts               ✅
├── .github/
│   ├── pull_request_template.md       ✅
│   ├── ISSUE_TEMPLATE/
│   │   └── user-story.md              ✅
│   └── workflows/
│       └── ci.yml                     1   lint + types + tests + build
├── docs/
│   ├── SPEC.md                        ✅
│   ├── DESIGN.md                      ✅
│   └── MAQUETTES.md                   ✅
├── public/
│   ├── manifest.webmanifest           1   installation sur l'écran d'accueil iPhone
│   └── icons/                         1
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql            2   tables + vue collection_stats
│   │   └── 0002_rls.sql               2   Row Level Security
│   └── seed.sql                       3   données de démo
├── src/
│   ├── middleware.ts                  2   redirige vers /login si non connecté
│   ├── app/
│   │   ├── layout.tsx                 ✅
│   │   ├── globals.css                ✅
│   │   ├── page.tsx                   3   accueil (US-02, 04, 05)
│   │   ├── login/page.tsx             2   US-01
│   │   ├── collections/
│   │   │   ├── new/page.tsx           6   création + aperçu (US-03)
│   │   │   └── [id]/page.tsx          4   grille de vignettes (US-06 à 10)
│   │   ├── api/scrape/route.ts        6
│   │   └── actions/
│   │       ├── collections.ts         3   create, delete, sort
│   │       ├── items.ts               4-5 toggleOwned, moveItem, add, rename, delete
│   │       └── import.ts              6   importImages par lots
│   ├── components/
│   │   ├── CollectionCard.tsx         3
│   │   ├── SortBar.tsx                3
│   │   ├── ConfirmDialog.tsx          3
│   │   ├── ItemTile.tsx               4   vignette + coche verte
│   │   ├── FilterTabs.tsx             7
│   │   ├── SearchField.tsx            7
│   │   ├── ItemEditTile.tsx           5   flèches haut/bas, suppression
│   │   ├── AddItemForm.tsx            5
│   │   ├── ScrapePreview.tsx          6
│   │   └── ImportProgress.tsx         6
│   ├── lib/
│   │   ├── progress.ts                ✅   possédés / total / % (+ progress.test.ts)
│   │   ├── supabase/
│   │   │   ├── server.ts              2
│   │   │   └── client.ts              2
│   │   ├── images.ts                  6   téléchargement + sharp → WebP
│   │   └── scraper/
│   │       ├── index.ts               6   scrapePreview(url)
│   │       ├── fetchPage.ts           6   délai, taille max, encodage, HTTP accepté
│   │       ├── ssrf.ts                6   blocage des adresses privées
│   │       ├── extract.ts             6   <img> + recherche d'intitulé
│   │       ├── filters.ts             6   logos, bannières, doublons
│   │       └── __tests__/
│   │           ├── extract.test.ts    6
│   │           ├── ssrf.test.ts       6
│   │           └── fixtures/          6   copies HTML des pages de référence
│   └── types/
│       └── database.ts                2   types générés depuis Supabase
└── tests/
    └── e2e/
        ├── home.spec.ts               ✅
        ├── login.spec.ts              2
        ├── collections.spec.ts        3
        ├── owned.spec.ts              4
        └── edit.spec.ts               5
```

## Règles de travail (SDLC)

- **Jamais de commit direct sur `main`.** Une issue → une branche → une pull request → revue par le propriétaire → merge.
- Branches : `feat/us-07-cocher-item`, `fix/…`, `docs/…`, `chore/…`.
- Commits au format **Conventional Commits** : `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.
- PR petites (idéalement < 300 lignes) ; la description suit `.github/pull_request_template.md` et cite les critères d'acceptation couverts.
- Toute fonctionnalité arrive avec ses tests. La CI doit être verte avant merge.
- Aucun secret dans le dépôt : `.env.local` est ignoré, `.env.example` liste les variables.
- Le schéma de base de données évolue **uniquement** par des fichiers dans `supabase/migrations/`.
- Le scraper est testé sur des fixtures HTML, jamais sur les sites en direct.
- Si une demande contredit SPEC.md ou DESIGN.md : le signaler et proposer de mettre le document à jour d'abord.

## Commandes (une fois l'étape 1 faite)

```
npm run dev        # serveur local
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run e2e        # Playwright
```

## Avancement

- [x] Phase 1 — Besoins : `docs/SPEC.md` v1.0 validée
- [x] Phase 2 — Conception : `docs/DESIGN.md` v1.0 + maquettes v1.0 validées
- [x] Phase 3 — Issues GitHub pour l'étape 1 du plan (#1 à #5)
- [ ] Phase 4+ — Développement par étapes, revue, tests, déploiement

## Prochaines étapes

1. ~~Valider DESIGN.md et les maquettes~~ (fait, #6).
2. Labels : `chore`, `docs`, `bug` créés ; `us` sera créé avec la première user story. **Protéger `main`** (réglage GitHub à faire par le propriétaire).
3. Développer l'**étape 1 — Socle** : issues #1 à #5, dans l'ordre (#1 d'abord).
4. Créer le projet Supabase (région UE) et renseigner les variables sur Vercel.
5. Enchaîner les étapes 2 à 7 de DESIGN.md §10, une issue à la fois.
