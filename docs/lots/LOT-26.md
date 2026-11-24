# Lot 26 — Deux espaces : Sport et Guitare

_24 nov. 2026. Demande : « sépare l'onglet guitare et l'onglet sport ; dès l'ouverture, deux boutons sur un écran noir : soit Sport, soit Guitare »._

**État : sur l'essai `/motiv/essai/`, en attente de validation. Pas sur `/motiv/`.**

## Ce qui change

- **À chaque ouverture de l'appli : un écran noir avec deux petites cartes en portrait, côte à côte : Sport (bleu) et Guitare (ambre).** Il remplace l'animation du logo sur fond vert. Il reste noir quel que soit le thème.
- **Chaque espace a ses onglets**, dans sa couleur :
  - **Sport** : Aujourd'hui · Plan · Progrès · Moi ;
  - **Guitare** : Aujourd'hui · **Parcours** (accords et gammes) · Progrès · Moi.
- **Chaque écran ne montre que son espace** :
  - Aujourd'hui : la carte de l'espace seulement (toujours dépliée), ses séances à rattraper, son plateau, son objectif de la semaine ; les morceaux à entretenir côté Guitare ;
  - Plan (Sport) : sorties et muscu seulement, objectifs sport ; la feuille d'un jour ne propose plus la guitare ;
  - Progrès : plus de choix « Guitare / Sport », les courbes, gains et records de l'espace ;
  - Moi : Sport → profil sportif, exercices de sport, modèles de séance, Strava, réglages ; Guitare → exercices de guitare, morceaux, réglages. Les objectifs du cycle : celui de l'espace ;
  - Commencer (bouton central, dans la couleur de l'espace) et sa feuille : seulement les séances de l'espace.
- **Passer d'un espace à l'autre : un toucher en haut à gauche** (« ⇄ Guitare » ou « ⇄ Sport »).
- Le choix tient tant que l'appli reste ouverte (un rechargement pour une nouvelle version le garde) ; l'appli fermée puis rouverte redemande.
- Les écrans de séance et de saisie (log, course, séance guidée, séance de muscu) s'ouvrent directement, sans passer par l'écran noir.

## Stockage

Aucun changement de données. L'espace choisi est gardé pour la durée de l'ouverture seulement (sur l'appareil).

## Pas fait

- La refonte du programme de sport (« pas assez puissant ») : deuxième chantier, après celui-ci (voir `docs/AUDIT-SPORT.md`).
- Le bilan du dimanche, le check-in du matin et les rappels de sauvegarde restent dans les deux espaces (ils concernent les deux).
- Le niveau global (pastille de Moi) reste commun aux deux espaces.
