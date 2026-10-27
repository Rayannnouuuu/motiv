# MOTIV — Prompt du module Guitare

_27 oct. 2026 · @Rayan_

## 1. Contexte et objectif

Tu développes le module Guitare de MOTIV, dans le cadre fixé par `docs/REFONTE.md` : système visuel, séance unifiée, données locales, règles de travail. Je pars de zéro à la guitare électrique ; un diagnostic d'entrée valide d'avance ce que je sais déjà.

Le module doit m'emmener de la première note à l'autonomie. Être autonome, ici, c'est jouer les morceaux que j'aime, improviser sur une boucle et relever un riff simple à l'oreille.

- Matériel : guitare électrique + ampli à lampes (très peu de réglages).
- Temps : 30 min par jour, 5 jours par semaine.
- Styles visés : rock et metal. Ils orientent les exemples et le répertoire, pas le parcours de base.

Chaque jour, le module répond à une question : « Qu'est-ce que je travaille aujourd'hui pour progresser ? » Chaque semaine, à une autre : « Qu'est-ce que je sais faire de plus qu'il y a un mois ? »

**Vocabulaire du prompt**

- Propre : toutes les notes sonnent, sans frisé ni note étouffée, en place avec le clic.
- Noires : une note ou un coup par clic. Croches : deux par clic. Doubles croches : quatre par clic.

## Décisions après l'audit (27 oct.)

- **Diagnostic d'entrée** : il valide d'avance les compétences que je sais déjà faire ; le niveau 0 n'est pas imposé.
- **Micro** : l'écoute du rythme au métronome (lot 7) est **gardée**. Elle dit seulement si je suis dans le temps (traîne, presse), jamais si la note est juste, et elle ne valide rien. Le micro sert aussi à l'accordeur et aux bends.
- **Niveaux** : le niveau guitare reste celui de l'XP (lot 4). Le niveau du parcours (0 à 5) ne sert qu'à **débloquer de nouveaux exercices**, rien de plus : pas de célébration, pas de carte de niveau à part.
- **Ancienne base** : les exercices utiles au parcours sont rattachés aux compétences, les autres restent « hors parcours », historique intact.
- **Base d'exercices** : en plus, une grosse base nouvelle, plus poussée (des premiers gestes jusqu'au jeu rapide et technique), marquée « à relire ».

## 2. Les principes du système

Toute décision du module découle de ces six principes. En cas de doute, reviens-y.

1. **Tout est une compétence mesurable.** Pas de « je connais mes accords ». Une compétence a un test chiffré : un tempo propre, un nombre de changements par minute, un score de quiz.
2. **Trois compétences en cours au maximum.** Une nouvelle ne démarre que quand une place se libère. C'est la règle contre l'éparpillement.
3. **Lent et propre d'abord, plus vite ensuite.** Un test n'est validé que s'il est réussi sur plusieurs jours différents, jamais dans une seule séance.
4. **Ce qui est acquis revient.** Une compétence validée repasse en entretien à intervalles croissants, comme des cartes de révision.
5. **Le morceau est le moteur.** Chaque compétence sert des morceaux que j'ai envie de jouer. L'appli me montre lesquels de ma liste deviennent jouables.
6. **La preuve, c'est l'enregistrement.** Chaque niveau se termine par un enregistrement, réécouté avec une grille simple et comparé au précédent.

## 3. Le parcours, niveau par niveau

Le parcours compte six niveaux, du premier son à l'autonomie. Chaque compétence a un test, chaque niveau se termine par une épreuve. Écris ce parcours sous forme de données (JSON) modifiables, pas en dur dans le code.

Les durées sont des repères pour 30 min par jour, 5 jours par semaine. L'appli n'impose aucune date.

### Niveau 0 — Prise en main (repère : 2 semaines)

- Accorder sa guitare : les 6 cordes justes à ±5 cents avec l'accordeur intégré, en moins de 2 min.
- Régler un son clair : checklist (volume, gain bas, égaliseur au milieu).
- Posture et médiator : checklist (guitare stable, poignet droit détendu, médiator entre pouce et index, pouce gauche derrière le manche).
- Lire les cordes, une tablature, un diagramme d'accord : quiz réussi à 100 %.
- Chromatique 1-2-3-4 sur une corde : 60 BPM en noires, propre.
- Coups vers le bas réguliers sur cordes à vide : 60 BPM en noires, 1 minute sans décrocher.

