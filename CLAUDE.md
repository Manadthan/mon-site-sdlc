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
| `docs/SPEC.md` | Besoins : user stories US-01 à US-17 + critères d'acceptation | v1.8 validée |
| `docs/DESIGN.md` | Conception : stack, ADR, modèle de données, scraper, tests, risques | v1.12 validée |
| `docs/MAQUETTES.md` | Lien vers les maquettes : 4 écrans + 7 états complémentaires | v1.0 validée |
| `docs/BILAN.md` | Rétrospective : chiffres, ce qui a marché, ce qui a coincé, leçons | v1.0 validée |

Les critères d'acceptation de SPEC.md sont la **définition de « terminé »** d'une fonctionnalité.

## Stack

- **Next.js** (App Router, TypeScript strict) — pages + server actions (dont l'analyse d'une page à scraper)
- **Tailwind CSS** — mobile d'abord ; couleurs en jetons (`globals.css`), thème sombre automatique (US-16) : jamais de couleur en dur dans un composant
- **Supabase** — Postgres (RLS activée), Storage (images), Auth (e-mail + mot de passe, inscriptions désactivées)
- **cheerio** (analyse HTML du scraper), **sharp** (vignettes WebP 400 px), **fflate** (zip de la sauvegarde)
- **Vitest** (unitaires), **Playwright** (e2e, viewport 375 × 812)
- **Vercel** (hébergement, région Paris `cdg1`), **GitHub Actions** (CI)

## Architecture en bref

```
iPhone ──HTTPS──▶ Vercel / Next.js ──▶ Supabase (Auth, Postgres, Storage)
                         │
                         └──HTTP(S)──▶ sites sources (scraping côté serveur uniquement)
```

Modèle de données :
- `collections(id, user_id, name, source_url, cover_path, created_at)`
- `partages(user_id, token, created_at)` : lien de partage (US-17), une ligne au plus par compte
- `items(id, collection_id, title, image_path, source_image, position, owned, created_at)`
- vue `collection_stats` : possédés / total / % et couverture (calculés, jamais stockés)

