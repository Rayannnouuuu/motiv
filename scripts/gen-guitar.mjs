// Génère la base guitare « nouvelle » (lot G1) : formes de gammes et exercices, à partir des hauteurs de notes.
// Les notes sont justes par construction (positions calculées, puis vérifiées par les tests). Tout est « à relire ».
// Usage : node scripts/gen-guitar.mjs  (réécrit src/content/guitar/scales.json et src/content/exercises/*-plus.json, etc.)
import { readFileSync, writeFileSync } from 'node:fs'

const OUT = new URL('../src/content/', import.meta.url)
const write = (path, data) => writeFileSync(new URL(path, OUT), JSON.stringify(data, null, 2) + '\n')

// Cordes : 1 = mi aigu … 6 = mi grave. Hauteur MIDI à vide.
const OPEN = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }
const STRINGS_LOW_TO_HIGH = [6, 5, 4, 3, 2, 1]
const pitch = (s, f) => OPEN[s] + f
const DEGREES = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' }
const NOTE = { A: 9, 'A#': 10, B: 11, C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8 }

const SCALES = {
  minorPenta: [0, 3, 5, 7, 10],
  majorPenta: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
}

/**
 * Une position : les notes de la gamme entre `start` et `start + span` frettes, de la corde grave à l'aiguë, en
 * gardant une hauteur strictement montante (pas de doublon d'une corde à l'autre). Doigt = frette − start + 1.
 */
function box(root, intervals, start, span) {
  const notes = []
  let last = -1
  for (const s of STRINGS_LOW_TO_HIGH)
    for (let f = Math.max(0, start); f <= start + span; f++) {
      const p = pitch(s, f)
      const iv = (((p - NOTE[root]) % 12) + 12) % 12
      if (!intervals.includes(iv) || p <= last) continue
      notes.push({ string: s, fret: f, finger: f === 0 ? 0 : Math.min(4, Math.max(1, f - start + 1)), degree: DEGREES[iv] })
      last = p
    }
  return notes
}

/** Trois notes par corde : chaque corde prend les 3 notes suivantes de la gamme (jeu rapide, legato). */
function threePerString(root, intervals, firstFret) {
  const notes = []
  let p = pitch(6, firstFret)
  const inScale = (x) => intervals.includes((((x - NOTE[root]) % 12) + 12) % 12)
  while (!inScale(p)) p++
  for (const s of STRINGS_LOW_TO_HIGH) {
    for (let k = 0; k < 3; k++) {
      notes.push({ string: s, fret: p - OPEN[s], finger: k === 0 ? 1 : k === 1 ? 2 : 4, degree: DEGREES[(((p - NOTE[root]) % 12) + 12) % 12] })
      do p++
      while (!inScale(p))
    }
  }
  return notes
}

// Pentatonique mineure de La, 5 positions (départ en frette et ampleur choisis pour les doigtés classiques).
const PENTA_POS = [
  { position: 1, start: 5, span: 3 },
  { position: 2, start: 7, span: 3 },
  { position: 3, start: 9, span: 4 },
  { position: 4, start: 12, span: 3 },
  { position: 5, start: 14, span: 3 },
]
const SHAPES = [
  ...PENTA_POS.map((p) => ({
    id: `penta-am-${p.position}`,
    name: `Pentatonique mineure de La, position ${p.position}`,
    position: p.position,
    notes: box('A', SCALES.minorPenta, p.start, p.span),
  })),
  { id: 'penta-em-open', name: 'Pentatonique mineure de Mi, position ouverte', position: 1, notes: box('E', SCALES.minorPenta, 0, 3) },
  { id: 'penta-major-g-1', name: 'Pentatonique majeure de Sol, position 1', position: 1, notes: box('G', SCALES.majorPenta, 2, 3) },
  { id: 'blues-a-1', name: 'Gamme blues de La, position 1', position: 1, notes: box('A', SCALES.blues, 5, 3) },
  { id: 'blues-e-open', name: 'Gamme blues de Mi, position ouverte', position: 1, notes: box('E', SCALES.blues, 0, 3) },
  { id: 'major-g-2', name: 'Gamme majeure de Sol, 2e position', position: 2, notes: box('G', SCALES.major, 2, 3) },
  { id: 'major-c-7', name: 'Gamme majeure de Do, 7e position', position: 7, notes: box('C', SCALES.major, 7, 3) },
  { id: 'minor-a-5', name: 'Gamme mineure de La, 5e position', position: 5, notes: box('A', SCALES.minor, 4, 4) },
  { id: 'major-g-3nps', name: 'Gamme majeure de Sol, 3 notes par corde', position: 3, notes: threePerString('G', SCALES.major, 3) },
  { id: 'minor-e-3nps', name: 'Gamme mineure de Mi, 3 notes par corde', position: 12, notes: threePerString('E', SCALES.minor, 12) },
]
write('guitar/scales.json', SHAPES)
const shape = (id) => SHAPES.find((s) => s.id === id)

// ——— Exercices ———
const CHORDS = JSON.parse(readFileSync(new URL('guitar/chords.json', OUT), 'utf8'))
const chord = (id) => CHORDS.find((c) => c.id === id)

const n = (string, fret, startBeat, duration, technique) => ({ string, fret, startBeat, duration, ...(technique ? { technique } : {}) })
/** Une suite de notes [corde, frette] à `sub` notes par temps. */
const line = (pairs, sub, from = 0, technique) => pairs.map(([s, f], i) => n(s, f, from + i / sub, 1 / sub, technique))
/** Les notes d'un accord, grattées ensemble sur un temps. */
const strum = (c, beat, dur, technique) => c.frets.flatMap((f, i) => (f === 'x' ? [] : [n(6 - i, f, beat, dur, technique)]))
const asPairs = (notes) => notes.map((x) => [x.string, x.fret])
const up = (sh) => asPairs(sh.notes)
const down = (sh) => asPairs(sh.notes).reverse()
const upDown = (sh) => [...up(sh), ...down(sh).slice(1)]
/** Séquence en groupes : 1-2-3, 2-3-4… (k = taille du groupe). */
const groups = (pairs, k) => pairs.slice(0, pairs.length - k + 1).flatMap((_, i) => pairs.slice(i, i + k))

/** Tempo de départ et cible selon la difficulté et la subdivision (tempo = noire). */
function tempo(difficulty, sub) {
  const base = { 1: 56, 2: 52, 3: 46, 4: 42 }[sub]
  const startBpm = base + difficulty * 4
  return { startBpm, targetBpm: startBpm + (sub >= 3 ? 24 : 30) }
}

