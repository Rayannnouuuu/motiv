# Lot 23 — La séance de muscu « légère » est vraiment légère

_2 nov. 2026. Retour d'usage : « aujourd'hui on est censé être sur une séance légère en muscu, mais aucune différence »._

**État : en ligne sur `/motiv/` (« Push lot 23 », 5 nov.).**

## Cause

Le plan marque une séance de muscu « légère » (semaine allégée, première semaine d'affûtage), mais ce n'était qu'une **étiquette** : « (léger) » dans la carte d'Aujourd'hui. L'information n'était pas transmise à la séance de muscu, qui s'ouvrait avec les mêmes séries et les mêmes charges que d'habitude.

## Ce qui change

- **Une séance légère = la moitié des séries (au moins une), charges 10 % plus basses (arrondies à 2,5 kg).** Les reps visées ne changent pas.
  - Aujourd'hui : les exos de la carte Sport affichent déjà les séries et charges allégées (« 2×8 · 57,5 kg » au lieu de « 4×8 · 62,5 kg »).
  - La séance en direct : objectif de séries réduit, charge de départ allégée à chaque exo, et un message « Séance légère : la moitié des séries, charges −10 %, et des reps en réserve ».
  - « Léger » est transmis par tous les lancements : le bouton Commencer, le bouton central de la barre, la puce du jour dans Plan, et la séance composée de la carte Sport (avec ou sans la course à la fin).
- **La séance est enregistrée comme légère** (`isLight` : le champ existait déjà dans les données).
- **Elle n'entre pas dans la progression des charges** : la séance normale suivante repart de ta dernière séance normale, pas de charges allégées.

## Stockage

Aucun nouveau champ : `isLight` existe déjà dans les séances. Les séances enregistrées avant ce lot ne sont pas touchées (elles ne sont pas légères).

## Pas fait

- Une séance de muscu ajoutée à la main un jour de semaine allégée n'est pas allégée d'office (seule la séance du plan l'est).
- Le XP d'une séance légère n'est pas modifié.
- La part (50 % des séries, 10 % de charge) n'est pas réglable : dis-moi si c'est trop ou pas assez.
