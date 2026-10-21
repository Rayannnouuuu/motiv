# Lot 6 — Courses Strava

_21 oct. 2026. Demandé au lot 3b (« lier le marathon avec Strava »), reporté dans un lot à part._

**État : validé et en ligne sur `/motiv/` (« Push tout », 21 oct.).**

## Choix : import par fichier

La connexion directe à Strava demande un secret client que le navigateur ne peut pas garder, et Strava n'autorise pas l'échange de jetons depuis une page web. Il faudrait un petit serveur relais. L'option la plus simple : **lire un fichier exporté de Strava**, sur le téléphone. Rien n'est envoyé à Strava, pas de serveur, pas de compte à relier. Le relais reste possible plus tard si l'import manuel devient pénible.

## Ce qui change

- **Moi › Outils › Courses Strava** (`/strava`) :
  - **Toutes les sorties** : `activities.csv` de l'archive Strava (strava.com › Paramètres › Mon compte › Télécharger ou supprimer votre compte › Demander une archive).
  - **Une ou plusieurs sorties** : fichiers `.gpx` (strava.com › activité › « … » › Exporter GPX). Distance calculée sur les points GPS, durée du premier au dernier point.
  - **Aperçu** avant d'ajouter : courses à ajouter, déjà là, autres activités ignorées (vélo, marche…), les 10 plus récentes avec date, distance et allure.
- Les sorties importées sont des séances de course comme les autres : elles comptent dans la semaine, le plan marathon (adaptation), Progrès (km, allure, plus longue sortie) et Mes séances. Un meilleur chrono sur 5 km, 10 km ou semi devient la référence des allures.
- **Doublons** : chaque sortie garde son identifiant Strava (`externalId`, champ facultatif de la séance, pas de migration). Une sortie déjà là (même identifiant, ou course du même jour à 300 m près, saisie à la main) est ignorée : réimporter le même fichier n'ajoute rien.

## Décisions (option la plus simple)

- Seules les courses à pied (Run, Trail Run, Course à pied…) sont importées.
- Temps de déplacement plutôt que temps écoulé quand l'export le donne (allure plus juste).
- Dates de l'export lues en UTC, rangées au jour de Paris.
- Notes « notion du temps » et « envie » : 3 sur 5 (neutre) pour une sortie importée. L'XP suit la règle du lot 4 (plus longue sortie), rien pour les sorties d'avant le 19 oct.

## Captures

390 px, sombre et clair, dans `docs/lots/lot6/` (fichier de démo fabriqué) : l'écran, l'aperçu, après l'ajout, Progrès › Km par semaine, Mes séances.

## Vérif

673 tests verts, oxlint et Prettier propres. Import vérifié dans Chromium : 12 courses ajoutées, le vélo ignoré, un second import du même fichier n'ajoute rien.
