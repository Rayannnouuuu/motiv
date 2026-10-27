// Le parcours guitare (GUITARE.md §3) en données : niveaux, compétences, tests, prérequis, exercices liés.
// Les textes « pourquoi », « comment » et « ça coince » sont des pratiques classiques, marqués à relire.
// Usage : node scripts/gen-guitar-path.mjs  (réécrit src/content/guitar/path.json)
import { writeFileSync } from 'node:fs'

const tempo = (exerciseId, bpm, subdivision) => ({ kind: 'tempo', exerciseId, bpm, subdivision, sessions: 3 })
const changes = (chords, target) => ({ kind: 'changes_per_minute', chords, target, sessions: 2 })
const checklist = (items) => ({ kind: 'checklist', items, sessions: 2 })
const quiz = (quizId, minScore, maxSecondsPerItem) => ({ kind: 'quiz', quizId, minScore, ...(maxSecondsPerItem ? { maxSecondsPerItem } : {}), sessions: 2 })
const recording = (minAverage = 2) => ({ kind: 'recording', rubricId: 'grille-5', minAverage })

const skills = []
const skill = (level, id, pillar, name, validation, { pre = [], ex = [], why, how, tips }) =>
  skills.push({ id, level, pillar, name, why, howTo: how, prerequisites: pre, validation, exerciseIds: ex, tips, review: true })

// ——— Niveau 0 — Prise en main ———
skill(0, 'tune', 'ear', 'Accorder sa guitare', checklist(['Les 6 cordes justes à ±5 cents avec l’accordeur', 'En moins de 2 minutes, sans aide']), {
  why: 'Une guitare fausse rend tout faux, même bien joué : c’est le premier geste de chaque séance.',
  how: 'Corde par corde, du Mi grave au Mi aigu. Monte toujours vers la note (desserre un peu, puis remonte) : la corde tient mieux.',
  tips: [
    'La note bouge encore ? Laisse la corde se stabiliser quelques secondes après chaque tour de mécanique.',
    'Une corde neuve se détend vite : réaccorde deux ou trois fois les premiers jours.',
  ],
})
skill(
  0,
  'clean-tone',
  'expression',
  'Régler un son clair',
  checklist(['Volume réglé à un niveau confortable', 'Gain bas : pas de saturation', 'Égaliseur (ou tonalité) au milieu']),
  {
    why: 'Un son clair montre chaque défaut : c’est le meilleur son pour apprendre propre.',
    how: 'Gain au plus bas, tonalité au milieu, puis monte le volume jusqu’à entendre chaque corde nettement.',
    tips: ['Ça grésille sans gain ? Vérifie le jack et le volume de la guitare à fond.', 'Ampli à lampes : laisse-le chauffer une minute avant de jouer.'],
  },
)
skill(
  0,
  'posture',
  'technique',
  'Posture et médiator',
  checklist([
    'Guitare stable, sans la tenir avec la main gauche',
    'Poignet droit détendu',
    'Médiator entre le pouce et le côté de l’index',
    'Pouce gauche derrière le manche',
  ]),
  {
    why: 'Une mauvaise posture fatigue, fait mal et bloque la vitesse plus tard : elle se corrige mieux tout de suite.',
    how: 'Assis, la guitare sur la jambe droite, le manche un peu relevé. Filme-toi 30 secondes et compare à la liste.',
    tips: [
      'Douleur au poignet ou à l’avant-bras : arrête, ce n’est pas normal. Vérifie le poignet gauche (pas cassé à angle droit).',
      'Le médiator tourne ? Serre juste un peu plus, et laisse dépasser 2 à 3 mm seulement.',
    ],
  },
)
skill(0, 'reading', 'fretboard', 'Lire les cordes, une tablature et un diagramme', quiz('reading-basics', 100), {
  why: 'Toutes les fiches, tablatures et diagrammes de l’appli reposent sur cette lecture.',
  how: 'En tablature, la ligne du haut est le Mi aigu. Dans un diagramme, les cordes sont verticales et le Mi grave à gauche.',
  tips: [
    'On confond les deux Mi : celui du haut de la tablature est le plus aigu, la corde la plus fine.',
    'Un « x » au-dessus d’une corde veut dire « ne pas jouer », un « o » « à vide ».',
  ],
})
skill(0, 'chromatic-quarter', 'left_hand', 'Chromatique 1-2-3-4 sur une corde', tempo('chromatic-1', 60, 'quarter'), {
  ex: ['chromatic-1', 'chromatic-2'],
  why: 'Un doigt par case : c’est la base de la main gauche, de la force et de l’indépendance des doigts.',
  how: 'Index en case 1, majeur en 2, annulaire en 3, auriculaire en 4. Une note par clic, chaque note nette.',
  tips: [
    'Une note frise : le doigt est trop loin de la frette, rapproche-le.',
    'L’auriculaire est faible au début : c’est normal, il se renforce en deux semaines.',
    'Douleur au bout des doigts : normale au début, elle passe avec la corne.',
  ],
})
skill(0, 'downstrokes', 'right_hand', 'Coups vers le bas réguliers', tempo('strumming-1', 60, 'quarter'), {
  ex: ['strumming-1'],
  why: 'La régularité de la main droite fait plus pour le son que n’importe quel accord.',
  how: 'Cordes à vide, un coup vers le bas par clic pendant 1 minute, sans décrocher du clic.',
  tips: [
    'Tu accélères sans t’en rendre compte : compte « 1, 2, 3, 4 » à voix haute.',
    'Le bras se crispe : le geste part du poignet, l’avant-bras reste souple.',
  ],
})

