# Lot 18 — Parcours des accords

_30 oct. 2026. Demande : un parcours avec tous les accords à apprendre, un processus pour les débloquer un par un, les transitions aussi ; lancé depuis la carte Guitare d'Aujourd'hui. Les gammes suivent au lot 19 avec le même moteur._

**État : sur l'essai `/motiv/essai/`, en attente de validation. Pas sur `/motiv/`.**

## Ce qui change

- **Entrée** : sur Aujourd'hui, la carte Guitare (dépliée) a une ligne « Parcours accords » qui affiche l'étape en cours (« Forme · Mi m »). Elle ouvre `/parcours/accords`.
- **96 étapes pour les 46 accords**, en 6 blocs : Accords ouverts (8), Suspendus et ajoutés (4), Accords de 7e (8), Fa simplifié et variantes (4), Power chords (11), Barrés (11).
  - **Forme** de chaque accord : diagramme (doigts numérotés, cordes muettes ×, cordes à vide ○, barré en barre), consigne, conseils, liste de 4 critères à cocher.
  - **Transition** depuis un accord déjà su (le plus utile, choisi à la main) : le test « une minute », 20 changements pour les ouverts, 30 pour les power chords, 12 pour les barrés, réussi sur **2 jours différents**.
  - **Boucle** en fin de bloc : tous les accords du bloc enchaînés (15, 25 ou 10 par minute), sur 2 jours.
- **Déblocage** : une seule étape en cours ; la suivante s'ouvre quand elle est validée. Les autres sont « à venir ».
- **« Je le sais déjà »** : depuis l'étape en cours ou n'importe quelle étape à venir, valide celle-ci et toutes celles d'avant. Un entretien est prévu dans 3 jours.
- **Lien avec le parcours général** : « Accords ouverts », « Changements », « Accords de 7e et Ré m… » (`chords-2`), « Do–Fa simplifié », « Power chords », « Barré de Fa » et « Barrés » passent à « validée » quand toutes les étapes qui les couvrent le sont. Une étape déjà validée autrement n'est pas touchée.
- Les étapes du parcours ne comptent **ni parmi les 3 compétences en cours, ni dans les niveaux et épreuves, ni dans les suggestions de la séance guidée**.

## Stockage

Aucun nouveau champ : la progression est celle du moteur existant (`profile.guitar.progress`), les étapes sont de nouvelles clés. Pas de migration, ça part dans l'export. Les 41 compétences existantes ne bougent pas.

## Pas fait

- **Les gammes** (lot 19) : 14 formes, liaisons entre positions.
- Le métronome sur l'écran du parcours.
- Entretien espacé des accords du parcours dans la séance guidée (les étapes validées n'y apparaissent pas encore).
- Les formes d'accords sont celles de `chords.json` ; je ne les ai pas vérifiées à la guitare.
