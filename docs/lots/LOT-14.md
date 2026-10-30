# Lot 14 — Navigation : onglet Plan, Commencer complet

_30 oct. 2026. Premier lot de `docs/REFONTE-NAV.md` (règle : 3 touchers pour arriver à l'écran voulu)._

**État : validé et en ligne sur `/motiv/` (« Push », 30 oct.).**

## Ce qui change

- **Semaine devient « Plan »** (onglet et titre). Adresse `/plan`. Elle porte la semaine, les jours qui s'ouvrent, le focus, le bilan, et le plan de course.
- **Le plan de course vit sous Plan** : `/plan/course` (ancien `/marathon`). Le retour ramène à Plan, plus à Moi.
- **Sans course préparée**, Plan propose « Préparer une course » (avant : seulement dans Moi). Le bloc « Objectif daté » de Moi disparaît : une chose, un endroit.
- **Commencer** (feuille) contient aussi « Corriger le dernier log ». Aujourd'hui n'a plus que « Autre séance ou séance déjà faite » en bas de page.
- **Anciennes adresses redirigées** : `/semaine` → `/plan`, `/marathon` → `/plan/course` (en plus de `/morceaux`, `/reglages`).

## Touchers

| Je veux…                        | Avant                     | Après                                         |
| ------------------------------- | ------------------------- | --------------------------------------------- |
| Voir le plan marathon           | 2 (Moi › Objectif daté)   | **1** (onglet Plan) puis « Voir le plan » (2) |
| Préparer une course (sans plan) | 2 (Moi)                   | 2 (Plan)                                      |
| Corriger le dernier log         | lien en bas d'Aujourd'hui | Commencer › Corriger (2)                      |

## Pas fait (lots 15 et 16)

- Moi à plat (Bibliothèque éclatée en 3 lignes, Réglages + Sauvegarde fusionnés), profil sous `/moi/profil`.
- Progrès sur une page, Mes séances et Avant / après dedans, un seul écran `/log`.
- Le lien « Bilan » d'Aujourd'hui reste (rappel du dimanche : un raccourci, pas un second endroit).

## Stockage

Aucun changement. Seules des adresses changent, les anciennes sont redirigées.