// ——— Niveau 1 — Premiers accords, premier riff ———
skill(
  1,
  'open-chords',
  'left_hand',
  'Accords ouverts Mi m, La m, Mi, La, Ré, Sol, Do',
  checklist([
    'Mi m : chaque corde sonne',
    'La m : chaque corde sonne',
    'Mi : chaque corde sonne',
    'La : chaque corde sonne',
    'Ré : chaque corde sonne',
    'Sol : chaque corde sonne',
    'Do : chaque corde sonne',
  ]),
  {
    pre: ['chromatic-quarter', 'reading'],
    ex: ['chords-1', 'chords-2', 'chords-3'],
    why: 'Ces sept accords suffisent pour des centaines de morceaux rock et pop.',
    how: 'Pose l’accord, joue chaque corde une à une. Une note étouffée ? Corrige ce doigt, puis rejoue toute la corde.',
    tips: [
      'Une corde étouffée : un doigt couche la corde voisine, arrondis-le.',
      'Le La est serré : essaie les doigts 2-3-4 au lieu de 1-2-3.',
      'Pour le Do, la corde de Sol à vide doit sonner : l’annulaire ne doit pas la toucher.',
    ],
  },
)
skill(
  1,
  'changes',
  'left_hand',
  'Changements d’accords, méthode « une minute »',
  changes(
    [
      ['Em', 'Am'],
      ['A', 'D'],
      ['G', 'C'],
      ['D', 'G'],
    ],
    30,
  ),
  {
    pre: ['open-chords'],
    ex: ['strumming-2', 'strumming-3', 'strumming-4'],
    why: 'Ce qui bloque les débutants, ce n’est pas l’accord, c’est le passage de l’un à l’autre.',
    how: 'Pendant 60 secondes, passe d’un accord à l’autre en grattant une fois chaque accord ; compte chaque changement propre.',
    tips: [
      'Pose tous les doigts en même temps plutôt qu’un par un.',
      'Repère le doigt qui ne bouge pas (doigt pivot) entre les deux accords.',
      'Regarde l’accord suivant avant de bouger : la main suit les yeux.',
    ],
  },
)
skill(1, 'eighths', 'right_hand', 'Rythme en croches bas-haut', tempo('strumming-5', 70, 'eighth'), {
  pre: ['downstrokes'],
  ex: ['strumming-5', 'strumming-6'],
  why: 'Le va-et-vient régulier est le moteur de presque tous les rythmes.',
  how: 'Bas sur le clic, haut entre deux clics, pendant 1 minute. La main ne s’arrête jamais.',
  tips: [
    'Les coups vers le haut sont plus faibles : c’est normal, ils ne touchent que les cordes aiguës.',
    'Tu décroches : ralentis de 10 bpm, la régularité d’abord.',
  ],
})
skill(1, 'strum-pattern', 'right_hand', 'Premier motif : bas, bas-haut, haut-bas-haut', tempo('strumming-8', 70, 'eighth'), {
  pre: ['eighths', 'changes'],
  ex: ['strumming-7', 'strumming-8', 'strumming-9'],
  why: 'Le motif le plus joué en pop et en rock acoustique.',
  how: 'Garde le va-et-vient des croches et rate exprès le coup du 3e temps. Un accord par mesure.',
  tips: [
    'Le motif se décale : la main a arrêté de bouger pendant le coup raté. Continue le geste dans le vide.',
    'Dis le motif à voix haute : « bas, bas-haut, haut-bas-haut ».',
  ],
})
skill(1, 'power-chords', 'right_hand', 'Power chords à deux doigts', tempo('powerChords-2', 80, 'quarter'), {
  pre: ['chromatic-quarter'],
  ex: ['powerChords-1', 'powerChords-2', 'rhythm-1', 'rhythm-2', 'rhythm-11'],
  why: 'Le son du rock et du metal : une forme, déplacée partout sur le manche.',
  how: 'Index sur la fondamentale (corde de Mi grave), annulaire deux cases plus loin sur la corde de La. Un riff de 4 accords en noires.',
  tips: [
    'Les autres cordes sonnent : pose le dessous de l’index sur elles pour les étouffer.',
    'Le déplacement glisse : relâche la pression pendant le trajet, pas en arrivant.',
  ],
})
skill(1, 'chromatic-eighth', 'left_hand', 'Chromatique 1-2-3-4 en croches', tempo('chromatic-3', 60, 'eighth'), {
  pre: ['chromatic-quarter'],
  ex: ['chromatic-2', 'chromatic-3'],
  why: 'Double la vitesse sans perdre la propreté : la synchronisation des deux mains commence ici.',
  how: 'Deux notes par clic sur les 6 cordes, en aller-retour au médiator.',
  tips: ['Les deux mains se désynchronisent : ralentis jusqu’à ce que chaque note tombe avec le coup de médiator.'],
})
skill(1, 'first-song', 'repertoire', 'Un morceau à 2 ou 3 accords en entier', recording(2), {
  pre: ['changes', 'strum-pattern'],
  why: 'Le premier morceau joué du début à la fin, c’est le moment où l’on devient guitariste.',
  how: 'Choisis un morceau de ta liste à 2 ou 3 accords. Joue-le en entier, sans t’arrêter même en cas d’erreur.',
  tips: [
    'Tu t’arrêtes à chaque erreur : continue, le rythme compte plus que l’accord parfait.',
    'Le tempo d’origine est trop rapide : joue-le plus lent, c’est permis.',
  ],
})