const bank = {}
function add(category, file, title, difficulty, sub, description, pattern) {
  const list = (bank[file] ??= { category, items: [] }).items
  const index = (file.endsWith('-plus') ? 101 : 1) + list.length
  list.push({
    id: `${category}-${index}`,
    title: `${title} ${difficulty}`,
    category,
    difficulty,
    description,
    metric: 'bpm',
    ...tempo(difficulty, sub),
    source: 'new',
    review: true,
    pattern,
  })
}

// Chromatique : la base des deux mains (doigt par case, aller-retour au médiator).
const ORDERS = [
  ['1-2-3-4', [1, 2, 3, 4]],
  ['4-3-2-1', [4, 3, 2, 1]],
  ['1-3-2-4', [1, 3, 2, 4]],
  ['1-2-4-3', [1, 2, 4, 3]],
  ['2-1-4-3', [2, 1, 4, 3]],
]
const chromaOne = (order, s, pos) => order.map((d) => [s, pos + d - 1])
const chromaAll = (order, pos) => STRINGS_LOW_TO_HIGH.flatMap((s) => chromaOne(order, s, pos))
add(
  'chromatic',
  'chromatic',
  'Chromatique 1-2-3-4, corde de Mi grave',
  1,
  1,
  'Un doigt par case, cases 1 à 4, une note par clic. Le doigt reste posé jusqu’à la note suivante.',
  line(chromaOne([1, 2, 3, 4], 6, 1), 1),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique 1-2-3-4, les 6 cordes en noires',
  1,
  1,
  'Cases 1 à 4 sur chaque corde, du grave à l’aigu. Coups vers le bas d’abord, puis en aller-retour.',
  line(chromaAll([1, 2, 3, 4], 1), 1),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique 1-2-3-4, croches',
  2,
  2,
  'Même exercice, deux notes par clic, en aller-retour strict (bas, haut).',
  line(chromaAll([1, 2, 3, 4], 1), 2),
)
for (const [label, order] of ORDERS.slice(1))
  add(
    'chromatic',
    'chromatic',
    `Chromatique ${label}, croches`,
    3,
    2,
    `Ordre des doigts ${label} : casse l’automatisme et renforce les doigts 3 et 4.`,
    line(chromaAll(order, 5), 2),
  )
add(
  'chromatic',
  'chromatic',
  'Chromatique montée et descente, croches',
  3,
  2,
  'Monte du Mi grave au Mi aigu en 1-2-3-4, redescends en 4-3-2-1 sans t’arrêter.',
  line([...chromaAll([1, 2, 3, 4], 5), ...[...STRINGS_LOW_TO_HIGH].reverse().flatMap((s) => chromaOne([4, 3, 2, 1], s, 5))], 2),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique en triolets',
  4,
  3,
  'Trois notes par clic : l’accent tombe tour à tour sur un autre doigt.',
  line(chromaAll([1, 2, 3, 4], 5), 3),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique avec déplacement de position',
  5,
  2,
  'Cases 1-4 sur une corde, puis la position monte d’une case à chaque corde.',
  line(
    STRINGS_LOW_TO_HIGH.flatMap((s, i) => chromaOne([1, 2, 3, 4], s, 1 + i)),
    2,
  ),
)
add(
  'chromatic',
  'chromatic',
  'Araignée (spider), croches',
  5,
  2,
  'Deux cordes voisines en alternance : 1 sur la corde grave, 2 sur l’aiguë, 3 sur la grave, 4 sur l’aiguë.',
  line(
    [6, 5, 4, 3, 2].flatMap((s) => [
      [s, 5],
      [s - 1, 6],
      [s, 7],
      [s - 1, 8],
    ]),
    2,
  ),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique 1-2-3-4, doubles croches',
  6,
  4,
  'Quatre notes par clic, aller-retour strict. Reste relâché : la vitesse vient du relâchement.',
  line(chromaAll([1, 2, 3, 4], 5), 4),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique 1-3-2-4, doubles croches',
  7,
  4,
  'Ordre croisé à quatre notes par clic, sur les 6 cordes.',
  line(chromaAll([1, 3, 2, 4], 7), 4),
)
add(
  'chromatic',
  'chromatic',
  'Araignée (spider), doubles croches',
  8,
  4,
  'L’araignée à quatre notes par clic : précision des deux mains à vitesse.',
  line(
    [6, 5, 4, 3, 2].flatMap((s) => [
      [s, 5],
      [s - 1, 6],
      [s, 7],
      [s - 1, 8],
    ]),
    4,
  ),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique en saut de corde, doubles croches',
  9,
  4,
  'Une corde sur deux (Mi grave, Ré, Si) : le médiator saute une corde sans perdre le rythme.',
  line(
    [6, 4, 2].flatMap((s) => chromaOne([1, 2, 3, 4], s, 7)),
    4,
  ),
)
add(
  'chromatic',
  'chromatic',
  'Chromatique 4-3-2-1 haut du manche, doubles croches',
  10,
  4,
  'Cases 12 à 15, en descendant les doigts : les cases sont serrées, garde la précision.',
  line(chromaAll([4, 3, 2, 1], 12), 4),
)

// Grattage : rythme main droite sur accords ouverts.
const strumBar = (c, hits, tech) => hits.flatMap(([b, d]) => strum(c, b, d, tech))
const Q = [
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
]
const E8 = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b) => [b, 0.5])
const FOLK = [
  [0, 1],
  [1, 0.5],
  [1.5, 1],
  [2.5, 0.5],
  [3, 0.5],
  [3.5, 0.5],
] // ↓ ↓↑ ↑↓↑
const S16 = Array.from({ length: 16 }, (_, i) => [i / 4, 0.25])
const progression = (ids, hits, tech) =>
  ids.flatMap((id, bar) =>
    strumBar(
      chord(id),
      hits.map(([b, d]) => [b + bar * 4, d]),
      tech,
    ),
  )
