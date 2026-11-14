# Suivi de collections

[![CI](https://github.com/Manadthan/mon-site-sdlc/actions/workflows/ci.yml/badge.svg)](https://github.com/Manadthan/mon-site-sdlc/actions/workflows/ci.yml)

Application web personnelle pour suivre mes collections (jeux, cartes, mangas, objets) depuis mon iPhone.

- Créer une collection à partir de l'URL d'une page qui la recense déjà (images et intitulés récupérés automatiquement).
- Cocher les objets possédés, réordonner, corriger les items.

**En ligne : https://mon-site-sdlc.vercel.app** (redéployé automatiquement à chaque merge sur `main`).

Projet construit avec Claude en suivant un cycle SDLC complet.

## Documentation

- [Spécifications](docs/SPEC.md)
- [Conception technique](docs/DESIGN.md)
- [Maquettes](docs/MAQUETTES.md)
- [Contexte pour Claude](CLAUDE.md)

## Stack

Next.js · TypeScript · Tailwind CSS · Supabase · Vercel · Vitest · Playwright

## Démarrer

Prérequis : Node.js 24 (voir `.nvmrc`).

```
npm install
npm run dev        # http://localhost:3000
npm run build      # build de production
npm run typecheck  # vérification des types
npm run lint       # ESLint
npm test           # tests unitaires (Vitest)
npm run e2e        # tests bout en bout (Playwright, écran iPhone 12 mini)
```

Tests e2e : ils utilisent une base Supabase **locale** (jamais la production) et un compte fictif créé
automatiquement. Première fois : `npx playwright install chromium`, `npm run db:start`, puis copier dans `.env.local`
les valeurs affichées par `npx supabase status` (`API_URL`, clé publishable, clé secrète → `E2E_SUPABASE_SECRET_KEY`).

### Base de données

Le schéma est défini **uniquement** par les fichiers de `supabase/migrations/`.
Avec Docker installé : `npm run db:start` lance une base Supabase locale, `npm run db:test` vérifie le schéma
et la Row Level Security, `npm run db:types` régénère `src/types/database.ts` après une migration.

**Déploiement** : à chaque merge sur `main` qui touche `supabase/migrations/`, le workflow
« Déploiement du schéma » applique les nouvelles migrations à la base de production (`supabase db push --remote`).
Il peut aussi être lancé à la main : onglet Actions → Déploiement du schéma → Run workflow.
Secrets GitHub requis : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
