# Bilan du projet — Suivi de collections

> Dernière phase du SDLC : **rétrospective**. Ce qui a été livré, ce qui a bien marché, ce qui a coincé,
> et ce qu'on en retient pour travailler avec Claude sur un prochain projet.
>
> Version 0.1 — 15/11/2026 — statut : **brouillon** (la partie « Ton point de vue » reste à compléter)

## 1. En chiffres

| | |
|---|---|
| Durée | 3 jours (13 → 15/11/2026), depuis un iPhone 12 mini |
| User stories | 11 livrées (US-01 à US-10 prévues, US-11 ajoutée en cours de route) |
| Étapes du plan | 7 sur 7, plus 6 évolutions et corrections hors plan |
| Pull requests mergées | 33, toutes passées par la CI et la revue du propriétaire |
| Tests automatiques | 170 unitaires (Vitest), 34 de bout en bout (Playwright, iPhone 12 mini, Chromium + WebKit), 35 sur la base (pgTAP) |
| Migrations de base | 5, toutes appliquées automatiquement en production au merge |
| Code applicatif | ≈ 3 800 lignes (hors tests) |

## 2. Ce qui a bien marché

- **Des besoins écrits avant le code.** SPEC.md (critères d'acceptation) et DESIGN.md (ADR) ont servi de
  boussole : chaque PR citait les critères couverts, et chaque écart (route `/api/scrape` remplacée par une
  action serveur, image par URL déplacée à l'étape 6, US-11) a d'abord été écrit dans le document.
- **Des étapes qui livrent un site utilisable.** Avancer « la collection vide » (étape 3) et « ajouter un
  item » (étape 4) a permis d'utiliser le site dès le 2ᵉ jour, sans attendre le scraper.
- **De petites PR avec un lien de prévisualisation.** Tester chaque changement sur l'iPhone avant le merge,
  sans rien installer, a rendu la revue possible depuis un téléphone.
- **La CI comme filet.** Lint, types, tests, build, tests de bout en bout sur WebKit (le moteur de Safari) et
  tests de la base : plusieurs bugs ont été attrapés avant d'atteindre la production (cookie refusé par
  Safari, types générés désynchronisés, conflit de ports en CI…).
- **La sécurité pensée dès la conception.** RLS sur chaque table, protection SSRF du scraper (vérifiée à
  chaque redirection et à la connexion), images toujours ré-encodées, aucun secret dans le dépôt.
- **Les retours d'usage.** Les meilleures améliorations sont venues de l'utilisation réelle : images HTTP
  invisibles dans l'aperçu, import interrompu, vignettes recadrées, couvertures vides.

## 3. Ce qui a coincé

| Difficulté | Conséquence | Parade retenue |
|---|---|---|
| La prévisualisation Vercel partage la base de production | Une PR avec migration ne se teste vraiment qu'après le merge (US-10, couverture) | Prévenir dans la PR ; piste : branches de base Supabase |
| Pas de base locale ni de navigateur réel dans l'environnement de Claude | Écrans jamais vus par Claude avant l'iPhone ; types générés écrits à la main puis vérifiés par la CI | La CI (base locale + WebKit) et les tests sur iPhone ont pris le relais |
| Réseau limité de l'environnement de Claude | Page dbzcollection.fr (HTTP seulement) impossible à copier en fixture | Test en direct sur la prévisualisation ; fixture toujours à ajouter |
| Le scraper ne peut pas être testé de bout en bout en CI | Le chemin « import réussi » repose sur des tests unitaires + un test manuel | Fixtures HTML + serveur local de test dans les tests unitaires |
| Réglages hors du dépôt (Vercel, Supabase, GitHub) | Plusieurs allers-retours pour trouver le bon écran depuis l'iPhone | Instructions pas à pas, au moment où le réglage devient nécessaire |

## 4. Ce qu'on retient pour travailler avec Claude

1. **Écrire le « quoi » avant le « comment »** : une spec avec critères d'acceptation rend les PR courtes à
   relire et donne une définition claire de « terminé ».
2. **Un fichier CLAUDE.md à jour** (règles, arborescence, avancement) permet de reprendre le travail d'une
   session à l'autre sans tout réexpliquer.
3. **Faire valider les choix importants, pas les détails** : une question à choix (doublons à l'import,
   images publiques…) au bon moment évite de défaire du travail.
4. **Toujours une issue, une branche, une PR, même pour un petit correctif** : l'historique raconte le projet.
5. **Tester sur l'appareil réel** : ce que la CI ne voit pas (rendu, téléchargement dans Fichiers, Safari)
   se découvre sur l'iPhone.
6. **Dire ce qui n'a pas été vérifié** : chaque PR précisait ce que les tests ne couvraient pas, pour que le
   test manuel porte sur le bon point.

## 5. Pistes pour la suite

- Base de prévisualisation séparée (branches Supabase) pour tester les migrations avant le merge.
- Fixture de dbzcollection.fr dans les tests du scraper.
- Vérifier que la protection de `main` est bien appliquée (dépôt privé : règle active seulement avec GitHub Pro).
- Si le projet grandit : suivi dans un outil comme Jira, en gardant une issue GitHub par PR.

## 6. Ton point de vue (à compléter)

- Qu'est-ce qui t'a le plus aidé pour apprendre à travailler avec Claude ?
- Qu'est-ce qui t'a ralenti ou agacé (trop de questions, messages trop longs, attentes de CI…) ?
- Que ferais-tu différemment sur ton prochain projet ?