add(
  'strumming',
  'strumming',
  'Coups vers le bas sur cordes à vide',
  1,
  1,
  'Un coup vers le bas par clic sur les 6 cordes à vide. Le bras reste souple, le geste part du poignet.',
  strumBar({ frets: [0, 0, 0, 0, 0, 0] }, Q),
)
add(
  'strumming',
  'strumming',
  'Mi m et La m en noires',
  1,
  1,
  'Un accord par mesure, un coup vers le bas par clic. Change d’accord sans couper le rythme.',
  progression(['Em', 'Am'], Q),
)
add(
  'strumming',
  'strumming',
  'La et Ré en noires',
  2,
  1,
  'Un accord par mesure, coups vers le bas. Prépare le prochain accord pendant le dernier temps.',
  progression(['A', 'D'], Q),
)
add(
  'strumming',
  'strumming',
  'Sol et Do en noires',
  2,
  1,
  'Sol vers Do : le doigt 1 descend, garde l’annulaire comme pivot si tu peux.',
  progression(['G', 'C'], Q),
)
add(
  'strumming',
  'strumming',
  'Croches bas-haut sur Mi m',
  2,
  2,
  'Bas sur le clic, haut entre deux clics : la main bouge tout le temps, même si elle ne touche pas.',
  progression(['Em', 'Em'], E8),
)
add('strumming', 'strumming', 'Croches bas-haut, Ré et Sol', 3, 2, 'Bas-haut régulier, un accord par mesure.', progression(['D', 'G'], E8))
add(
  'strumming',
  'strumming',
  'Motif bas, bas-haut, haut-bas-haut, Mi m et Do',
  3,
  2,
  'Le motif ↓ ↓↑ ↑↓↑ : la main continue le va-et-vient, elle rate exprès le 3e temps.',
  progression(['Em', 'C'], FOLK),
)
add(
  'strumming',
  'strumming',
  'Motif bas, bas-haut, haut-bas-haut, Sol, Ré, Mi m, Do',
  4,
  2,
  'Le même motif sur la suite la plus jouée du rock et de la pop. Un accord par mesure.',
  progression(['G', 'D', 'Em', 'C'], FOLK),
)
add(
  'strumming',
  'strumming',
  'Motif bas, bas-haut, haut-bas-haut, La, Ré, Mi',
  4,
  2,
  'Trois accords, un par mesure, le motif ne s’arrête jamais.',
  progression(['A', 'D', 'E'], FOLK),
)
add(
  'strumming',
  'strumming',
  'Croches avec septièmes : Mi7 et La7',
  5,
  2,
  'Bas-haut sur deux accords de septième : le son du blues.',
  progression(['E7', 'A7'], E8),
)
add(
  'strumming',
  'strumming',
  'Changement par demi-mesure, Do et Fa simplifié',
  5,
  2,
  'Deux accords par mesure : change sur le 3e temps sans casser les croches.',
  [...strumBar(chord('C'), E8.slice(0, 4)), ...strumBar(chord('Fmaj7'), E8.slice(4))],
)
add(
  'strumming',
  'strumming',
  'Doubles croches sur Mi m',
  6,
  4,
  'Quatre coups par clic, bas-haut-bas-haut. Petits gestes, le poignet fait tout.',
  strumBar(chord('Em'), S16),
)
add(
  'strumming',
  'strumming',
  'Doubles croches avec accents, La m',
  7,
  4,
  'Quatre coups par clic, accent sur le premier de chaque groupe : le groove funk-rock.',
  strumBar(chord('Am'), S16),
)
add(
  'strumming',
  'strumming',
  'Barrés en croches, Fa, Si♭, Do',
  7,
  2,
  'Trois barrés, un par mesure, en bas-haut. Relâche la pression entre deux accords.',
  progression(['F', 'Bb', 'Cbar'], E8),
)
add(
  'strumming',
  'strumming',
  'Barrés en croches, Sol m, Do m, Ré',
  8,
  2,
  'Mineur, mineur, majeur : une suite typique en Sol mineur, tout en barrés.',
  progression(['Gmbar', 'Cmbar', 'Dbar'], E8),
)
add('strumming', 'strumming', 'Doubles croches sur barrés, La et Ré', 9, 4, 'Doubles croches régulières sur deux barrés : endurance de la main gauche.', [
  ...strumBar(chord('Abar'), S16),
  ...strumBar(
    chord('Dbar'),
    S16.map(([b, d]) => [b + 4, d]),
  ),
])
add(
  'strumming',
  'strumming',
  'Doubles croches, Sol, Ré, Mi m, Do',
  10,
  4,
  'Quatre accords, doubles croches continues, changement net à chaque mesure.',
  progression(['G', 'D', 'Em', 'C'], S16),
)

