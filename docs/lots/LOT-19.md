# Lot 19 — Parcours des gammes

_30 oct. 2026. Suite du lot 18 : « pareil pour les gammes », même moteur, même entrée (carte Guitare d'Aujourd'hui)._

**État : sur l'essai `/motiv/essai/`, en attente de validation. Pas sur `/motiv/`.**

## Ce qui change

- **Entrée** : la carte Guitare d'Aujourd'hui a maintenant deux lignes, « Parcours accords » et « Parcours gammes », chacune avec son étape en cours. **Elles restent visibles carte ouverte ou repliée** (au lot 18 elles étaient dans le contenu dépliable : invisibles si la carte Guitare était repliée ou n'était pas la première). Dans le parcours, un sélecteur Accords / Gammes passe de l'un à l'autre (`/parcours/accords`, `/parcours/gammes`).
- **19 étapes pour les 14 formes**, en 3 blocs :
  - **Pentatonique mineure de La** (10) : les 5 positions, les 4 **liaisons** entre positions voisines (glissade d'une position à l'autre, aller et retour), puis une **boucle** des 5 positions reliées.
  - **Autres pentatoniques et blues** (4) : Mi ouverte, Sol majeure, blues de La, blues de Mi.
  - **Gammes majeure et mineure** (5) : Sol (2e position), Do (7e), La mineure (5e), Sol et Mi en 3 notes par corde.
- **Chaque forme** : diagramme de manche (doigts numérotés, fondamentales entourées, cordes à vide au-dessus du sillet), consigne, conseils, 4 critères à cocher (montée-descente sans faute, doigtés, 60 BPM au métronome, régularité), réussi sur **2 jours différents**. Une liaison se valide en 1 jour.
- **Déblocage et « je le sais déjà »** comme pour les accords, chaque piste de son côté (valider une gamme ne touche pas aux accords).
- **Lien avec le parcours général** : « Pentatonique, position 1 », « positions 1 et 2 reliées », « 5 positions reliées » et « Gamme majeure, une position » passent à « validée » quand leurs étapes sont faites.

## Stockage

Rien de nouveau : la progression est celle du moteur (`profile.guitar.progress`), les étapes sont de nouvelles clés. Pas de migration, ça part dans l'export.

## Pas fait

- Le métronome sur l'écran (la case « 60 BPM » est déclarative : l'appli ne t'entend pas).
- Les liaisons entre les gammes hors pentatonique de La, et les autres tonalités.
- Les formes viennent de `scales.json` ; je ne les ai pas vérifiées à la guitare.
