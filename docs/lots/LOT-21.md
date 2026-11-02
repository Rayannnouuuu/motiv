# Lot 21 — Un guide pour les sorties ajoutées à la main

_2 nov. 2026. Retour d'usage : « la sortie longue se met en course libre, sans indication, alors que le fractionné a un guide et une allure ; plus j'avance dans le programme, plus ça doit devenir exigeant »._

**État : en ligne sur `/motiv/` (« Push », 2 nov.).**

## Cause

Une sortie ajoutée à la main (lot 20) n'existe pas au plan ce jour-là : l'écran de course ne trouvait aucune fiche et s'ouvrait en « course libre ». Même au plan, la sortie longue n'avait pas de blocs au minuteur (le fractionné en a).

## Ce qui change

- **Le guide d'une sortie ajoutée = celui du plan**, calculé pour la semaine du jour (`guideRun`) : nom, consigne, allure cible (celles de ton plan), blocs au minuteur.
- **Plus on avance dans le programme, plus c'est exigeant** (même règle que le plan) :
  - **fractionné** : 5 × 3 min rapide, puis 6 en phase spécifique (4 en semaine allégée) ;
  - **seuil** : 3 × 8 min, puis 3 × 10 min en spécifique (2 × 8 en semaine allégée) ;
  - **sortie longue** : facile en base ; **10 % à allure course** en fin de sortie en développement (1,5 à 4 km) ; **25 %** en spécifique (3 à 10 km) ; facile en semaine allégée ;
  - **allure course** : 1,5 km facile, le reste à allure course, 1,5 km de retour au calme.
  - La distance que tu choisis est gardée ; c'est la structure et l'intensité qui suivent la phase.
- **Sortie longue et allure course, au plan ou ajoutées : blocs au minuteur** (`runSegments`) : par exemple « Facile » puis « Allure course », durées calculées avec tes allures (facile, longue, allure marathon). En base : un seul bloc « Régulier et facile ».
- **L'allure du bloc en cours s'affiche** pendant la course (« 5:45–6:05 /km »), avec un bip à chaque changement de bloc.
- **Sans plan marathon** : la sortie a son nom et sa consigne (base), sans allures chiffrées ni blocs : sans chrono de référence, l'appli ne connaît pas ta vitesse.
- Aujourd'hui et la course utilisent le même guide.

## Stockage

Aucun changement.

## Pas fait

- Allures sans plan marathon (à partir de tes sorties passées).
- Adapter la sortie ajoutée à la douleur (le plan remplace déjà les séances dures par du vélo ou de la marche quand la progression est gelée ; une sortie ajoutée à la main n'est pas bridée).
- Le guide d'une course-marche ajoutée pour un coureur non débutant.