// Power chords : le son du rock et du metal.
const pc = (rootString, fret, beat, dur, tech, octave = false) => [
  n(rootString, fret, beat, dur, tech),
  n(rootString - 1, fret + 2, beat, dur, tech),
  ...(octave ? [n(rootString - 2, fret + 2, beat, dur, tech)] : []),
]
const riff = (hits, opts = {}) => hits.flatMap(([s, f, b, d, tech]) => pc(s, f, b, d, tech ?? opts.tech, opts.octave))
add(
  'powerChords',
  'powerChords',
  'Power chords à deux doigts, Mi grave, noires',
  1,
  1,
  'Un power chord par clic : Sol, La, Do (sur La), Ré. Index sur la fondamentale, annulaire deux cases plus haut.',
  riff([
    [6, 3, 0, 1],
    [6, 5, 1, 1],
    [5, 3, 2, 1],
    [5, 5, 3, 1],
  ]),
)
add(
  'powerChords',
  'powerChords',
  'Riff de 4 power chords, noires',
  2,
  1,
  'Mi 5, Sol 5, La 5, Sol 5 : le riff rock de base, deux cordes seulement.',
  riff([
    [6, 0, 0, 1],
    [6, 3, 1, 1],
    [6, 5, 2, 1],
    [6, 3, 3, 1],
  ]),
)
add(
  'powerChords',
  'powerChords',
  'Power chords Mi et La, croches',
  3,
  2,
  'Croches sur la même forme, en passant de la corde de Mi à celle de La.',
  riff([0, 0.5, 1, 1.5].map((b) => [6, 5, b, 0.5]).concat([2, 2.5, 3, 3.5].map((b) => [5, 5, b, 0.5]))),
)
add(
  'powerChords',
  'powerChords',
  'Riff avec déplacements, croches',
  4,
  2,
  'Mi 5, Sol 5, La 5, Do 5 en croches, déplacement rapide sans couper le son.',
  riff([
    [6, 0, 0, 0.5],
    [6, 0, 0.5, 0.5],
    [6, 3, 1, 0.5],
    [6, 3, 1.5, 0.5],
    [6, 5, 2, 0.5],
    [6, 5, 2.5, 0.5],
    [5, 3, 3, 0.5],
    [5, 3, 3.5, 0.5],
  ]),
)
add(
  'powerChords',
  'powerChords',
  'Power chords étouffés, croches',
  4,
  2,
  'Les mêmes croches avec la paume posée près du chevalet (palm mute).',
  riff(
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b) => [6, 0, b, 0.5]),
    { tech: 'palmMute' },
  ),
)
add(
  'powerChords',
  'powerChords',
  'Étouffé puis ouvert',
  5,
  2,
  'Trois croches étouffées, un accord ouvert accentué : la base du rock.',
  riff([
    [6, 0, 0, 0.5, 'palmMute'],
    [6, 0, 0.5, 0.5, 'palmMute'],
    [6, 0, 1, 0.5, 'palmMute'],
    [6, 3, 1.5, 0.5],
    [6, 0, 2, 0.5, 'palmMute'],
    [6, 0, 2.5, 0.5, 'palmMute'],
    [6, 0, 3, 0.5, 'palmMute'],
    [6, 5, 3.5, 0.5],
  ]),
)
add(
  'powerChords',
  'powerChords',
  'Power chords avec octave',
  5,
  2,
  'Forme à trois notes (fondamentale, quinte, octave) : le son plein du hard rock.',
  riff(
    [
      [6, 3, 0, 1],
      [6, 5, 1, 1],
      [5, 3, 2, 1],
      [5, 5, 3, 1],
    ],
    { octave: true },
  ),
)
add(
  'powerChords',
  'powerChords',
  'Galop (croche, deux doubles)',
  6,
  4,
  'Le rythme du heavy metal : une croche puis deux doubles croches, étouffées sur le Mi grave.',
  riff(
    [0, 1, 2, 3].flatMap((b) => [
      [6, 0, b, 0.5, 'palmMute'],
      [6, 0, b + 0.5, 0.25, 'palmMute'],
      [6, 0, b + 0.75, 0.25, 'palmMute'],
    ]),
  ),
)
add(
  'powerChords',
  'powerChords',
  'Galop avec changements',
  7,
  4,
  'Le galop qui passe de Mi 5 à Sol 5 puis La 5 : tiens la régularité pendant les déplacements.',
  riff(
    [
      [0, 0],
      [1, 0],
      [2, 3],
      [3, 5],
    ].flatMap(([b, f]) => [
      [6, f, b, 0.5, 'palmMute'],
      [6, f, b + 0.5, 0.25, 'palmMute'],
      [6, f, b + 0.75, 0.25, 'palmMute'],
    ]),
  ),
)
add(
  'powerChords',
  'powerChords',
  'Doubles croches étouffées (chug)',
  7,
  4,
  'Mi 5 étouffé en doubles croches continues : la main droite du metal, en aller-retour.',
  riff(Array.from({ length: 16 }, (_, i) => [6, 0, i / 4, 0.25, 'palmMute'])),
)
add(
  'powerChords',
  'powerChords',
  'Chug avec accents ouverts',
  8,
  4,
  'Doubles croches étouffées, accord ouvert sur chaque temps fort.',
  riff(Array.from({ length: 16 }, (_, i) => [6, i % 4 === 0 ? ((i / 4) % 2 ? 5 : 3) : 0, i / 4, 0.25, i % 4 === 0 ? undefined : 'palmMute'])),
)
add(
  'powerChords',
  'powerChords',
  'Riff thrash, doubles croches',
  9,
  4,
  'Mi grave étouffé en doubles croches, coupé de power chords : vitesse et déplacements.',
  riff(
    Array.from({ length: 16 }, (_, i) => [
      6,
      [0, 0, 0, 3, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 5, 3][i],
      i / 4,
      0.25,
      [3, 7, 11, 14, 15].includes(i) ? undefined : 'palmMute',
    ]),
  ),
)
add(
  'powerChords',
  'powerChords',
  'Power chords rapides sur la corde de La',
  10,
  4,
  'Doubles croches sur la corde de La, déplacements de 2 et 3 cases à pleine vitesse.',
  riff(Array.from({ length: 16 }, (_, i) => [5, [0, 0, 3, 3, 5, 5, 3, 3, 0, 0, 7, 7, 5, 5, 3, 3][i], i / 4, 0.25, 'palmMute'])),
)

// Accords : arpèges et changements au tempo.
const arpeggio = (id, beat0, sub, order) => {
  const c = chord(id)
  const played = c.frets.map((f, i) => [6 - i, f]).filter(([, f]) => f !== 'x')
  const seq = order === 'updown' ? [...played, ...played.slice(1, -1).reverse()] : played
  return seq.map(([s, f], i) => n(s, f, beat0 + i / sub, 1 / sub))
}
add(
  'chords',
  'chords',
  'Mi m, chaque corde une à une',
  1,
  1,
  'Joue l’accord corde par corde : chaque note doit sonner. Si une note est étouffée, ajuste le doigt.',
  arpeggio('Em', 0, 1),
)
add('chords', 'chords', 'La m et Mi, chaque corde', 1, 1, 'Les deux accords en arpège lent : tous les doigts sur le bout, ongles courts.', [
  ...arpeggio('Am', 0, 1),
  ...arpeggio('E', 5, 1),
])
add('chords', 'chords', 'Ré, Sol et Do, chaque corde', 2, 1, 'Trois accords joués lentement corde par corde. Vérifie le Do : la corde de Sol doit sonner.', [
  ...arpeggio('D', 0, 1),
  ...arpeggio('G', 4, 1),
  ...arpeggio('C', 10, 1),
])
add(
  'chords',
  'chords',
  'Arpège montée-descente, La m',
  3,
  2,
  'Arpège en croches qui monte et redescend : la main gauche ne bouge pas.',
  arpeggio('Am', 0, 2, 'updown'),
)
add(
  'chords',
  'chords',
  'Arpèges enchaînés, Sol, Ré, Mi m, Do',
  4,
  2,
  'Un arpège par accord en croches, changement sans trou.',
  ['G', 'D', 'Em', 'C'].flatMap((id, i) => arpeggio(id, i * 4, 2)),
)
add(
  'chords',
  'chords',
  'Arpèges de septièmes : Mi7, La7, Si7',
  5,
  2,
  'Les accords de septième en arpège : le Si 7 demande les 4 doigts.',
  ['E7', 'A7', 'B7'].flatMap((id, i) => arpeggio(id, i * 4, 2)),
)
add('chords', 'chords', 'Fa simplifié et Fa petit barré', 5, 2, 'Arpège du Fa maj7 puis du petit barré : l’index couvre les deux cordes aiguës.', [
  ...arpeggio('Fmaj7', 0, 2),
  ...arpeggio('Fsmall', 2, 2),
])
add(
  'chords',
  'chords',
  'Barré de Fa, chaque corde',
  6,
  1,
  'Le grand barré corde par corde : chaque note sonne, sinon roule légèrement l’index.',
  arpeggio('F', 0, 1),
)
add(
  'chords',
  'chords',
  'Arpèges barrés forme de Mi',
  7,
  2,
  'Sol, La m, puis La en barré forme de Mi, en croches.',
  ['Gbar', 'Ambar', 'Abar'].flatMap((id, i) => arpeggio(id, i * 4, 2)),
)
add(
  'chords',
  'chords',
  'Arpèges barrés forme de La',
  8,
  2,
  'Si m, Do, Ré en barré forme de La, en croches montée-descente.',
  ['Bm', 'Cbar', 'Dbar'].flatMap((id, i) => arpeggio(id, i * 5, 2, 'updown')),
)
add(
  'chords',
  'chords',
  'Arpèges en triolets, La m, Fa, Do, Sol',
  9,
  3,
  'Un arpège par accord, trois notes par clic : la ballade rock.',
  ['Am', 'Fmaj7', 'C', 'G'].flatMap((id, i) => arpeggio(id, i * 2, 3)),
)
add(
  'chords',
  'chords',
  'Arpèges barrés en doubles croches',
  10,
  4,
  'Si m, Sol, Ré, La en barrés et doubles croches : endurance et propreté.',
  ['Bm', 'Gbar', 'Dbar', 'Abar'].flatMap((id, i) => arpeggio(id, i * 2, 4, 'updown')),
)

