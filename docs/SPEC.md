# Spécifications — Suivi de collections

> Phase 1 du SDLC : **besoins**. Ce document décrit *quoi* construire, pas *comment*.
> Les choix techniques seront faits en phase 2 (conception).
>
> Version 1.0 — 13/11/2026 — statut : **validé**
>
> | Version | Date | Changements |
> |---|---|---|
> | 0.1 | 13/11/2026 | Premier brouillon |
> | 1.0 | 13/11/2026 | Questions ouvertes tranchées : doublons hors périmètre, réordonnancement par flèches (US-10), sections fusionnées |

## 1. Contexte et objectif

Application web personnelle pour suivre des collections (jeux, cartes, mangas, objets…).
Une collection est créée à partir d'une page web qui recense déjà ses éléments : l'application
récupère automatiquement les images et les intitulés, puis l'utilisateur coche ce qu'il possède.

Objectif secondaire : servir de projet d'apprentissage du travail avec Claude selon un cycle SDLC
(besoins → conception → issues → développement → revue → tests → déploiement → maintenance).

## 2. Utilisateurs et contexte d'usage

| Élément | Décision |
|---|---|
| Utilisateurs | Un seul : le propriétaire du site |
| Appareil principal | iPhone 12 mini (écran 5,4", ~375 px de large), Safari |
| Données | Stockées sur un serveur, accessibles depuis n'importe quel appareil |
| Accès | Protégé par un compte simple (identifiant + mot de passe) |

## 3. User stories et critères d'acceptation

Priorités : **M** = indispensable (MVP), **S** = souhaitable, **C** = bonus.

### US-01 — Se connecter (M)
*En tant que propriétaire, je me connecte pour que personne d'autre ne voie ou ne modifie mes collections.*
- [ ] Sans être connecté, toute page redirige vers l'écran de connexion.
- [ ] Un mauvais mot de passe affiche un message d'erreur, sans préciser lequel des deux champs est faux.
- [ ] La session reste ouverte après fermeture de Safari (pas besoin de se reconnecter à chaque visite).
- [ ] Un bouton permet de se déconnecter.

### US-02 — Voir mes collections (M)
*En tant que collectionneur, je vois la liste de mes collections sur la page d'accueil.*
- [ ] Chaque collection affiche : nom, image de couverture, compteur « possédés / total » (ex. 12/48) et %.
- [ ] Un état vide explique comment créer la première collection.
- [ ] La page est lisible et utilisable à une main sur un écran de 375 px.

### US-03 — Créer une collection depuis une URL (M)
*En tant que collectionneur, je colle l'URL d'une page de référence et l'application crée la collection.*
- [ ] Je saisis une URL et un nom (le nom est pré-rempli avec le titre de la page s'il est trouvé).
- [ ] L'application récupère les images et les intitulés associés, et affiche un **aperçu** avant d'enregistrer.
- [ ] Dans l'aperçu, je peux décocher les éléments indésirables (logos, bannières, icônes…).
- [ ] Les images retenues sont **copiées** sur notre serveur (la collection reste intacte si le site d'origine change).
- [ ] Si la page est inaccessible ou si rien n'est trouvé, un message clair s'affiche et je peux créer une collection vide.
- [ ] Une indication de progression s'affiche pendant la récupération.

### US-04 — Supprimer une collection (M)
- [ ] Une confirmation est demandée avant la suppression (« Supprimer *Cartes DBZ* et ses 48 items ? »).
- [ ] La suppression efface aussi les items et leurs images stockées.

### US-05 — Trier les collections (M)
- [ ] Tri disponible par **nom**, **date de création** et **% complété** (croissant / décroissant).
- [ ] Le dernier tri choisi est conservé à la visite suivante.

### US-06 — Voir les items d'une collection (M)
*En cliquant sur une collection, j'ouvre sa page avec les items sous forme de vignettes (style Vinted).*
- [ ] Grille de vignettes : 2 colonnes sur iPhone 12 mini, davantage sur grand écran.
- [ ] Les items s'affichent dans l'ordre de la collection (par défaut, l'ordre de la page source ; modifiable via US-10).
- [ ] Tous les items sont dans une seule liste, même si la page source les répartit en sections.
- [ ] Chaque vignette affiche l'image et l'intitulé (tronqué proprement s'il est long).
- [ ] Le compteur « possédés / total » est visible en haut de page.
- [ ] Les images se chargent progressivement (la page reste fluide avec 300+ items).

### US-07 — Marquer un item comme possédé (M)
- [ ] Un tap sur la vignette bascule possédé / non possédé.
- [ ] Un item possédé affiche une **coche verte dans l'angle haut droit** de la vignette.
- [ ] Le changement est enregistré immédiatement et persiste après rechargement.
- [ ] Le compteur se met à jour instantanément.
- [ ] Un tap accidentel est facile à annuler (un second tap suffit).

### US-08 — Corriger les items d'une collection (M)
*Le scraping n'est jamais parfait : je peux ajouter ou supprimer des items à la main.*
- [ ] Ajouter un item : intitulé obligatoire, image facultative (photo de l'iPhone ou URL d'image).
- [ ] Supprimer un item, avec confirmation.
- [ ] Modifier l'intitulé d'un item (S).
- [ ] Le mode « édition » est distinct du mode « cocher », pour éviter les suppressions accidentelles.

### US-10 — Réordonner les items (M)
*En tant que collectionneur, je change la position d'un item dans la collection.*
- [ ] En mode édition, chaque vignette affiche une flèche **haut** et une flèche **bas**.
- [ ] Un tap sur une flèche échange l'item avec son voisin précédent / suivant.
- [ ] La flèche haut est désactivée sur le premier item, la flèche bas sur le dernier.
- [ ] Le nouvel ordre est enregistré immédiatement et persiste après rechargement.
- [ ] Un item ajouté à la main (US-08) se place en fin de liste.

### US-09 — Rechercher et filtrer dans une collection (S)
- [ ] Champ de recherche sur l'intitulé.
- [ ] Filtre « Tous / Possédés / Manquants ».

## 4. Exigences non fonctionnelles

- **Mobile d'abord** : conçu pour 375 px, cibles tactiles ≥ 44 px, testé sur Safari iOS.
- **Écran d'accueil iPhone** (S) : installable comme une app (icône, plein écran).
- **Performance** : page d'une collection affichée en moins de 2 s en 4G.
- **Sécurité** : mots de passe hachés, HTTPS obligatoire, aucun secret dans le dépôt Git.
- **Sauvegarde** (S) : export de toutes les données (JSON + images).
- **Coût** : hébergement gratuit ou presque.

## 5. Le scraper : contraintes connues

Le scraping est la partie la plus risquée du projet.

- Il doit tourner **côté serveur** : un navigateur ne peut pas lire le contenu d'un autre site (règle CORS).
- Chaque site est structuré différemment. Stratégie retenue : un **extracteur générique**
  (images + texte voisin : `alt`, légende, titre, lien) et **correction manuelle** ensuite (US-03, US-08).
- Des adaptateurs spécifiques par site pourront être ajoutés plus tard si nécessaire.
- Sites de référence pour les tests :
  - `https://www.kanzenshuu.com/manga/film-comics/` — environ 24 items répartis en sections
    (films, téléfilms, festivals). Plusieurs items n'ont pas de titre explicite (seulement ISBN + description).
  - `http://www.dbzcollection.fr/2v2/cartes.php?idc=53&ids=243` — site en **HTTP uniquement**
    (redirige HTTPS → HTTP). Le scraper doit accepter le HTTP. Structure à analyser en phase 2.
- Respect des sites : usage personnel, une requête par création de collection, pas de récupération massive ;
  vérifier les conditions d'utilisation de chaque site.

## 6. Hors périmètre (pour l'instant)

- Plusieurs utilisateurs, partage de collections.
- Prix, valeur estimée, état des objets, doublons.
- Mise à jour automatique d'une collection quand la page source change.
- Application native iOS.

## 7. Décisions

1. **Doublons** (posséder 2 exemplaires) : hors périmètre.
2. **Ordre des items** : ordre de la page source par défaut, modifiable avec des flèches haut/bas (US-10).
3. **Sections de la page source** : ignorées, tous les items sont dans une seule liste.

## 8. Prochaine étape

**Phase 2 : conception** (stack, hébergement, modèle de données,
maquettes des 3 écrans : accueil, collection, création).
