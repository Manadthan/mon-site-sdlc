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

Première fois pour les tests e2e : `npx playwright install chromium`.