// Gammes : pentatoniques (5 positions), blues, majeure, mineure, séquences, 3 notes par corde.
const p = (i) => shape(`penta-am-${i}`)
add(
  'scales',
  'scales-plus',
  'Pentatonique mineure de Mi, position ouverte, noires',
  1,
  1,
  'Cordes à vide et cases 2-3 : la première gamme du rock.',
  line(upDown(shape('penta-em-open')), 1),
)
add(
  'scales',
  'scales-plus',
  'Pentatonique mineure de La (position 1), noires',
  2,
  1,
  'Montée et descente, un doigt par case (index en case 5).',
  line(upDown(p(1)), 1),
)
add('scales', 'scales-plus', 'Pentatonique mineure de La (position 1), croches', 3, 2, 'Deux notes par clic, aller-retour au médiator.', line(upDown(p(1)), 2))
for (const i of [2, 3, 4, 5])
  add(
    'scales',
    'scales-plus',
    `Pentatonique mineure de La (position ${i}), croches`,
    3 + Math.ceil(i / 2),
    2,
    `La position ${i}, montée et descente. Repère où tombent les La (fondamentale).`,
    line(upDown(p(i)), 2),
  )
add(
  'scales',
  'scales-plus',
  'Positions 1 et 2 reliées, croches',
  5,
  2,
  'Monte en position 1, glisse en position 2 sur la corde de Si, redescends en position 2.',
  line([...up(p(1)), ...down(p(2))], 2),
)
add(
  'scales',
  'scales-plus',
  'Pentatonique en groupes de trois, croches',
  5,
  2,
  'Séquence 1-2-3, 2-3-4… sur la position 1 : sort de la gamme « montée-descente ».',
  line(groups(up(p(1)), 3), 2),
)
add(
  'scales',
  'scales-plus',
  'Pentatonique en groupes de quatre, doubles croches',
  7,
  4,
  'Séquence par 4 sur la position 1 : le classique des solos rock.',
  line(groups(up(p(1)), 4), 4),
)
add(
  'scales',
  'scales-plus',
  'Pentatonique sur 5 positions, croches',
  8,
  2,
  'Les 5 positions enchaînées en montant le manche, une position par mesure.',
  line(
    [1, 2, 3, 4, 5].flatMap((i) => up(p(i))),
    2,
  ),
)
add(
  'scales',
  'scales-plus',
  'Pentatonique (position 1) en doubles croches',
  8,
  4,
  'Montée et descente à quatre notes par clic : vise 120 en restant propre.',
  line(upDown(p(1)), 4),
)
add('scales', 'scales-plus', 'Pentatonique en triolets descendants', 9, 3, 'Groupes de 3 en descendant, trois notes par clic.', line(groups(down(p(1)), 3), 3))
add(
  'scales',
  'scales-plus',
  'Gamme blues de Mi, position ouverte',
  3,
  2,
  'La pentatonique avec la quinte diminuée (blue note) : écoute la tension.',
  line(upDown(shape('blues-e-open')), 2),
)
add(
  'scales',
  'scales-plus',
  'Gamme blues de La, position 1',
  4,
  2,
  'Blue note en case 6 sur la corde de La et case 8 sur celle de Sol.',
  line(upDown(shape('blues-a-1')), 2),
)
add(
  'scales',
  'scales-plus',
  'Pentatonique majeure de Sol',
  4,
  2,
  'Le son « country-rock » : même forme, autre fondamentale.',
  line(upDown(shape('penta-major-g-1')), 2),
)
add(
  'scales',
  'scales-plus',
  'Gamme majeure de Sol (2e position), croches',
  4,
  2,
  'Deux octaves, un doigt par case, cases 2 à 5.',
  line(upDown(shape('major-g-2')), 2),
)
add(
  'scales',
  'scales-plus',
  'Gamme majeure de Do (7e position), croches',
  5,
  2,
  'La même forme ailleurs sur le manche : repère les Do.',
  line(upDown(shape('major-c-7')), 2),
)
add(
  'scales',
  'scales-plus',
  'Gamme mineure de La (5e position), croches',
  5,
  2,
  'Le mineur naturel : sept notes, le son des riffs mélodiques.',
  line(upDown(shape('minor-a-5')), 2),
)
add(
  'scales',
  'scales-plus',
  'Gamme majeure en groupes de trois',
  6,
  2,
  'Séquence par 3 sur la gamme de Sol, 2e position.',
  line(groups(up(shape('major-g-2')), 3), 2),
)
add(
  'scales',
  'scales-plus',
  'Gamme majeure en tierces',
  7,
  2,
  'Une note, puis celle deux degrés plus haut : 1-3, 2-4, 3-5…',
  line(
    up(shape('major-g-2'))
      .slice(0, -2)
      .flatMap((x, i, all) => [x, up(shape('major-g-2'))[i + 2]]),
    2,
  ),
)
add(
  'scales',
  'scales-plus',
  'Gamme majeure, 3 notes par corde',
  8,
  4,
  'Trois notes par corde : le doigté des guitaristes rapides, en doubles croches.',
  line(upDown(shape('major-g-3nps')), 4),
)
add(
  'scales',
  'scales-plus',
  'Gamme mineure de Mi, 3 notes par corde',
  9,
  4,
  'Mineur naturel en 3 notes par corde, haut du manche.',
  line(upDown(shape('minor-e-3nps')), 4),
)
add(
  'scales',
  'scales-plus',
  'Mineure 3 notes par corde en groupes de six',
  10,
  3,
  'Groupes de 6 en triolets sur deux cordes : le motif des shredders.',
  line(groups(up(shape('minor-e-3nps')), 6).slice(0, 48), 3),
)