// ——— Niveau 2 — Rythme rock et main droite ———
skill(2, 'power-moves', 'right_hand', 'Riff de power chords avec déplacements', tempo('powerChords-4', 90, 'eighth'), {
  pre: ['power-chords'],
  ex: ['powerChords-3', 'powerChords-4', 'powerChords-7', 'rhythm-3', 'rhythm-12'],
  why: 'Changer de corde et de case sans couper le son : la base des riffs rock.',
  how: 'Power chords sur les cordes de Mi et de La, en croches, déplacements sans trou.',
  tips: ['Un trou entre deux accords : prépare le déplacement pendant la dernière croche.'],
})
skill(2, 'palm-mute', 'right_hand', 'Palm mute en croches', tempo('powerChords-5', 90, 'eighth'), {
  pre: ['power-chords'],
  ex: ['palmMuting-1', 'palmMuting-2', 'palmMuting-101', 'palmMuting-102', 'powerChords-5'],
  why: 'Le son « serré » du rock et du metal.',
  how: 'Pose le tranchant de la paume sur les cordes, juste devant le chevalet. Croches étouffées pendant 1 minute.',
  tips: ['Le son est trop étouffé (plus de note) : recule la paume vers le chevalet.', 'Pas assez étouffé : avance-la de quelques millimètres.'],
})
skill(2, 'muting-accents', 'right_hand', 'Étouffer, coups fantômes et accents', tempo('palmMuting-103', 80, 'eighth'), {
  pre: ['palm-mute'],
  ex: ['palmMuting-103', 'powerChords-6', 'rhythm-101'],
  why: 'Ce qui rend un riff vivant : alterner sons étouffés et accents ouverts.',
  how: 'Lève et repose la paume au bon moment ; relâche la main gauche pour les coups fantômes.',
  tips: ['Les accents ne ressortent pas : joue les notes étouffées plus doucement.'],
})
skill(
  2,
  'chords-2',
  'left_hand',
  'Accords Ré m, Mi 7, La 7, Fa simplifié',
  checklist(['Ré m : chaque corde sonne', 'Mi 7 : chaque corde sonne', 'La 7 : chaque corde sonne', 'Fa simplifié : chaque corde sonne']),
  {
    pre: ['open-chords'],
    ex: ['chords-6', 'chords-7', 'strumming-10'],
    why: 'Les septièmes donnent le son du blues ; le Fa simplifié prépare le barré.',
    how: 'Comme pour les premiers accords : chaque corde jouée une à une.',
    tips: ['Le Fa simplifié frise : l’index couvre les deux cordes aiguës, roule-le légèrement.'],
  },
)
skill(2, 'changes-c-f', 'left_hand', 'Changements Do–Fa simplifié', changes([['C', 'Fmaj7']], 30), {
  pre: ['chords-2', 'changes'],
  ex: ['strumming-11'],
  why: 'Do–Fa est l’un des passages les plus courants, et le plus redouté.',
  how: '60 secondes, un coup par accord, compte les changements propres.',
  tips: ['L’annulaire et le majeur gardent leur forme : la main se déplace d’une seule pièce.'],
})
skill(2, 'alternate-picking', 'right_hand', 'Aller-retour strict au médiator', tempo('chromatic-3', 80, 'eighth'), {
  pre: ['chromatic-eighth'],
  ex: ['picking-1', 'picking-2', 'picking-3', 'picking-101', 'chromatic-4', 'chromatic-5', 'chromatic-8'],
  why: 'La technique qui permet ensuite d’aller vite proprement.',
  how: 'Chromatique en croches, bas-haut-bas-haut sans jamais faire deux coups dans le même sens.',
  tips: [
    'Deux coups dans le même sens au changement de corde : ralentis, c’est là que ça casse.',
    'Petits gestes : le médiator dépasse à peine sous la corde.',
  ],
})
skill(2, 'notes-low', 'fretboard', 'Notes des cordes de Mi grave et de La (cases 0 à 12)', quiz('notes-e-a', 90, 3), {
  pre: ['reading'],
  why: 'Les fondamentales des power chords et des barrés sont sur ces deux cordes.',
  how: 'Apprends les repères : cases 0, 3, 5, 7, 12. Puis les notes entre les repères.',
  tips: ['Retiens qu’il n’y a pas de dièse entre Mi-Fa et Si-Do.'],
})
skill(2, 'ear-major-minor', 'ear', 'Oreille : accord majeur ou mineur', quiz('ear-major-minor', 80), {
  pre: ['open-chords'],
  why: 'Reconnaître la couleur d’un accord est le premier pas pour relever un morceau.',
  how: '20 questions : majeur (plutôt joyeux, ouvert) ou mineur (plutôt sombre).',
  tips: ['Chante la note du milieu de l’accord : c’est elle qui change entre majeur et mineur.'],
})
skill(2, 'songs-2', 'repertoire', 'Deux morceaux, dont un riff en power chords', recording(2), {
  pre: ['first-song', 'palm-mute'],
  why: 'Le répertoire grossit : un morceau d’accords, un riff rock.',
  how: 'Deux morceaux de ta liste joués en entier, dont un riff en power chords.',
  tips: ['Travaille d’abord le passage le plus dur seul, en boucle, plus lentement.'],
})