**Épreuve** : accorder seul, puis la chromatique à 60 BPM sur les 6 cordes.

### Niveau 1 — Premiers accords, premier riff (repère : 6 à 8 semaines)

- Accords ouverts Mi m, La m, Mi, La, Ré, Sol, Do : pour chacun, chaque corde jouée une à une sonne (checklist).
- Changements d'accords, méthode « une minute » : 30 changements propres en 60 s sur Mi m–La m, La–Ré, Sol–Do et Ré–Sol.
- Rythme en croches ↓↑ : 70 BPM, 1 minute régulière.
- Premier motif de rythme ↓ ↓↑ ↑↓↑ : 70 BPM, en changeant d'accord à chaque mesure.
- Power chords à deux doigts sur la corde de Mi grave : un riff de 4 power chords en noires à 80 BPM.
- Chromatique 1-2-3-4 : 60 BPM en croches.
- Répertoire : un morceau à 2 ou 3 accords joué en entier.

**Épreuve** : ce morceau enregistré du début à la fin, sans arrêt.

### Niveau 2 — Rythme rock et main droite (repère : 2 à 3 mois)

- Power chords sur les cordes de Mi et de La : un riff avec déplacements, en croches à 90 BPM.
- Palm mute : rythme rock en croches étouffées, 90 BPM, 1 minute.
- Étouffer avec la main gauche, coups fantômes et accents : un motif à 80 BPM.
- Accords Ré m, Mi 7, La 7 et Fa simplifié : checklist, puis 30 changements par minute sur Do–Fa simplifié.
- Aller-retour au médiator : chromatique en croches à 80 BPM, en alterné strict.
- Notes des cordes de Mi grave et de La, cases 0 à 12 : quiz à 90 %, moins de 3 s par note.
- Oreille : accord majeur ou mineur : 80 % sur 20 questions.
- Répertoire : deux morceaux, dont un riff en power chords.

**Épreuve** : le riff en power chords avec palm mute, enregistré à au moins 80 % de son tempo d'origine.

### Niveau 3 — Premiers solos (repère : 3 mois)

- Pentatonique mineure, position 1 : montée et descente en croches à 80 BPM, en aller-retour.
- Hammer-on et pull-off : exercice dédié en croches à 70 BPM.
- Slides et vibrato : checklist sur un enregistrement.
- Bends d'un demi-ton et d'un ton : note d'arrivée juste à ±15 cents, 8 fois sur 10 (contrôle par l'accordeur).
- Barré Fa, forme de Mi : les 6 cordes sonnent, puis 20 changements par minute sur Do–Fa.
- Théorie : intervalles et construction d'un accord (1-3-5) : quiz à 90 %.
- Improvisation : 2 minutes sur une boucle en La m, avec la pentatonique position 1, enregistrées et notées avec la grille.
- Répertoire : un riff mélodique ou un solo simple.

**Épreuve** : l'impro de 2 minutes et le solo du niveau, enregistrés.

### Niveau 4 — Barrés et manche (repère : 3 à 4 mois)

- Barrés majeurs et mineurs, formes de Mi et de La, partout sur le manche : 25 changements par minute entre deux barrés.
- Pentatonique, positions 1 et 2 reliées : croches à 90 BPM.
- Gamme majeure, une position : croches à 80 BPM.
- Notes sur toutes les cordes : quiz à 90 %, moins de 3 s par note.
- Rythme en doubles croches : 70 BPM, 1 minute.
- Oreille : relever une mélodie de 4 à 8 notes : réussi sans aide (checklist).
- Répertoire : un morceau avec barrés.

**Épreuve** : le morceau avec barrés enregistré, et une mélodie relevée à l'oreille.

### Niveau 5 — Autonomie (ouvert)

- Pentatonique dans les 5 positions, reliées sur tout le manche.
- Vitesse : pentatonique en croches à 120 BPM.
- Relever à l'oreille un riff ou un couplet entier.
- Composer : un riff, un couplet et un refrain, enregistrés.
- Objectifs libres : à partir d'ici, je crée mes propres compétences dans l'appli, avec le même format de test.