// Picking : aller-retour, saut de cordes, trémolo, vitesse.
add(
  'picking',
  'picking-plus',
  'Aller-retour sur une note, croches',
  2,
  2,
  'Une seule note (case 5 du Mi grave), bas-haut régulier : écoute que les deux sons sont égaux.',
  line(Array(8).fill([6, 5]), 2),
)
add(
  'picking',
  'picking-plus',
  'Aller-retour sur une note, doubles croches',
  4,
  4,
  'Quatre coups par clic, petits gestes du poignet.',
  line(Array(16).fill([6, 5]), 4),
)
add(
  'picking',
  'picking-plus',
  'Changement de corde, deux notes par corde',
  4,
  2,
  'Deux notes par corde : le médiator change de corde sur un coup vers le bas.',
  line(
    STRINGS_LOW_TO_HIGH.flatMap((s) => [
      [s, 5],
      [s, 7],
    ]),
    2,
  ),
)
add(
  'picking',
  'picking-plus',
  'Changement de corde, trois notes par corde',
  5,
  3,
  'Trois notes par corde : le changement tombe une fois sur un coup bas, une fois sur un coup haut.',
  line(
    STRINGS_LOW_TO_HIGH.flatMap((s) => [
      [s, 5],
      [s, 7],
      [s, 8],
    ]),
    3,
  ),
)
add(
  'picking',
  'picking-plus',
  'Saut de cordes, croches',
  5,
  2,
  'Mi grave puis Ré, La puis Sol… : le médiator saute une corde.',
  line(
    [
      [6, 5],
      [4, 7],
      [5, 5],
      [3, 7],
      [4, 5],
      [2, 6],
      [3, 5],
      [1, 5],
    ],
    2,
  ),
)
add(
  'picking',
  'picking-plus',
  'Trémolo sur une note',
  6,
  4,
  'Doubles croches très régulières sur une note, comme dans le metal mélodique.',
  line(Array(16).fill([2, 8]), 4),
)
add(
  'picking',
  'picking-plus',
  'Trémolo mélodique',
  7,
  4,
  'Le trémolo qui suit une mélodie : quatre coups par note.',
  line(
    [
      [2, 5],
      [2, 7],
      [2, 8],
      [2, 10],
    ].flatMap((x) => Array(4).fill(x)),
    4,
  ),
)
add(
  'picking',
  'picking-plus',
  'Pédale sur corde à vide',
  7,
  4,
  'Mi aigu à vide entre chaque note de la mélodie : le son des riffs néoclassiques.',
  line(
    [5, 7, 8, 7, 5, 3, 2, 3].flatMap((f) => [
      [1, f],
      [1, 0],
    ]),
    4,
  ),
)
add(
  'picking',
  'picking-plus',
  'Saut de cordes en doubles croches',
  8,
  4,
  'Arpège en saut de cordes à quatre notes par clic.',
  line(
    [
      [5, 7],
      [3, 9],
      [3, 7],
      [1, 7],
      [1, 8],
      [3, 7],
      [3, 9],
      [5, 7],
      [5, 5],
      [3, 7],
      [3, 5],
      [1, 5],
      [1, 7],
      [3, 5],
      [3, 7],
      [5, 5],
    ],
    4,
  ),
)
add(
  'picking',
  'picking-plus',
  'Picking extérieur et intérieur',
  8,
  4,
  'Deux cordes voisines, une note chacune : le médiator passe tantôt dedans, tantôt dehors.',
  line(
    Array.from({ length: 16 }, (_, i) => (i % 2 ? [2, 8] : [3, 7])),
    4,
  ),
)
add(
  'picking',
  'picking-plus',
  'Rafales de vitesse (bursts)',
  9,
  4,
  'Quatre notes rapides, une pause : la vitesse par petits paquets.',
  [0, 1, 2, 3].flatMap((b) =>
    line(
      [
        [1, 5],
        [1, 8],
        [2, 8],
        [2, 5],
      ].slice(0, 3),
      4,
      b,
    ),
  ),
)
add(
  'picking',
  'picking-plus',
  'Trémolo, 6 cordes',
  10,
  4,
  'Quatre coups par note, de la corde grave à l’aiguë et retour, à pleine vitesse.',
  line(
    [...STRINGS_LOW_TO_HIGH, ...[...STRINGS_LOW_TO_HIGH].reverse()].flatMap((s) => Array(4).fill([s, 7])),
    4,
  ),
)

// Legato : liés, trilles, 3 notes par corde.
/** Liés : sur une même corde, la note suivante est frappée (hammer, plus aiguë) ou tirée (pull, plus grave). `attackEvery` : une attaque toutes les N notes. */
const tie = (notes, attackEvery) =>
  notes.map((x, i) => {
    const prev = notes[i - 1]
    if (i % attackEvery === 0 || !prev || prev.string !== x.string) return x
    return { ...x, technique: x.fret > prev.fret ? 'hammer' : 'pull' }
  })