// ——— Niveau 3 — Premiers solos ———
skill(3, 'penta-1', 'technique', 'Pentatonique mineure, position 1', tempo('scales-103', 80, 'eighth'), {
  pre: ['alternate-picking'],
  ex: ['scales-3', 'scales-13', 'scales-101', 'scales-102', 'scales-103', 'scales-114'],
  why: 'La gamme des solos rock, blues et metal.',
  how: 'Montée et descente en croches, aller-retour au médiator, index en case 5 (La mineur).',
  tips: ['Repère les La (fondamentale) : c’est là que les solos se posent.'],
})
skill(3, 'legato', 'technique', 'Hammer-on et pull-off', tempo('legato-103', 70, 'eighth'), {
  pre: ['chromatic-eighth'],
  ex: ['legato-1', 'legato-2', 'legato-3', 'legato-101', 'legato-102', 'legato-103'],
  why: 'Lier les notes sans les attaquer : la fluidité des solos.',
  how: 'Hammer : frappe le doigt sur la case. Pull : tire légèrement la corde en relâchant. Les deux notes au même volume.',
  tips: [
    'La note liée est faible : frappe plus près de la frette, plus vite.',
    'Le pull-off fait sonner une autre corde : tire vers le bas, pas vers le haut.',
  ],
})
skill(
  3,
  'slides-vibrato',
  'expression',
  'Slides et vibrato',
  checklist(['Slide qui arrive pile sur la case', 'Vibrato régulier, sans changer de note', 'Contrôlé sur un enregistrement']),
  {
    pre: ['penta-1'],
    why: 'Le chant d’une note : c’est ce qui rend un solo personnel.',
    how: 'Slide : garde la pression en glissant. Vibrato : petits mouvements réguliers du poignet, comme pour tourner une clé.',
    tips: ['Le vibrato part dans tous les sens : vise un rythme, en croches avec le clic.'],
  },
)
skill(
  3,
  'bends',
  'expression',
  'Bends d’un demi-ton et d’un ton',
  { kind: 'pitch', targetCents: 15, hitsOutOf: [8, 10] },
  {
    pre: ['penta-1'],
    ex: ['bends-1', 'bends-2', 'bends-3', 'bends-101', 'bends-102', 'bends-104'],
    why: 'Le son le plus expressif de la guitare électrique.',
    how: 'Pousse la corde avec trois doigts ensemble. Vérifie la note d’arrivée avec l’accordeur (±15 cents).',
    tips: [
      'Le bend est faux : joue d’abord la note cible deux cases plus haut, puis vise-la.',
      'Ça fait mal : c’est le poignet qui tourne, pas les doigts qui poussent seuls.',
    ],
  },
)
skill(3, 'barre-f', 'left_hand', 'Barré de Fa, forme de Mi', changes([['C', 'F']], 20), {
  pre: ['changes-c-f'],
  ex: ['chords-7', 'chords-8'],
  why: 'Avec le barré, chaque accord se joue partout sur le manche.',
  how: 'D’abord les 6 cordes qui sonnent une à une, puis 60 secondes de Do–Fa.',
  tips: [
    'Des cordes ne sonnent pas sous l’index : roule l’index sur son côté osseux.',
    'La force vient du bras qui tire un peu en arrière, pas seulement du pouce.',
  ],
})
skill(3, 'theory-triads', 'ear', 'Intervalles et construction d’un accord (1-3-5)', quiz('intervals-triads', 90), {
  pre: ['notes-low'],
  why: 'Comprendre pourquoi un accord est majeur ou mineur, et le retrouver sur le manche.',
  how: 'Une triade = fondamentale, tierce, quinte. Tierce majeure : 4 cases ; mineure : 3 cases.',
  tips: ['Visualise la forme sur le manche plutôt que d’apprendre par cœur.'],
})
skill(3, 'impro-1', 'creativity', 'Improviser 2 minutes sur une boucle en La m', recording(2), {
  pre: ['penta-1', 'legato'],
  why: 'Jouer ses propres phrases : le premier pas vers l’autonomie.',
  how: 'Boucle en La mineur, pentatonique position 1. Peu de notes, des silences, termine tes phrases sur un La.',
  tips: [
    'Tu joues trop de notes : fais des phrases de 4 notes, puis une pause.',
    'Tu tournes en rond : répète une phrase et change seulement la dernière note.',
  ],
})
skill(3, 'solo-1', 'repertoire', 'Un riff mélodique ou un solo simple', recording(2), {
  pre: ['penta-1', 'bends'],
  why: 'Ton premier solo appris, avec bends et liés.',
  how: 'Choisis un solo ou un riff mélodique simple de ta liste, joue-le en entier.',
  tips: ['Apprends-le phrase par phrase, puis enchaîne deux phrases, puis trois.'],
})