## 4. Le moteur de progression

Le moteur décide quoi travailler, quand valider et quand revenir sur un acquis. Code-le dans `domain/`, sans dépendance à l'interface, avec un test unitaire par règle.

**États d'une compétence** : verrouillée → disponible (prérequis validés) → en cours (choisie, 3 au maximum) → validée → en entretien.

**Validation**

- Le test doit être réussi sur le nombre de séances demandé, 2 ou 3 par défaut, à des jours différents.
- Tempo : propre sur 3 séances, l'appli propose +4 BPM (règle de la refonte). Deux séances non propres de suite, elle propose −10 % pour revenir là où c'est propre.
- Changements par minute : je compte avec un gros bouton pendant 60 s.
- Quiz : score et temps moyen calculés par l'appli.
- Checklist et enregistrement : auto-évaluation, avec la grille de la section 6.

**Entretien espacé.** Une compétence validée revient dans une séance après 3, 7, 14, 30 puis 60 jours, sous forme de test court. Réussi, elle passe à l'intervalle suivant. Raté, elle revient à 3 jours et passe en « à consolider », sans perdre sa validation.

**Choix de la prochaine compétence.** Quand une place se libère, l'appli propose une compétence disponible du niveau en cours. Elle équilibre les piliers : main gauche, main droite, technique, manche, oreille, expression, répertoire. Je peux toujours choisir une autre compétence disponible.

**Plateau.** Il y a plateau quand une compétence ne progresse plus depuis 6 séances. L'appli propose alors, dans cet ordre :

1. ralentir de 20 % ;
2. découper le passage difficile ;
3. changer de variante d'exercice ;
4. vérifier la posture avec une vidéo de 30 s.

Chaque compétence a aussi 2 ou 3 conseils « pourquoi ça coince ». Exemple : une note qui frise, c'est souvent un doigt trop loin de la frette.

**Épreuve de niveau.** Elle se débloque quand toutes les compétences du niveau sont validées. Réussie, elle fait monter le niveau guitare d'un cran, avec une célébration et l'écoute de l'enregistrement du niveau précédent.

**Diagnostic d'entrée.** Au premier lancement, je choisis « je débute » pour partir du niveau 0. Ou je passe les tests d'une compétence pour la valider d'avance.

**Protection du débutant**

- Les 3 premières semaines, l'appli propose 15 à 20 min par séance, ou deux fois 10 min dans la journée.
- Elle prévient que la douleur au bout des doigts est normale au début.
- Une douleur au poignet ou à l'avant-bras ne l'est pas. L'appli conseille alors d'arrêter et de vérifier la posture.

## 5. La séance guidée

Je choisis une durée, et l'appli construit la séance à partir de mes compétences en cours, des entretiens dus et de mon morceau en cours. Elle s'affiche dans l'écran séance de la refonte : blocs, carte de mesure, essais.

| Bloc | Contenu | 15 min | 30 min | 45 min | 60 min |
| --- | --- | --- | --- | --- | --- |
| Échauffement | Chromatique à 80 % de mon record propre | 2 | 4 | 5 | 6 |
| Focus | Compétence focus de la semaine | 6 | 10 | 15 | 20 |
| Entretien | Compétences dues, sinon une autre compétence en cours | 2 | 5 | 7 | 10 |
| Répertoire | Une section du morceau en cours | 5 | 8 | 12 | 16 |
| Bonus | Oreille, manche, impro ou composition, en rotation | — | 3 | 6 | 8 |

- **Objectif de séance** : au début, l'appli affiche un seul objectif chiffré. Exemple : « Sol–Do : passer de 22 à 25 changements ».
- **Pendant la séance** : chaque bloc a son minuteur et ses outils déjà réglés (métronome au bon tempo, compteur, diagramme).
- **En fin de séance** : objectif atteint ou non, les deux notes de 1 à 5 de la refonte, et une ligne « ce qui coince ». Records et validations s'affichent tout de suite.
- **Focus de la semaine** : choisi le lundi parmi les compétences en cours et affiché dans l'onglet Semaine.
- **Sans guitare** : les quiz de manche et d'oreille se lancent aussi en 3 min depuis Aujourd'hui, guitare rangée. Ils comptent pour la validation.

## 6. Outils intégrés