Décisions clés (détail dans DESIGN.md) :
- **ADR-01** un seul utilisateur, compte créé à la main.
- **ADR-02** images copiées dans Supabase Storage, bords vides rognés, converties en WebP 400 px.
- **ADR-03** import en deux temps : `scrapePreview` (n'écrit rien) puis import des images **par lots de 10** pilotés par le navigateur.
- **ADR-04** ordre des items = entier `position` ; monter/descendre = fonction SQL `move_item` (échange avec le voisin en une transaction).
- **ADR-06** partage en lecture seule de **toutes** les collections : un jeton secret par compte (table `partages`), lecture anonyme uniquement par les fonctions SQL `shared_collections(token)` et `shared_collection(token, id)` (aucune politique RLS pour `anon`).
- **ADR-05** bucket d'images public, chemins `{user_id}/{collection_id}/{item_id}-v2.webp` (version de fabrication) ; écriture protégée.
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
├── vercel.json                        ✅   région des fonctions : Paris (cdg1)
├── .github/
│   ├── pull_request_template.md       ✅
│   ├── ISSUE_TEMPLATE/
│   │   └── user-story.md              ✅
│   └── workflows/
│       ├── ci.yml                     ✅   lint + types + tests + build + e2e + base de données
│       └── deploy-db.yml              ✅   applique les migrations en production (merge sur main)
├── docs/
│   ├── SPEC.md                        ✅
│   ├── DESIGN.md                      ✅
│   ├── BILAN.md                       ✅   rétrospective du projet
│   └── MAQUETTES.md                   ✅
├── public/
│   ├── manifest.webmanifest           ✅   installation sur l'écran d'accueil iPhone
│   └── icons/                         ✅   icon.svg (source) → PNG 192, 512, apple-touch-icon 180
├── supabase/
│   ├── config.toml                    ✅   base locale (inscriptions désactivées)
│   ├── migrations/
│   │   ├── 0001_schema.sql            ✅   tables + vue collection_stats
│   │   ├── 0002_rls.sql               ✅   Row Level Security
│   │   ├── 0003_images.sql            ✅   bucket public « items », écriture dans son dossier
│   │   ├── 0004_move_item.sql         ✅   fonction move_item (ADR-04)
│   │   ├── 0005_collection_cover.sql  ✅   couverture calculée dans collection_stats (#59)
│   │   ├── 0006_partage.sql           ✅   partage par collection (#75), remplacé par 0007
│   │   └── 0007_partage_global.sql    ✅   table partages + shared_collections / shared_collection (US-17, #77)
│   ├── tests/database/rls.test.sql    ✅   tests pgTAP (npm run db:test)
│   ├── tests/database/storage.test.sql ✅  tests pgTAP du stockage des images
│   ├── tests/database/move_item.test.sql ✅ tests pgTAP de move_item
│   ├── tests/database/collection_cover.test.sql ✅ tests pgTAP de la couverture
│   ├── tests/database/partage.test.sql ✅   tests pgTAP du partage (US-17)
├── src/
│   ├── proxy.ts                       ✅   redirige vers /login si non connecté, sauf /partage (ex-« middleware » de Next.js)
│   ├── app/
│   │   ├── layout.tsx                 ✅
│   │   ├── globals.css                ✅   jetons de couleur, valeurs claires et sombres (US-16)
│   │   ├── page.tsx                   ✅   accueil : liste (US-02), suppression (US-04), tri (US-05)
│   │   ├── login/page.tsx             ✅   US-01
│   │   ├── partage/[jeton]/           ✅   sans compte, lecture seule, noindex (US-17) : page.tsx liste, [id]/page.tsx collection
│   │   ├── apercu-image/route.ts      ✅   relais des images de l'aperçu (HTTP, SSRF, connecté seulement — #49)
│   │   ├── collections/
│   │   │   ├── new/page.tsx           ✅   création : adresse → aperçu → import, ou collection vide (US-03)
│   │   │   ├── [id]/page.tsx          ✅   chargement ; affichage dans CollectionBoard
│   │   │   └── [id]/completer/page.tsx ✅  compléter depuis une URL (US-13)
│   │   └── actions/
│   │       ├── auth.ts                ✅   login, logout (US-01)
│   │       ├── collections.ts         ✅   createCollection, renameCollection (US-12), deleteCollection, changeSort
│   │       ├── items.ts               ✅   addItem, setOwned, renameItem, deleteItem, moveItem
│   │       ├── partage.ts             ✅   partagerCollections, arreterPartage (US-17)
│   │       ├── export.ts              ✅   preparerExport : données + adresses des images (#53)
│   │       ├── sauvegarde.ts          ✅   import d'une sauvegarde : collection, items, images (US-11)
│   │       ├── recadrage.ts           ✅   recadrerImages : rognage des anciennes vignettes, lot de 10 (#79)
│   │       └── import.ts              ✅   analyserPage (aperçu), importerCollection, completerCollection (US-13), importerImages (lot de 10)
│   ├── components/
│   │   ├── LoginForm.tsx              ✅   US-01
│   │   ├── ExportButton.tsx           ✅   sauvegarde .zip (JSON + images) fabriquée dans le navigateur (#53)
│   │   ├── ImportSauvegarde.tsx       ✅   import d'une sauvegarde, collections ajoutées (US-11)
│   │   ├── CollectionCard.tsx         ✅   US-02
│   │   ├── NewCollectionForm.tsx      ✅   US-03 : adresse, nom pré-rempli, aperçu, import ou collection vide
│   │   ├── SortBar.tsx                ✅   US-05
│   │   ├── ConfirmDialog.tsx          ✅   US-04, réutilisé par US-08
│   │   ├── DeleteCollectionButton.tsx ✅   US-04
│   │   ├── CollectionBoard.tsx        ✅   modes cocher / édition, compteur, coche immédiate, recherche et filtre (US-06 à 09)
│   │   ├── ItemTile.tsx               ✅   carte : image, intitulé, état ; coche et bordure vertes si possédé (US-06, US-07)
│   │   ├── FilterTabs.tsx             ✅   Tous / Possédés / Manquants (US-09)
│   │   ├── SearchField.tsx            ✅   recherche sur l'intitulé (US-09)
│   │   ├── ZoomGrille.tsx             ✅   − / + : items par ligne, dans la barre du haut (US-14)
│   │   ├── ItemSortBar.tsx            ✅   « Trier : Ordre · Nom » (US-15)
│   │   ├── ItemEditTile.tsx           ✅   flèches haut/bas (US-10), renommer, supprimer (US-08)
│   │   ├── RenameItemSheet.tsx        ✅   US-08
│   │   ├── RenameCollectionSheet.tsx  ✅   US-12, en mode édition
│   │   ├── AddItemForm.tsx            ✅   US-08, en mode édition, photo ou adresse d'image facultative
│   │   ├── ItemImage.tsx              ✅   image d'un item (lazy) ou vignette neutre
│   │   ├── ScrapePreview.tsx          ✅   grille de l'aperçu, décor décoché, « déjà dans la collection »
│   │   ├── CompleterCollectionForm.tsx ✅  aperçu + ajout en fin de collection (US-13)
│   │   ├── PartageSheet.tsx           ✅   US-17 : bouton de l'accueil + panneau (créer, envoyer, arrêter)
│   │   ├── LienInvalide.tsx           ✅   US-17 : lien de partage inconnu ou arrêté
│   │   ├── ImportProgress.tsx         ✅   progression de la copie des images, lot par lot
│   │   ├── CopieImagesManquantes.tsx  ✅   reprise d'un import interrompu, en mode édition (#51)
│   │   └── RecadrageImages.tsx        ✅   recadrage des anciennes vignettes, en mode édition (#79)
│   ├── lib/
│   │   ├── auth/routes.ts             ✅   règles de redirection (+ routes.test.ts)
│   │   ├── ids.ts                     ✅   vérification des identifiants (+ ids.test.ts)
│   │   ├── items/title.ts             ✅   validation de l'intitulé, position suivante (+ title.test.ts)
│   │   ├── items/owned.ts             ✅   état possédé affiché, comptage (+ owned.test.ts)
│   │   ├── items/order.ts             ✅   échange avec le voisin à l'affichage (+ order.test.ts)
│   │   ├── items/filter.ts            ✅   filtre et recherche sans accents (+ filter.test.ts)
│   │   ├── items/grille.ts            ✅   items par ligne, cookie, classes de la grille (+ grille.test.ts)
│   │   ├── items/sort.ts              ✅   tri à l'affichage, ordre naturel, cookie (+ sort.test.ts)
│   │   ├── collections/cards.ts       ✅   collections + statistiques → cartes (+ cards.test.ts)
│   │   ├── collections/name.ts        ✅   validation du nom (+ name.test.ts)
│   │   ├── collections/messages.ts    ✅   « N items », question de confirmation (+ messages.test.ts)
│   │   ├── collections/sort.ts        ✅   tri, cookie, sens par défaut (+ sort.test.ts)
│   │   ├── collections/import.ts      ✅   vérification des éléments importés (+ import.test.ts)
│   │   ├── collections/partage.ts     ✅   jeton, lien, lecture de la collection partagée (+ partage.test.ts)
│   │   ├── collections/lots.ts        ✅   lots de 10, exécution limitée en parallèle (+ lots.test.ts)
│   │   ├── export.ts                  ✅   format de la sauvegarde donnees.json (+ export.test.ts)
│   │   ├── sauvegarde.ts              ✅   lecture vérifiée d'une sauvegarde, nom sans doublon (+ sauvegarde.test.ts)
│   │   ├── progress.ts                ✅   possédés / total / % (+ progress.test.ts)
│   │   ├── supabase/
│   │   │   ├── env.ts                 ✅   lecture vérifiée des variables (+ env.test.ts)
│   │   │   ├── server.ts              ✅
│   │   │   └── client.ts              ✅
│   │   ├── images/storage.ts          ✅   bucket, chemins versionnés (ADR-05), URL publique (+ storage.test.ts)
│   │   ├── images/thumbnail.ts        ✅   sharp → bords rognés, WebP 400 px (+ thumbnail.test.ts)
│   │   ├── images/resize.ts           ✅   réduction de la photo dans le navigateur (+ resize.test.ts)
│   │   ├── images/download.ts         ✅   téléchargement d'une image par URL (SSRF)
│   │   ├── images/enregistrer.ts      ✅   vignette → Storage → lien avec l'item (ajout et import)
│   │   └── scraper/
│   │       ├── index.ts               ✅   scrapePreview(url)
│   │       ├── fetchPage.ts           ✅   délai, taille max, encodage, HTTP accepté
│   │       ├── ssrf.ts                ✅   blocage des adresses privées, redirections, délai, taille
│   │       ├── extract.ts             ✅   <img> + recherche d'intitulé
│   │       ├── apercu.ts              ✅   adresses à essayer pour une image de l'aperçu (+ apercu.test.ts)
│   │       ├── messages.ts            ✅   messages d'échec de l'analyse (+ messages.test.ts)
│   │       ├── filters.ts             ✅   doublons retirés ; décor (logos, bannières, hors dossier principal) décoché
│   │       └── __tests__/
│   │           ├── extract.test.ts    ✅
│   │           ├── ssrf.test.ts       ✅
│   │           └── fixtures/          ✅   copies HTML des pages de référence (+ README : origine)
│   └── types/
│       └── database.ts                ✅   types générés (npm run db:types), vérifiés en CI
└── tests/
    └── e2e/
        ├── home.spec.ts               ✅
        ├── pwa.spec.ts                ✅   installation iPhone ; thème sombre (US-16)
        ├── login.spec.ts              ✅   US-01 (base Supabase locale)
        ├── collections.spec.ts        ✅   US-02, US-03 (vide, page inaccessible), US-04, US-05 (données créées par supabase-admin.ts)
        ├── collection-page.spec.ts    ✅   US-06, US-08 1/2
        ├── supabase-admin.ts          ✅   utilisateurs et données de test (base locale)
        ├── owned.spec.ts              ✅   US-07
        ├── edit.spec.ts               ✅   US-08 : modes, renommer, supprimer, photo, adresse refusée ; US-10 ; reprise (#51) ; US-12 ; US-13
        ├── search.spec.ts             ✅   US-09, US-14, US-15
        ├── export.spec.ts             ✅   sauvegarde (#53)
        ├── sauvegarde.spec.ts         ✅   import d'une sauvegarde (US-11)
        └── partage.spec.ts            ✅   partage en lecture seule (US-17)
```

## Règles de travail (SDLC)

- **Jamais de commit direct sur `main`.** Une issue → une branche → une pull request → revue par le propriétaire → merge.
- Branches : `feat/us-07-cocher-item`, `fix/…`, `docs/…`, `chore/…`.
- Commits au format **Conventional Commits** : `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.
- PR petites (idéalement < 300 lignes) ; la description suit `.github/pull_request_template.md` et cite les critères d'acceptation couverts.
- **Donner le lien de prévisualisation Vercel dès l'ouverture d'une PR** (message au propriétaire + « Comment tester ») : `https://mon-site-sdlc-git-<branche, / remplacés par ->-manadthan.vercel.app`.
- Toute fonctionnalité arrive avec ses tests. La CI doit être verte avant merge.
- Aucun secret dans le dépôt : `.env.local` est ignoré, `.env.example` liste les variables.
- Le schéma de base de données évolue **uniquement** par des fichiers dans `supabase/migrations/`. Une migration déjà appliquée en production ne se modifie jamais : on en ajoute une nouvelle.
- Le scraper est testé sur des fixtures HTML, jamais sur les sites en direct.
- Si une demande contredit SPEC.md ou DESIGN.md : le signaler et proposer de mettre le document à jour d'abord.

## Commandes (une fois l'étape 1 faite)

```
npm run dev        # serveur local
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run e2e        # Playwright
npm run db:start   # base Supabase locale (Docker)
npm run db:test    # tests pgTAP du schéma et de la RLS
npm run db:types   # régénérer src/types/database.ts après une migration
```

## Avancement

- [x] Phase 1 — Besoins : `docs/SPEC.md` v1.0 validée
- [x] Phase 2 — Conception : `docs/DESIGN.md` v1.0 + maquettes v1.0 validées
- [x] Phase 3 — Issues GitHub pour l'étape 1 du plan (#1 à #5)
- [x] Phase 4+ — Développement par étapes, revue, tests, déploiement
  - [x] Étape 1 — Socle (#1 à #5)
  - [x] Étape 2 — Supabase, schéma, migrations auto, connexion US-01 (#13 à #16)
  - [x] Étape 3 — Accueil : US-02 (#21), US-04 (#22), US-05 (#23), collection vide US-03 1/2 (#24)
  - [x] Étape 4 — Page collection : US-06 (#30), US-07 (#31), ajouter un item US-08 1/2 (#32)
  - [x] Étape 5 — Édition : US-08 2/2 (#33), US-10 (#34)
  - [x] Étape 6 — Import depuis une URL : US-03 2/2 (#35), image par URL d'US-08 (reprise de #33)
  - [x] Étape 7 — Recherche et filtres : US-09 (#36)
  - [x] Hors plan : images HTTP de l'aperçu (#49), reprise d'import (#51), sauvegarde (#53), import d'une sauvegarde US-11 (#55), vignettes (#57), couvertures (#59), partage en lecture seule US-17 (#75, révisé #77), vignettes rognées (#79)
- [x] Phase finale — Bilan : `docs/BILAN.md` v1.0

Chaque étape a son **milestone GitHub** (onglet Issues → Milestones) : une issue = un milestone.

## Prochaines étapes

1. ~~Valider DESIGN.md et les maquettes~~ (fait, #6).
2. Labels : `chore`, `docs`, `bug` créés ; `us` sera créé avec la première user story. **Protéger `main`** (réglage GitHub à faire par le propriétaire).
3. ~~Développer l'**étape 1 — Socle**~~ : issues #1 à #5 (fait).
4. ~~Créer le projet Supabase (région Paris) et renseigner les variables sur Vercel~~ (fait).
5. Étapes 1 à 7 terminées, plus les évolutions hors plan. Bilan fait (`docs/BILAN.md`). Suite possible : fixture dbzcollection.fr, pistes du bilan §5. Toute nouvelle issue est rattachée au milestone de son étape.
6. ~~Supprimer les images avec la collection (US-04)~~ : fait avec le bucket (#33).
