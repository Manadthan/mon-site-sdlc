# Maquettes

> Version 0.1 — 13/11/2026 — statut : à valider

Canevas interactif (bouton Play pour cliquer) :
https://claude.ai/artifact/QVQLtwz5n5KxaYgy5ajepQ

Format : iPhone 12 mini, 375 × 812.

| # | Écran | Route | User stories |
|---|---|---|---|
| 1 | Accueil : liste, tri (Nom / Date / % complété), suppression, « Nouvelle collection » | `/` | US-02, US-04, US-05 |
| 2 | Collection, mode cocher : grille 2 colonnes, recherche, filtre Tous / Possédés / Manquants, coche verte | `/collections/[id]` | US-06, US-07, US-09 |
| 3 | Collection, mode édition : flèches haut/bas, suppression, « Ajouter un item » | `/collections/[id]` | US-08, US-10 |
| 4 | Création : URL, nom, aperçu du scraping (décor pré-décoché), import | `/collections/new` | US-03 |

Non dessiné : écran de connexion (US-01) — deux champs et un bouton.

## Choix visuels

- Police Inter ; fond gris très clair `#f6f7f9`, cartes blanches.
- Bleu `#1d4ed8` pour les actions principales ; vert `#16a34a` réservé à « possédé ».
- Cibles tactiles ≥ 44 px ; le mode édition est séparé du mode cocher pour éviter les erreurs.