// ——— Niveau 4 — Barrés et manche ———
skill(
  4,
  'barres',
  'left_hand',
  'Barrés majeurs et mineurs, formes de Mi et de La',
  changes(
    [
      ['F', 'Bb'],
      ['Gbar', 'Cbar'],
      ['Ambar', 'Dbar'],
    ],
    25,
  ),
  {
    pre: ['barre-f'],
    ex: ['chords-9', 'chords-10', 'strumming-14', 'strumming-15'],
    why: 'Toutes les tonalités deviennent jouables.',
    how: 'Changements de 60 secondes entre deux barrés, d’une forme de Mi à une forme de La.',
    tips: ['La forme de La frise : l’annulaire peut barrer les trois cordes du milieu.'],
  },
)
skill(4, 'penta-1-2', 'technique', 'Pentatonique, positions 1 et 2 reliées', tempo('scales-108', 90, 'eighth'), {
  pre: ['penta-1'],
  ex: ['scales-104', 'scales-108', 'scales-109'],
  why: 'Sortir de la « boîte » : les solos voyagent sur le manche.',
  how: 'Monte en position 1, glisse vers la position 2, redescends.',
  tips: ['Le glissé se perd : choisis toujours la même note de passage.'],
})
skill(4, 'major-scale', 'technique', 'Gamme majeure, une position', tempo('scales-117', 80, 'eighth'), {
  pre: ['penta-1'],
  ex: ['scales-1', 'scales-11', 'scales-117', 'scales-118'],
  why: 'La gamme de référence de la musique occidentale : tout se mesure par rapport à elle.',
  how: 'Gamme de Sol, cases 2 à 5, un doigt par case, montée et descente en croches.',
  tips: ['Chante « do ré mi » en jouant : l’oreille corrige les doigts.'],
})
skill(4, 'notes-all', 'fretboard', 'Notes sur toutes les cordes', quiz('notes-all', 90, 3), {
  pre: ['notes-low'],
  why: 'Savoir où l’on est sur le manche, partout.',
  how: 'Utilise les octaves : une note sur la corde de Mi se retrouve deux cases plus loin, deux cordes plus aiguës.',
  tips: ['Les cordes de Sol et de Si décalent les formes d’octave d’une case.'],
})
skill(4, 'sixteenths', 'right_hand', 'Rythme en doubles croches', tempo('strumming-12', 70, 'sixteenth'), {
  pre: ['strum-pattern'],
  ex: ['strumming-12', 'strumming-13', 'palmMuting-104', 'picking-102'],
  why: 'Le funk, le rock rapide et le metal reposent sur les doubles croches.',
  how: 'Quatre coups par clic, 1 minute, petits gestes du poignet.',
  tips: ['Ça s’emballe : accentue le premier coup de chaque groupe de quatre.'],
})
skill(
  4,
  'ear-melody',
  'ear',
  'Relever une mélodie de 4 à 8 notes',
  checklist(['Mélodie de 4 à 8 notes trouvée sans aide', 'Rejouée en entier, au bon rythme']),
  {
    pre: ['ear-major-minor', 'major-scale'],
    why: 'Relever à l’oreille, c’est apprendre n’importe quel morceau sans tablature.',
    how: 'Trouve la première note, puis chante la suivante : plus haute ou plus basse ? Cherche-la case par case.',
    tips: ['Commence par une mélodie que tu sais chanter (générique, comptine).'],
  },
)
skill(4, 'barre-song', 'repertoire', 'Un morceau avec barrés', recording(2), {
  pre: ['barres'],
  why: 'Le répertoire s’ouvre : la plupart des morceaux ont au moins un barré.',
  how: 'Un morceau de ta liste avec des barrés, joué en entier.',
  tips: ['Le barré te ralentit : remplace-le par un power chord le temps de l’apprendre, puis remets-le.'],
})

