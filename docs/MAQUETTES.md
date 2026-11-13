# Maquettes

> Version 1.0 — 13/11/2026 — statut : **validé**
>
> | Version | Date | Changements |
> |---|---|---|
> | 0.1 | 13/11/2026 | 4 écrans principaux |
> | 1.0 | 13/11/2026 | Ajout des états complémentaires (écrans 5 à 11) — issue #6 |

Canevas interactif (bouton Play pour cliquer) :
https://claude.ai/artifact/QVQLtwz5n5KxaYgy5ajepQ

Format : iPhone 12 mini, 375 × 812.

## Écrans principaux

| # | Écran | Route | User stories |
|---|---|---|---|
| 1 | Accueil : liste, tri (Nom / Date / % complété), suppression, « Nouvelle collection » | `/` | US-02, US-04, US-05 |
| 2 | Collection, mode cocher : grille 2 colonnes, recherche, filtre Tous / Possédés / Manquants, coche verte | `/collections/[id]` | US-06, US-07, US-09 |
| 3 | Collection, mode édition : flèches haut/bas, suppression, « Ajouter un item » | `/collections/[id]` | US-08, US-10 |
| 4 | Création : URL, nom, aperçu du scraping (décor pré-décoché), import | `/collections/new` | US-03 |

## États complémentaires

| # | État | Route | User stories |
|---|---|---|---|
| 5 | Connexion, avec message d'erreur qui ne dit pas quel champ est faux | `/login` | US-01 |
| 6 | Accueil sans collection : explication + « Créer ma première collection » | `/` | US-02 |
| 7 | Boîte de confirmation « Supprimer *X* et ses N items ? » (même composant pour supprimer un item) | `/`, `/collections/[id]` | US-04, US-08 |
| 8 | Ajouter un item (panneau du bas) : intitulé obligatoire, photo ou adresse d'image, ajout en fin de liste | `/collections/[id]` | US-08, US-10 |
| 9 | Renommer un item : ouvert en touchant l'intitulé en mode édition | `/collections/[id]` | US-08 |
| 10 | Import en cours : barre de progression par lots de 10, image en échec signalée | `/collections/new` | US-03 |
| 11 | Page inaccessible / rien trouvé : message clair + « Créer une collection vide » | `/collections/new` | US-03 |

## Choix visuels

- Police Inter ; fond gris très clair `#f6f7f9`, cartes blanches.
- Bleu `#1d4ed8` pour les actions principales ; vert `#16a34a` réservé à « possédé » ; rouge `#b42318` réservé aux suppressions et erreurs.
- Cibles tactiles ≥ 44 px ; champs de saisie en 16 px (évite le zoom automatique de Safari iOS).
- Le mode édition est séparé du mode cocher pour éviter les erreurs.
- Formulaires secondaires (ajout, renommage) dans un panneau qui monte du bas de l'écran, à portée de pouce.