const lig = (pairs, sub, from = 0) => tie(line(pairs, sub, from), 2)
add(
  'legato',
  'legato-plus',
  'Hammer-on 5-7, une corde',
  2,
  2,
  'Attaque la case 5, frappe la 7 sans repiquer : les deux notes ont le même volume.',
  lig(
    Array(4)
      .fill([
        [3, 5],
        [3, 7],
      ])
      .flat(),
    2,
  ),
)
add(
  'legato',
  'legato-plus',
  'Pull-off 7-5, une corde',
  3,
  2,
  'Attaque la case 7, tire la corde vers le bas en relâchant : la 5 doit sonner.',
  lig(
    Array(4)
      .fill([
        [3, 7],
        [3, 5],
      ])
      .flat(),
    2,
  ),
)
add(
  'legato',
  'legato-plus',
  'Hammer et pull, pentatonique',
  4,
  2,
  'Pentatonique position 1 en liés : une attaque, une note liée, sur chaque corde.',
  lig(up(p(1)), 2),
)
add(
  'legato',
  'legato-plus',
  'Trille index-majeur',
  5,
  4,
  'Hammer-pull rapides entre les cases 5 et 6 : régularité avant vitesse.',
  lig(
    Array(16)
      .fill(0)
      .map((_, i) => [3, i % 2 ? 6 : 5]),
    4,
  ),
)
add(
  'legato',
  'legato-plus',
  'Trille index-annulaire',
  6,
  4,
  'Cases 5 et 7, quatre notes par clic.',
  lig(
    Array(16)
      .fill(0)
      .map((_, i) => [2, i % 2 ? 7 : 5]),
    4,
  ),
)
add(
  'legato',
  'legato-plus',
  'Trille index-auriculaire',
  7,
  4,
  'Cases 5 et 8 : l’auriculaire travaille, garde l’index posé.',
  lig(
    Array(16)
      .fill(0)
      .map((_, i) => [1, i % 2 ? 8 : 5]),
    4,
  ),
)
add(
  'legato',
  'legato-plus',
  'Legato 3 notes par corde',
  8,
  3,
  'Une attaque, deux liées sur chaque corde (gamme majeure de Sol).',
  tie(line(up(shape('major-g-3nps')), 3), 3),
)
add(
  'legato',
  'legato-plus',
  'Legato 3 notes par corde, descente',
  9,
  3,
  'La descente en pull-off, une attaque par corde.',
  tie(line(down(shape('minor-e-3nps')), 3), 3),
)
add(
  'legato',
  'legato-plus',
  'Legato rapide, doubles croches',
  10,
  4,
  'Trois notes par corde en doubles croches, tout lié sauf la première note de chaque corde.',
  tie(line(upDown(shape('minor-e-3nps')), 4), 3),
)

// Bends : justesse et contrôle (vérifiables avec l’accordeur).
const bendTo = (s, f, beat, dur) => n(s, f, beat, dur, 'bend')
add('bends', 'bends-plus', 'Bend d’un demi-ton, corde de Sol', 3, 1, 'Pousse la case 7 jusqu’à sonner comme la case 8, puis vérifie en jouant la 8.', [
  n(3, 8, 0, 1),
  bendTo(3, 7, 1, 1),
  n(3, 8, 2, 1),
  bendTo(3, 7, 3, 1),
])
add('bends', 'bends-plus', 'Bend d’un ton, corde de Si', 4, 1, 'Case 8 poussée jusqu’à la hauteur de la case 10 : trois doigts poussent ensemble.', [
  n(2, 10, 0, 1),
  bendTo(2, 8, 1, 1),
  n(2, 10, 2, 1),
  bendTo(2, 8, 3, 1),
])
add('bends', 'bends-plus', 'Bend et retour', 5, 2, 'Monte d’un ton, tiens, redescends à la note de départ sans la rejouer.', [
  bendTo(3, 7, 0, 1),
  n(3, 7, 1, 1),
  bendTo(2, 8, 2, 1),
  n(2, 8, 3, 1),
])
add('bends', 'bends-plus', 'Bends de la pentatonique', 6, 2, 'Les bends classiques de la position 1 : case 7 (Sol), case 8 (Si), case 8 (Mi aigu).', [
  bendTo(3, 7, 0, 1),
  n(2, 5, 1, 0.5),
  n(2, 8, 1.5, 0.5),
  bendTo(2, 8, 2, 1),
  n(1, 5, 3, 0.5),
  bendTo(1, 8, 3.5, 0.5),
])
add('bends', 'bends-plus', 'Bend à l’unisson', 7, 1, 'Corde de Sol case 7 poussée d’un ton pendant que la case 5 du Si sonne : les deux notes fusionnent.', [
  bendTo(3, 7, 0, 2),
  n(2, 5, 0, 2),
  bendTo(3, 7, 2, 2),
  n(2, 5, 2, 2),
])
add('bends', 'bends-plus', 'Bend d’un ton et demi', 8, 1, 'Pousse la case 7 du Sol d’un ton et demi : vise la hauteur de la case 10.', [
  n(3, 10, 0, 1),
  bendTo(3, 7, 1, 1),
  n(3, 10, 2, 1),
  bendTo(3, 7, 3, 1),
])
add(
  'bends',
  'bends-plus',
  'Bends enchaînés en croches',
  9,
  2,
  'Un bend par croche sur trois cordes, retour juste à chaque fois.',
  [0, 1, 2, 3].flatMap((b) => [bendTo(3, 7, b, 0.5), bendTo(2, 8, b + 0.5, 0.5)]),
)

// Palm muting : main droite du rock et du metal.
add(
  'palmMuting',
  'palmMuting-plus',
  'Palm mute, croches sur Mi grave',
  2,
  2,
  'Paume posée sur les cordes juste devant le chevalet : son court et sourd, bas-haut.',
  line(Array(8).fill([6, 0]), 2, 0, 'palmMute'),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Palm mute, croches avec power chords',
  3,
  2,
  'Mi grave étouffé, puis Sol 5 et La 5 étouffés : la paume suit la main.',
  riff(
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, i) => [6, [0, 0, 3, 3, 0, 0, 5, 5][i], b, 0.5]),
    { tech: 'palmMute' },
  ),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Étouffé, ouvert, étouffé',
  4,
  2,
  'Alterne croches étouffées et notes ouvertes : la paume se lève et se repose.',
  line(
    [0, 0, 0, 3, 0, 0, 0, 5].map((f) => [6, f]),
    2,
  ).map((x, i) => (i % 4 === 3 ? x : { ...x, technique: 'palmMute' })),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Palm mute, doubles croches',
  6,
  4,
  'Quatre coups étouffés par clic sur le Mi grave : régularité totale.',
  line(Array(16).fill([6, 0]), 4, 0, 'palmMute'),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Accents sur doubles croches étouffées',
  7,
  4,
  'Accent ouvert sur le 1er et le 4e coup de chaque groupe : le riff « syncopé ».',
  line(
    Array.from({ length: 16 }, (_, i) => [6, i % 4 === 0 || i % 4 === 3 ? 2 : 0]),
    4,
  ).map((x, i) => (i % 4 === 0 || i % 4 === 3 ? x : { ...x, technique: 'palmMute' })),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Galop étouffé, corde de La',
  8,
  4,
  'Croche puis deux doubles, sur la corde de La, avec changements de case.',
  [0, 1, 2, 3].flatMap((b, i) =>
    line(Array(3).fill([5, [0, 0, 3, 2][i]]), 4, b, 'palmMute').map((x, j) => ({ ...x, startBeat: b + [0, 0.5, 0.75][j], duration: j ? 0.25 : 0.5 })),
  ),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Chug metal, triolets',
  9,
  3,
  'Trois coups étouffés par clic : le rythme des ballades metal lourdes.',
  line(Array(12).fill([6, 0]), 3, 0, 'palmMute'),
)
add(
  'palmMuting',
  'palmMuting-plus',
  'Chug metal rapide',
  10,
  4,
  'Doubles croches étouffées à pleine vitesse, avec deux accents par mesure.',
  line(
    Array.from({ length: 16 }, (_, i) => [6, i === 7 || i === 15 ? 3 : 0]),
    4,
  ).map((x, i) => (i === 7 || i === 15 ? x : { ...x, technique: 'palmMute' })),
)

