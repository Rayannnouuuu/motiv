# Lot 15 — Moi à plat

_30 oct. 2026. Deuxième lot de `docs/REFONTE-NAV.md`._

**État : validé et en ligne sur `/motiv/` (« Push », 30 oct.).**

## Ce qui change

- **Moi : 7 lignes, un seul niveau.** Profil sportif et santé · Exercices · Morceaux · Modèles de séance · Mes séances · Courses Strava · Sauvegarde et réglages.
- **La Bibliothèque disparaît** : ses 3 vues deviennent 3 pages directes, `/moi/exercices`, `/moi/morceaux`, `/moi/modeles`. Plus de sélecteur de vue, retour « Moi » en haut.
- **Adresses regroupées sous Moi** : `/moi/profil` (ancien `/marathon/profil`), `/moi/strava` (ancien `/strava`).
- **Réglages et sauvegarde** : déjà une seule page (`/moi/reglages`), la ligne garde son nom.
- **Anciennes adresses redirigées** : `/bibliotheque` (et `?vue=morceaux`, `?vue=modeles`), `/morceaux`, `/marathon/profil`, `/strava`.
- Les renvois dans l'appli (Aujourd'hui, plateau, log de sport, plan de course, guidée) pointent vers les nouvelles pages ; les textes disent « Moi › Modèles de séance ».

## Touchers

| Je veux…                       | Avant                                              | Après                                   |
| ------------------------------ | -------------------------------------------------- | --------------------------------------- |
| Changer le statut d'un morceau | 5 (Moi › Bibliothèque › Morceaux › ligne › statut) | **4** (Moi › Morceaux › ligne › statut) |
| Ouvrir les modèles de séance   | 4 (Moi › Bibliothèque › Modèles)                   | **2**                                   |
| Ouvrir le profil sportif       | 2                                                  | 2                                       |

## Pas fait (lot 16)

- Progrès sur une page, Mes séances et Avant / après dedans, un seul écran de saisie `/log`.
- « Mes séances » reste dans Moi jusque-là.

## Stockage

Aucun changement : seules des adresses bougent, les anciennes sont redirigées.
