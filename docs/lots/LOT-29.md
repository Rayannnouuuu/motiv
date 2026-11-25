# Lot 29 — Recommencer le plan marathon

_25 nov. 2026. Demande : « Réinitialise le plan marathon »._

Le plan vit sur l'appareil : il se recommence depuis l'appli.

## Ce qui change

- **Plan › Marathon, en bas : « Recommencer le plan aujourd'hui »**, avec une confirmation qui dit le niveau de départ.
- Le plan repart de la **semaine 1 cette semaine**, au **niveau du moment** : moyenne des semaines courues parmi les 4 dernières, plus longue sortie des 30 derniers jours. Sans sortie récente, le niveau du profil est gardé.
- La course, les jours, les jours indisponibles et l'historique ne bougent pas.
- Le bouton n'apparaît pas si la course est trop proche pour un plan complet.

## Vérifié

- Tests : niveau recalculé sur les sorties récentes, niveau gardé sans sortie, semaine 1 cette semaine ; bouton → confirmation → enregistrement.
- Aucun changement de stockage (champs existants du profil).
