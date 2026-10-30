# Lot 13 — Fluidité d'utilisation

_30 oct. 2026. Suite de `docs/AUDIT-UX.md` (points 1, 2, 4, 5). Réponse à « La fluidité d'abord »._

**État : validé et en ligne sur `/motiv/` (« Push », 30 oct.).**

## Ce qui change

- **Toute surface qui montre quelque chose l'ouvre.**
  - **Semaine** : les 7 jours s'ouvrent sur une feuille (séances du jour, ajouter ou noter une séance ce jour-là, marquer indisponible).
  - **Aujourd'hui** : les tuiles « Guitare » et « Sport » de « Cette semaine » ouvrent la Semaine sur toute leur surface.
  - **Réglages** : « Check-in du matin » bascule en touchant toute la ligne (`SwitchRow`).
  - **Morceaux** : toute la ligne s'ouvre sur une feuille avec les 4 statuts en grands boutons et « Jouer ce morceau ». Fin des 45 menus de 20 px.
- **Au moins 44 px partout.** Onglets de Progrès, raccourcis du métronome, choix du questionnaire marathon, jours de la semaine, barres du haut, « Plus tard », « Voir la semaine », flèches Monter / Descendre (modèles de séance et ordre des séances), « Retirer ».
- **Saisie rapide** : appui long sur − / + (charge, reps, durée, tempo…) répète le pas (après 0,45 s, toutes les 0,11 s). Un simple toucher fait toujours un pas.

## Mesure (même script que l'audit, 19 écrans à 390 px)

| | Avant | Après |
| --- | --- | --- |
| Contrôles dont la zone touchable est < 44 px | 86 | **0** |
| Blocs qui montrent quelque chose sans rien ouvrir | 31 | 20 |
| Cartes avec un petit lien seulement | 12 | 9 |

Restent « morts » : texte pur (conseils, tablature, explications Strava, version), observations, courbes et records de Progrès, objectifs de la page Moi.

## Pas fait (volontairement)

- **Point 3** de l'audit : glisser-déposer, « Remplacer » et « Ajouter un exo » dans le plan du jour guitare et la séance de sport en cours. Gros chantier, son propre essai.
- **Point 6** : refonte des onglets de Progrès (8 sur 10 restent hors écran) et records qui ouvrent leur courbe.
- « Comme la dernière fois » en un toucher et pavé numérique direct sur la charge.
- **Le style pixel** : reste un essai à activer dans Réglages › Affichage › Style. Son lot ne démarre qu'après ton accord.

## Limites

Testé en navigateur à 390 px et par les tests (737), pas avec un vrai doigt sur iPhone. L'appui long : à confirmer à la main (pas de menu de copie, pas de saut).

## Stockage

Aucun changement : pas de migration, pas de nouveau champ.