Tous les outils marchent hors ligne, avec Web Audio, et s'ouvrent depuis la barre de séance.

- **Accordeur** : micro du téléphone, détection de hauteur par autocorrélation, écart affiché en cents. Il fonctionne avec l'ampli près du téléphone. Il sert aussi à contrôler la justesse des bends.
- **Métronome avancé** : sur le moteur de la refonte, avec accent sur le premier temps et subdivisions (noires, croches, triolets, doubles croches). Mode progressif en option : +2 BPM toutes les 8 mesures jusqu'à la cible.
- **Compteur « une minute »** : 60 s et un gros bouton pour compter chaque changement propre. Le record s'affiche.
- **Diagrammes** : accords et gammes dessinés en SVG à partir des données (cases, doigtés, barré). Aucune image.
- **Tablatures d'exercices** : une tablature courte affichée à partir de la base d'exercices. Pour les morceaux, jamais de tablature.
- **Entraîneur de manche** : une case s'allume et je donne la note, ou une note s'affiche et je touche la case. Score et temps moyen.
- **Entraîneur d'oreille** : sons de guitare synthétisés (algorithme Karplus-Strong). D'abord majeur ou mineur, puis les intervalles, puis de courtes mélodies.
- **Boucle d'impro** : batterie simple synthétisée (grosse caisse, caisse claire, charleston) et une basse sur la tonique, au tempo et dans la tonalité choisis.
- **Enregistreur et grille** : chaque enregistrement est relié à une compétence ou un morceau. La grille note 5 critères de 1 à 3 : rythme régulier, notes nettes, transitions sans trou, son et nuances, aisance.

## 7. Écrans dans MOTIV

Le module n'ajoute aucun onglet. Il se répartit dans les 4 onglets existants et suit le système visuel de la refonte : accent ambre, gabarit d'onglet, gabarit de séance.

- **Aujourd'hui** : la séance guitare du jour en carte, avec sa durée et son objectif. Plus un raccourci vers un quiz de 3 min.
- **Semaine** : le focus guitare de la semaine et les entretiens prévus, jour par jour.
- **Progrès** : une carte « Guitare niveau 1 · 5 compétences sur 9 », qui ouvre l'écran Parcours.
- **Écran Parcours** (un écran, pas un onglet) : les niveaux en liste verticale. Pour chaque compétence : son état, ma mesure actuelle et la cible. L'épreuve du niveau en bas.
- **Fiche compétence** : pourquoi elle compte, comment la travailler, le test, la courbe de mes essais, les conseils « pourquoi ça coince », les exercices liés.
- **Moi › Bibliothèque** : accords, gammes, exercices et morceaux.
- **Morceaux** : je saisis le titre, l'artiste et les compétences que le morceau demande (accords, power chords, palm mute…). L'appli en déduit la jouabilité. À 80 % des compétences validées, le morceau est « prêt à apprendre ». À 100 %, il est « à ta portée ».

## 8. Modèle de données

Ce modèle étend celui de la refonte. Le parcours, les accords et les gammes sont des fichiers de données versionnés dans le dépôt. Ma progression, elle, vit dans IndexedDB, sur l'appareil.

```ts
type Pillar = 'left_hand' | 'right_hand' | 'technique' | 'fretboard'
            | 'ear' | 'expression' | 'repertoire' | 'creativity'

Skill { id, level: 0-5, pillar, name, why, howTo,
        prerequisites: SkillId[], validation: Validation,
        exerciseIds: ExerciseId[], tips: string[], custom?: boolean }

Validation =
  | { kind: 'tempo', exerciseId, bpm, subdivision: 'quarter' | 'eighth' | 'triplet' | 'sixteenth',
      sessions: 3 }
  | { kind: 'changes_per_minute', chords: [ChordId, ChordId][], target, sessions: 2 }
  | { kind: 'checklist', items: string[], sessions: 2 }
  | { kind: 'quiz', quizId, minScore, maxSecondsPerItem?, sessions: 2 }
  | { kind: 'pitch', targetCents, hitsOutOf: [8, 10] }      // bends
  | { kind: 'recording', rubricId, minAverage }

SkillProgress { skillId, status: 'locked' | 'available' | 'learning' | 'validated',
                fragile: boolean, startedAt?, validatedAt?, best?,
                attempts: Attempt[],
                review?: { dueAt, intervalDays, lapses } }

Attempt { date, sessionId, value, clean?, passed }

Exercise { id, name, tab?, defaultBpm, skillIds: SkillId[], source: 'legacy' | 'new' }

Chord { id, name, kind: 'open' | 'power' | 'barre' | 'seventh' | 'simplified',
        frets: (number | 'x')[6], fingers: (0 | 1 | 2 | 3 | 4)[6],
        baseFret, barre?: { fret, fromString, toString } }

ScaleShape { id, name, position, notes: { string, fret, finger, degree }[] }

Song { id, title, artist, notes?, skillIds: SkillId[], chordIds: ChordId[],
       bpm?, status }                                       // jouabilité calculée, non stockée

LevelExam { level, requiredSkillIds, recordingIds: RecordingId[], passedAt? }

Rubric { id, criteria: { label, min: 1, max: 3 }[] }

QuizResult { quizId, date, score, avgSeconds }

WeekFocus { weekStart, skillId }
```