// ——— Niveau 5 — Autonomie ———
skill(5, 'penta-5', 'technique', 'Pentatonique dans les 5 positions, reliées', tempo('scales-111', 90, 'eighth'), {
  pre: ['penta-1-2'],
  ex: ['scales-105', 'scales-106', 'scales-107', 'scales-111'],
  why: 'Le manche entier devient un terrain de jeu.',
  how: 'Les 5 positions enchaînées en montant le manche, une par mesure.',
  tips: ['Chaque position commence là où la précédente finit : repère les notes communes.'],
})
skill(5, 'speed', 'technique', 'Vitesse : pentatonique en croches à 120', tempo('scales-103', 120, 'eighth'), {
  pre: ['penta-5', 'sixteenths'],
  ex: ['scales-110', 'scales-112', 'picking-104', 'picking-106', 'chromatic-12'],
  why: 'La vitesse au service des solos, sans perdre la propreté.',
  how: '+4 bpm seulement après 3 séances propres. Travaille aussi par rafales courtes.',
  tips: ['Plateau : ralentis de 20 %, découpe le passage, puis remonte.', 'Tu crispes l’épaule : arrête, respire, recommence plus lent.'],
})
skill(
  5,
  'transcribe',
  'ear',
  'Relever un riff ou un couplet à l’oreille',
  checklist(['Riff ou couplet entier trouvé sans tablature', 'Joué avec le morceau, au bon tempo']),
  {
    pre: ['ear-melody'],
    why: 'L’autonomie : apprendre ce que tu veux, sans dépendre d’une tablature.',
    how: 'Ralentis le morceau, trouve la tonalité, puis les notes une à une.',
    tips: ['Cherche d’abord la note la plus grave du riff : c’est souvent la fondamentale.'],
  },
)
skill(5, 'compose', 'creativity', 'Composer un riff, un couplet et un refrain', recording(2), {
  pre: ['impro-1', 'barres'],
  why: 'Ta propre musique : le but de tout le parcours.',
  how: 'Un riff, un couplet et un refrain qui s’enchaînent, enregistrés.',
  tips: ['Pars d’une suite d’accords connue et change un seul accord.'],
})

