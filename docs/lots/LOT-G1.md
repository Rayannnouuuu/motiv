# Lot G1 — Contenu et moteur guitare

_27 oct. 2026. Point de départ : `docs/GUITARE.md` (§3, §4, §8) et les réponses à l'audit (`docs/AUDIT-GUITARE.md`)._

**État : sur l'essai `/motiv/essai/`, en attente de validation.**

## Ce qui change

- **Base d'exercices** : 100 repris + **130 nouveaux**, soit 230. Quatre nouvelles familles (Chromatique, Grattage, Accords, Power chords), et des exercices plus poussés dans les familles existantes :
  - pentatoniques sur les 5 positions et reliées ;
  - séquences par 3, 4 et 6 ;
  - gammes majeure, mineure, blues, 3 notes par corde ;
  - trémolo, saut de cordes, picking intérieur et extérieur, rafales de vitesse ;
  - trilles, legato rapide ;
  - bends à l'unisson et d'un ton et demi ;
  - galop, chug, riffs thrash et syncopés ;
  - arpèges et triades ;
  - barrés en doubles croches.

  Difficultés 1 à 10, tempos jusqu'aux doubles croches rapides. Tablature de chaque exercice ; « p » pour les pull-offs.
- **Accords** (`src/content/guitar/chords.json`) : ouverts, septièmes, simplifiés, sus et add9, power chords, barrés formes de Mi et de La. Chacun est vérifié note par note.
- **Formes de gammes** (`scales.json`) :
  - les 5 positions de la pentatonique mineure ;
  - la pentatonique majeure et la gamme blues ;
  - les gammes majeure et mineure ;
  - les gammes à 3 notes par corde.

  Toutes sont calculées à partir des hauteurs des notes, puis vérifiées degré par degré.
- **Parcours** (`path.json`) : les niveaux 0 à 5 de `GUITARE.md` §3, 41 compétences. Chacune a son test, ses prérequis, ses exercices liés, son « pourquoi », son « comment » et ses conseils « pourquoi ça coince ». S'y ajoutent les épreuves de niveau, les quiz prévus et la grille de 5 critères.
- **Moteur** (`src/domain/guitar/engine.ts`) :
  - **états** : verrouillée, disponible, en cours (3 au plus), validée, à consolider ;
  - **validation** sur plusieurs jours différents ;
  - **tempo** : +4 bpm après 3 séances propres, −10 % après 2 séances pas propres ;
  - **entretien espacé** à 3, 7, 14, 30 puis 60 jours ;
  - **plateau** après 6 essais sans record, avec les 4 propositions dans l'ordre ;
  - **suggestion de la suivante** en équilibrant les piliers ;
  - **diagnostic d'entrée** : il valide d'avance ;
  - **épreuves de niveau** ;
  - **niveau du parcours**, qui ne sert qu'à débloquer des exercices ;
  - **jouabilité** des morceaux (80 % prêt à apprendre, 100 % à ta portée) ;
  - **protection du débutant** : 15 à 20 min les 3 premières semaines.

## Ancienne base

Rattachés à des compétences :
- médiator alterné : picking 1, 2, 3 ;
- palm mute : palmMuting 1, 2 ;
- riffs et power chords : rhythm 1, 2, 3, 11, 12 ;
- gammes : scales 1, 3, 11, 13 ;
- legato : 1, 2, 3 ;
- bends : 1, 2, 3.

Le reste est « hors parcours » (sweep, arpèges et difficultés hautes). Ces exercices sont gardés, avec leur historique. Leur niveau se déduit de la difficulté : difficulté 9-10 → niveau 5.

## Décisions (option la plus simple)

- **Données générées par deux scripts versionnés** (`scripts/gen-guitar.mjs`, `scripts/gen-guitar-path.mjs`), puis écrites en JSON dans le dépôt. Pour modifier un texte, on change le script et on le relance.
- **Tout est « à relire »** : exercices, textes des compétences et conseils (`review: true`).
- **Rien n'est stocké** dans ce lot. La progression par compétence sera enregistrée au lot G2, avec la séance guidée. Le plan du jour propose déjà les nouvelles familles.
- Si aucune compétence du niveau en cours ne peut démarrer, le moteur propose celles du niveau suivant, pour qu'une place ne reste pas vide.
- **Écoute du timing au micro** : gardée (traîne / presse), jamais la justesse des notes.

## Vérif

- 720 tests verts.
- **Simulation de 8 semaines** d'un débutant, 5 séances par semaine : 18 compétences validées, épreuves des niveaux 0 et 1 réussies, parcours au niveau 2, jamais plus de 3 compétences en cours, aucune validation en une seule séance, prérequis toujours validés avant.
- Captures 390 px, sombre et clair, dans `docs/lots/lotG1/` : la bibliothèque et 5 exercices nouveaux.