// Arpèges : triades sur trois cordes.
const triad = (pairs, sub) => line(pairs, sub)
add(
  'arpeggios',
  'arpeggios-plus',
  'Triade majeure sur 3 cordes aiguës',
  4,
  2,
  'La majeur : case 6 sur la corde de Sol, case 5 sur Si et Mi aigu. Monte et redescends.',
  triad(
    [
      [3, 6],
      [2, 5],
      [1, 5],
      [2, 5],
    ],
    2,
  ),
)
add(
  'arpeggios',
  'arpeggios-plus',
  'Triade mineure sur 3 cordes aiguës',
  4,
  2,
  'La mineur : un demi-ton de différence avec le majeur, écoute-le.',
  triad(
    [
      [3, 5],
      [2, 5],
      [1, 5],
      [2, 5],
    ],
    2,
  ),
)
add(
  'arpeggios',
  'arpeggios-plus',
  'Triades, La m, Fa, Do, Sol',
  6,
  2,
  'Une triade par accord sur les trois cordes aiguës, sans quitter le haut du manche.',
  triad(
    [
      [3, 5],
      [2, 5],
      [1, 5],
      [3, 5],
      [2, 6],
      [1, 5],
      [3, 5],
      [2, 5],
      [1, 8],
      [3, 7],
      [2, 8],
      [1, 7],
    ],
    2,
  ),
)
add(
  'arpeggios',
  'arpeggios-plus',
  'Arpège mineur sur 5 cordes',
  7,
  3,
  'La mineur en partant de la corde de La, case 12 : fondamentale, tierce, quinte.',
  triad(
    [
      [5, 12],
      [4, 10],
      [3, 9],
      [2, 10],
      [1, 8],
      [2, 10],
      [3, 9],
      [4, 10],
    ],
    3,
  ),
)
add(
  'arpeggios',
  'arpeggios-plus',
  'Arpège majeur sur 5 cordes',
  8,
  3,
  'Do majeur depuis la corde de La, case 3.',
  triad(
    [
      [5, 3],
      [4, 2],
      [3, 0],
      [2, 1],
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 2],
    ],
    3,
  ),
)
add(
  'arpeggios',
  'arpeggios-plus',
  'Arpèges enchaînés en doubles croches',
  9,
  4,
  'La m puis Ré m puis Mi, quatre notes par clic.',
  triad(
    [
      [5, 12],
      [4, 10],
      [3, 9],
      [2, 10],
      [4, 12],
      [3, 10],
      [2, 10],
      [1, 10],
      [6, 12],
      [5, 11],
      [4, 9],
      [3, 9],
    ],
    4,
  ),
)

// Rythme : riffs complets, contretemps, groove.
add(
  'rhythm',
  'rhythm-plus',
  'Riff blues-rock (shuffle simplifié)',
  3,
  2,
  'La 5 puis La 6 sur deux cordes, en croches : le riff des boogies rock.',
  [0, 1, 2, 3].flatMap((b, i) => [n(5, 0, b, 0.5), n(4, i % 2 ? 4 : 2, b, 0.5), n(5, 0, b + 0.5, 0.5), n(4, i % 2 ? 4 : 2, b + 0.5, 0.5)]),
)
add(
  'rhythm',
  'rhythm-plus',
  'Riff à contretemps',
  5,
  2,
  'Les accords tombent entre les clics : compte « 1 et 2 et » à voix haute.',
  riff([
    [6, 0, 0.5, 0.5],
    [6, 3, 1.5, 0.5],
    [6, 5, 2.5, 0.5],
    [6, 3, 3.5, 0.5],
  ]),
)
add('rhythm', 'rhythm-plus', 'Riff avec notes seules et accords', 6, 2, 'Ligne sur la corde de Mi grave, accord sur les temps 2 et 4.', [
  ...line(
    [
      [6, 0],
      [6, 0],
      [6, 3],
    ],
    2,
    0,
  ),
  ...pc(6, 5, 1.5, 0.5),
  ...line(
    [
      [6, 0],
      [6, 0],
      [6, 3],
    ],
    2,
    2,
  ),
  ...pc(6, 7, 3.5, 0.5),
])
add(
  'rhythm',
  'rhythm-plus',
  'Riff hard rock en doubles croches',
  8,
  4,
  'Pédale de Mi grave et notes de la gamme blues : le riff des années 80.',
  line(
    [
      [6, 0],
      [6, 0],
      [5, 2],
      [6, 0],
      [6, 0],
      [5, 3],
      [6, 0],
      [5, 2],
      [6, 0],
      [6, 0],
      [5, 0],
      [6, 0],
      [6, 3],
      [6, 2],
      [6, 0],
      [6, 0],
    ],
    4,
  ),
)
add(
  'rhythm',
  'rhythm-plus',
  'Riff syncopé metal',
  9,
  4,
  'Accords décalés sur la double croche, le reste étouffé : précision rythmique totale.',
  riff(Array.from({ length: 16 }, (_, i) => [6, [3, 6, 9, 14].includes(i) ? 3 : 0, i / 4, 0.25, [3, 6, 9, 14].includes(i) ? undefined : 'palmMute'])),
)
add(
  'rhythm',
  'rhythm-plus',
  'Riff thrash en galop inversé',
  10,
  4,
  'Deux doubles puis une croche, étouffé, avec accords : le galop à l’envers.',
  riff(
    [0, 1, 2, 3].flatMap((b, i) => [
      [6, 0, b, 0.25, 'palmMute'],
      [6, 0, b + 0.25, 0.25, 'palmMute'],
      [6, [3, 5, 6, 5][i], b + 0.5, 0.5],
    ]),
  ),
)

for (const [file, { items }] of Object.entries(bank)) write(`exercises/${file}.json`, items)
console.log(
  Object.entries(bank)
    .map(([f, b]) => `${f}: ${b.items.length}`)
    .join(', '),
  '· total',
  Object.values(bank).reduce((t, b) => t + b.items.length, 0),
)