const LEVELS = [
  { level: 0, name: 'Prise en main', reference: '2 semaines', exam: 'Accorder seul, puis la chromatique à 60 BPM sur les 6 cordes.' },
  { level: 1, name: 'Premiers accords, premier riff', reference: '6 à 8 semaines', exam: 'Le morceau du niveau enregistré du début à la fin, sans arrêt.' },
  {
    level: 2,
    name: 'Rythme rock et main droite',
    reference: '2 à 3 mois',
    exam: 'Le riff en power chords avec palm mute, enregistré à au moins 80 % de son tempo d’origine.',
  },
  { level: 3, name: 'Premiers solos', reference: '3 mois', exam: 'L’impro de 2 minutes et le solo du niveau, enregistrés.' },
  { level: 4, name: 'Barrés et manche', reference: '3 à 4 mois', exam: 'Le morceau avec barrés enregistré, et une mélodie relevée à l’oreille.' },
  { level: 5, name: 'Autonomie', reference: 'ouvert', exam: null },
].map((l) => ({ ...l, requiredSkillIds: skills.filter((s) => s.level === l.level).map((s) => s.id) }))

const QUIZZES = [
  { id: 'reading-basics', name: 'Lire cordes, tablature et diagramme' },
  { id: 'notes-e-a', name: 'Notes des cordes de Mi grave et de La' },
  { id: 'ear-major-minor', name: 'Majeur ou mineur ?' },
  { id: 'intervals-triads', name: 'Intervalles et triades' },
  { id: 'notes-all', name: 'Notes sur tout le manche' },
]
const RUBRICS = [
  {
    id: 'grille-5',
    criteria: ['Rythme régulier', 'Notes nettes', 'Transitions sans trou', 'Son et nuances', 'Aisance'].map((label) => ({ label, min: 1, max: 3 })),
  },
]

writeFileSync(
  new URL('../src/content/guitar/path.json', import.meta.url),
  JSON.stringify({ version: 1, levels: LEVELS, skills, quizzes: QUIZZES, rubrics: RUBRICS }, null, 2) + '\n',
)
console.log(LEVELS.map((l) => `N${l.level}: ${l.requiredSkillIds.length}`).join(' · '), '· total', skills.length)
