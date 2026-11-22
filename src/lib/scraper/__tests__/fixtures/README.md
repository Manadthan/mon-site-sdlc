# Fixtures du scraper

Copies figées de pages, pour tester le scraper sans appeler les sites en direct (CLAUDE.md).

| Fichier | Origine |
|---|---|
| `kanzenshuu-film-comics.html` | Copie brute de https://www.kanzenshuu.com/manga/film-comics/ (site de référence, SPEC.md §5), enregistrée le 14/11/2026 |
| `glenat-dragon-ball-z.html` | Copie brute de https://www.glenat.com/glenat-manga/series-dragon-ball-z/, enregistrée le 22/11/2026 : site Next.js, couvertures seulement dans `__NEXT_DATA__` (#82) |
| `ferme-iso-8859-1.html` | Page **inventée** : vieux site en ISO-8859-1, mise en page en tableaux, images relatives |

La page de référence http://www.dbzcollection.fr (HTTP seulement) n'a pas pu être copiée depuis l'environnement de développement : à ajouter dès que possible.