## 9. Lots de livraison

Les règles de travail de `docs/REFONTE.md` s'appliquent : un lot à la fois, une démo, puis tu attends ma validation.

**Avant G1, l'audit guitare.** Produis `docs/AUDIT-GUITARE.md` sur ce qui existe déjà : base d'exercices, morceaux, métronome, écran séance. Termine par tes 5 questions les plus importantes, puis arrête-toi.

### Lot G1 — Contenu et moteur

- Le parcours des niveaux 0 à 5 en JSON, avec tests, prérequis et conseils.
- Les données des accords (ouverts, power chords, septièmes, barrés, simplifiés) et des formes de gammes.
- Chaque exercice de mon ancienne base rattaché à une ou plusieurs compétences. Pour les compétences sans exercice, tu proposes des exercices que je valide.
- Le moteur de la section 4 dans `domain/` : états, déblocage, validation, entretien espacé, plateaux, jouabilité des morceaux.

Terminé quand un test automatisé simule 8 semaines de séances d'un débutant et que le moteur se comporte comme décrit.

### Lot G2 — Séance guidée

- Le générateur de séance selon la durée (section 5), avec l'objectif de séance et le focus de la semaine.
- Les mesures dans l'écran séance : tempo propre, compteur une minute, checklist, quiz.
- La progression de tempo et la fin de séance avec les validations.

Terminé quand je fais une séance de 30 min entièrement guidée, du choix de la durée jusqu'au bilan.

### Lot G3 — Outils

- Accordeur, métronome avancé, diagrammes SVG, tablatures d'exercices.
- Entraîneurs de manche et d'oreille, boucle d'impro.

Terminé quand chaque outil marche hors ligne sur mon téléphone, et que l'accordeur donne la même note qu'un accordeur classique, à ±5 cents.

### Lot G4 — Parcours visible

- Écran Parcours, fiche compétence, carte guitare dans Progrès.
- Épreuves de niveau, enregistreur et grille, comparaison avec l'enregistrement précédent.
- Morceaux et jouabilité. Propose-moi 3 morceaux connus par niveau, adaptés à mes styles (titre et artiste uniquement). Je valide avant tout ajout.
- Diagnostic d'entrée.

Terminé quand je vois en 10 secondes mon niveau, mes compétences en cours et le prochain morceau à ma portée.

## 10. Hors périmètre et limites

- Pas d'analyse automatique de mon jeu au micro, sauf l'accordeur, le contrôle des bends et l'écoute du timing au métronome (traîne / presse, jamais la justesse des notes). « Propre » reste mon jugement, appuyé sur les enregistrements. N'affiche jamais une validation comme si l'appli l'avait entendue.
- Pas de tablatures ni de paroles de morceaux, pas de fichiers audio de morceaux.
- Pas de vidéos de cours intégrées. Si un lien externe m'aide, je l'ajoute moi-même à la fiche compétence.
- Pas de comptes ni de cloud, comme dans la refonte. Enregistrements et progression restent sur l'appareil et partent dans l'export JSON.
- Pas de contenu pédagogique inventé présenté comme sûr. Pour les conseils et les exercices que tu ajoutes, reste sur des pratiques classiques et marque-les « à relire » dans les données, pour que je les valide.
