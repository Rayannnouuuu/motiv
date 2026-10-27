# MOTIV — Audit guitare

_27 oct. 2026. Avant le lot G1 de `docs/GUITARE.md`. Rien n'est modifié : constat, écarts, questions._

## En bref

La refonte a déjà tout le **squelette technique** du module : séance avec chrono, fiche exo avec métronome et tempo proposé, historique « propre / pas propre », enregistrements, Progrès. Ce qui manque, c'est **le contenu débutant et la notion de compétence** :
- le parcours ;
- les accords ;
- les tests autres que le tempo (changements par minute, checklist, quiz) ;
- l'entretien espacé ;
- l'accordeur et les entraîneurs.

La base d'exercices actuelle vise surtout l'intermédiaire et le metal. Elle couvre une partie des niveaux 2 à 4 du parcours, presque rien des niveaux 0 et 1.

## Ce qui existe

| Brique | Où | État | Ce qu'on en garde pour le module |
| --- | --- | --- | --- |
| Base d'exercices | `src/content/exercises/*.json` | 100 exos, 8 familles (arpèges, bends, legato, palm mute, médiator, rythmique, gammes, sweep), difficulté 1 à 10, tempo de départ 46 à 84 BPM, tempo cible, petite tablature (`pattern`), source « legacy ». | Tablatures d'exercices (§6) et exos rattachés aux compétences (G1). |
| Conseils | `src/content/tips.ts` | 3 conseils par famille et par tranche (débutant, intermédiaire, avancé). Pas marqués « à relire ». | Base des conseils « pourquoi ça coince », à relire. |
| Catalogue de morceaux | `src/content/songCatalog.ts` | 45 titres rock et metal (titre, artiste, difficulté 1 à 10, accordage), sans tablature ni paroles. | Liste de départ pour la jouabilité, à rattacher aux compétences. |
| Répertoire | `domain/model.ts` (`Song`), `repertoire.ts`, `songSuggestion.ts` | Statuts à apprendre, en cours, maîtrisé, à entretenir. Morceau du jour, morceaux à entretenir. | Le `Song` du §8 l'étend (`skillIds`, `chordIds`, `bpm`). |
| Métronome | `features/exercise/Metronome.tsx`, `metronome.ts` | Moteur Web Audio programmé à l'avance. Accent sur le 1er temps. Subdivision tirée de la tablature de l'exo (noires, croches, triolets, doubles). Raccourcis record, cible et objectif, ±5. Le tempo joué remonte au log. Écoute du rythme au micro (lot 7). | Base du métronome avancé (G3). Manquent le mode progressif et le choix libre de la subdivision. |
| Écran séance | `features/practice/PracticePage.tsx`, `ExercisePage.tsx`, `ui/SessionBar.tsx` | Chrono (pause, reprise, séance d'hier). Plan du jour : 3 exos et des morceaux. Fiche exo en séance : tempo proposé et sa raison, case « propre », Valider → exo suivant. Fin → log avec les notes flow et envie. Toucher un exo lance le chrono, en sortir le met en pause. | Écran de la séance guidée (G2). Manquent les blocs minutés, le choix de la durée et les mesures autres que le tempo. |
| Plan du jour | `domain/dailyPlan.ts` | 3 exos : la suite de la dernière famille travaillée, plus 2 autres familles qui tournent. Stable sur la journée. | Remplacé par le générateur de séance (§5). |
| Moteur de tempo | `domain/targets.ts`, `history.ts` | Propre 3 séances de suite → +4 BPM, avec sa raison en une phrase. | Règle « tempo » du §4. Manque le −10 % après 2 séances non propres. |
| Plateau | `domain/plateau.ts` (lot 5) | Pas de record depuis **4** séances, ou envie en baisse 3 fois. Carte de 3 pistes. | À adapter : **6** séances et l'ordre du §4 pour les compétences guitare. |
| Progrès, cycles, niveaux | `domain/progress.ts`, `cycles.ts`, `levels.ts` | Courbes de tempo, mur des records. Objectif phare de cycle. Niveau XP guitare (600 XP par niveau). | La carte « Guitare niveau N » (§7) s'ajoute ici. |
| Preuves | `features/proofs/` (lot 5) | Enregistrement audio rattaché à un exo ou un morceau, comparaison « il y a 30 jours / dernière ». | Enregistreur du §6. Manquent la grille de 5 critères et les épreuves. |
| Stockage | `data/db.ts` | Dexie version 2. Profil avec des champs facultatifs, table `media`. Export avec ou sans médias. | La progression par compétence demandera une version 3 : export d'abord, migration testée sur une copie. |

## Ce qui manque pour le parcours

- **Niveau 0** : accordage (pas d'accordeur), son clair, posture (checklists), quiz de lecture (pas de quiz), chromatique 1-2-3-4 et coups vers le bas (pas d'exo dédié : « Alternate picking 1 » alterne 2 cordes).
- **Niveau 1** : aucun accord ouvert, pas de compteur « une minute », pas de motif de grattage. Les power chords existent (« Power chords alternés »), mais pas le riff à 2 doigts en noires.
- **Niveaux 2 à 4** : en partie couverts. Palm mute (10), médiator alterné (15), legato (10), bends (10), pentatonique mineure et majeure, gamme majeure. Manquent les accords de 7e, simplifiés et barrés, les notes du manche, l'oreille et les doubles croches au grattage.
- **Au-delà du niveau 5** : sweep (10), arpèges (15) et les difficultés 8 à 10 dépassent le parcours. Le catalogue aussi : Battery, Raining Blood, Nightmare.
- **Outils absents** : accordeur, diagrammes SVG, entraîneurs de manche et d'oreille, boucle d'impro, compteur, quiz.

## Écarts et conflits avec `GUITARE.md`

1. **Niveau de départ.** `REFONTE.md` dit « guitare : niveau intermédiaire ». `GUITARE.md` dit « je pars de zéro ». La base d'exos et le catalogue sont pensés pour l'intermédiaire.
2. **Micro.** Le §10 interdit l'analyse automatique du jeu, sauf l'accordeur et les bends. Le lot 7 écoute le rythme au micro et affiche « dans le temps ». Il ne valide rien, mais il juge le jeu.
3. **Deux « niveaux guitare ».** Le niveau XP du lot 4 et le niveau du parcours (0 à 5) seraient affichés côte à côte.
4. **Cycles et focus.** L'objectif phare de cycle (lot 4) et le focus de la semaine, avec 3 compétences en cours, se recouvrent.
5. **Durée de séance.** La règle « une séance compte à 30 min » (lot 4) heurte la protection débutant : 15 à 20 min les 3 premières semaines.
6. **Plateau** : 4 séances (lot 5, commun au sport) contre 6 (§4). Par défaut, je garderais 4 pour le sport et 6 pour les compétences guitare.

## Mes 5 questions

1. **Point de départ** : tu pars vraiment du niveau 0 ? Ou bien on fait un diagnostic qui valide d'avance ce que tu sais déjà, puisque `REFONTE.md` parle d'intermédiaire et que tu joues déjà des exos de niveau 1 et 2 ?
2. **Section 1** : matériel, temps et styles. Je propose : guitare électrique et ampli à lampes, 30 min par jour, 5 jours par semaine, rock et metal (d'après ton catalogue). Tu confirmes ou tu corriges ?
3. **Écoute du rythme au micro (lot 7)** : je la garde comme simple indicateur, jamais une validation, ou je la retire pour respecter le §10 ?
4. **Un seul niveau à l'écran** : le niveau du parcours (0 à 5) remplace le niveau XP guitare ? Et le focus de la semaine remplace l'objectif phare de cycle côté guitare ?
5. **Ancienne base** (100 exos, 45 morceaux) : je rattache aux compétences ce qui sert le parcours et je range le reste en « hors parcours », historique intact ? Ou tu veux tout garder visible ?

## Réponses (27 oct.)

1. Diagnostic qui valide d'avance.
2. Section 1 confirmée : guitare électrique + ampli à lampes, 30 min × 5 jours, rock et metal.
3. Écoute du rythme au micro retirée.
4. Le niveau guitare reste l'XP ; le niveau du parcours ne sert qu'à débloquer des exercices.
5. Ancienne base rattachée, le reste « hors parcours » ; et une grosse base nouvelle, plus poussée.
