/**
 * Parcours des accords (lot 18) et des gammes (lot 19) : les 46 accords du module, un par un, dans l'ordre où on les apprend.
 * Pour chaque accord : sa forme, puis la transition depuis un accord déjà su ; en fin de bloc, une boucle qui les enchaîne.
 * Chaque étape est une compétence ordinaire du moteur (prérequis = l'étape d'avant), mais hors des 3 en cours et hors niveaux.
 * Textes de ma plume ; les formes viennent de chords.json.
 */
import chordsJson from './chords.json'
import scalesJson from './scales.json'
import type { Chord, ScaleShape, Skill } from './index'

const CHORDS = chordsJson as Chord[]
const SCALES = scalesJson as ScaleShape[]
const chordName = (id: string) => CHORDS.find((c) => c.id === id)?.name ?? id
const scaleName = (id: string) => SCALES.find((c) => c.id === id)?.name ?? id

interface Block {
  id: string
  name: string
  why: string
  /** Accord → accord déjà su avec lequel on travaille la transition (le premier n'en a pas). */
  chords: [id: string, partner?: string][]
  /** Changements par minute demandés pour une transition, puis pour la boucle. */
  change: number
  loop: number
}

export const CHORD_BLOCKS: Block[] = [
  {
    id: 'open',
    name: 'Accords ouverts',
    why: 'Les accords de base du rock et de la chanson : avec eux, tu accompagnes déjà des centaines de morceaux.',
    chords: [['Em'], ['Am', 'Em'], ['E', 'Am'], ['A', 'E'], ['D', 'A'], ['G', 'D'], ['C', 'G'], ['Dm', 'D']],
    change: 20,
    loop: 15,
  },
  {
    id: 'sus',
    name: 'Suspendus et ajoutés',
    why: 'Ils colorent un accord sans changer ta main : deux doigts de moins ou un de plus.',
    chords: [
      ['Asus2', 'A'],
      ['Dsus2', 'D'],
      ['Dsus4', 'Dsus2'],
      ['Cadd9', 'C'],
    ],
    change: 20,
    loop: 15,
  },
  {
    id: 'seventh',
    name: 'Accords de 7e',
    why: 'Le blues, le rock et le jazz les utilisent partout : un doigt retiré ou ajouté à un accord que tu connais.',
    chords: [
      ['E7', 'E'],
      ['A7', 'A'],
      ['D7', 'D'],
      ['Em7', 'Em'],
      ['Am7', 'Am'],
      ['G7', 'G'],
      ['C7', 'C'],
      ['B7', 'Em'],
    ],
    change: 20,
    loop: 15,
  },
  {
    id: 'simplified',
    name: 'Fa simplifié et variantes',
    why: 'Le Fa complet est un barré : ces versions te laissent jouer les grilles qui en ont besoin, en attendant.',
    chords: [
      ['Fmaj7', 'C'],
      ['Fsmall', 'Fmaj7'],
      ['Gsimple', 'C'],
      ['Csimple', 'Gsimple'],
    ],
    change: 20,
    loop: 15,
  },
  {
    id: 'power',
    name: 'Power chords',
    why: 'Deux ou trois cordes, un son plein : la base du rock et du metal, et une forme qui se déplace partout sur le manche.',
    chords: [
      ['E5'],
      ['A5', 'E5'],
      ['D5', 'A5'],
      ['G5', 'D5'],
      ['C5', 'G5'],
      ['F5', 'C5'],
      ['B5', 'F5'],
      ['A5r6', 'E5'],
      ['D5r5', 'A5r6'],
      ['E5oct', 'E5'],
      ['G5oct', 'E5oct'],
    ],
    change: 30,
    loop: 25,
  },
  {
    id: 'barre',
    name: 'Barrés',
    why: 'Une seule forme, déplaçable sur tout le manche : un barré appris, c’est douze accords de plus.',
    chords: [
      ['F', 'Fsmall'],
      ['Fm', 'F'],
      ['Gbar', 'F'],
      ['Gmbar', 'Gbar'],
      ['Abar', 'Gbar'],
      ['Ambar', 'Abar'],
      ['Bb', 'F'],
      ['Bm', 'Bb'],
      ['Cbar', 'Bb'],
      ['Cmbar', 'Cbar'],
      ['Dbar', 'Cbar'],
    ],
    change: 12,
    loop: 10,
  },
]

const FORM_ITEMS: Record<Chord['kind'], string[]> = {
  open: [
    'Chaque doigt sur la bonne case, comme sur le diagramme',
    'Les cordes jouées sonnent clair, aucune ne grésille',
    'Les cordes marquées d’une croix ne sonnent pas',
    'Trois fois de suite, en reposant la main entre deux',
  ],
  seventh: [
    'Chaque doigt sur la bonne case, comme sur le diagramme',
    'Les cordes jouées sonnent clair, aucune ne grésille',
    'Les cordes marquées d’une croix ne sonnent pas',
    'Trois fois de suite, en reposant la main entre deux',
  ],
  simplified: [
    'Chaque doigt sur la bonne case, comme sur le diagramme',
    'Les cordes jouées sonnent clair, aucune ne grésille',
    'Les cordes marquées d’une croix ne sonnent pas',
    'Trois fois de suite, en reposant la main entre deux',
  ],
  power: [
    'Les doigts sont placés comme sur le diagramme',
    'Seules les cordes du diagramme sonnent : le bout du doigt étouffe les autres',
    'Le son est net sur chaque corde jouée',
    'Trois fois de suite, en reposant la main entre deux',
  ],
  barre: [
    'L’index barre toutes les cordes prévues, bien à plat',
    'Chaque corde sonne clair, sans grésillement',
    'Le pouce derrière le manche, le poignet détendu',
    'Trois fois de suite, en reposant la main entre deux',
  ],
}

const FORM_HOWTO: Record<Chord['kind'], string> = {
  open: 'Pose les doigts un par un en suivant le diagramme, puis gratte les cordes une à une pour trouver celle qui grésille. Ajuste, et recommence en lâchant tout entre chaque essai.',
  seventh: 'Pars de l’accord voisin que tu connais, puis ajoute ou retire le doigt qui change. Vérifie chaque corde l’une après l’autre.',
  simplified: 'Cette forme évite le barré : joue seulement les cordes du diagramme et laisse les autres muettes.',
  power:
    'Place le premier doigt sur la corde grave, le suivant deux cases plus loin sur la corde d’à côté. Étouffe les cordes inutiles avec le bout des doigts.',
  barre:
    'Allonge l’index sur toutes les cordes du barré, côté du doigt plutôt qu’à plat sur l’os. Appuie près de la frette, pas au milieu de la case. Il faut du temps : commence par 5 secondes de tenue.',
}

const tipsFor = (kind: Chord['kind']): string[] =>
  kind === 'barre'
    ? [
        'Une corde sourde ? Fais rouler l’index un peu vers l’arrière.',
        'Le poignet fatigue ? Fais une pause d’une minute : le barré se construit sur plusieurs jours.',
      ]
    : ['Une corde grésille ? Rapproche le doigt de la frette, sans appuyer plus fort.', 'Coupe les ongles de la main gauche si les doigts glissent.']

const LEVEL: Record<string, number> = { open: 1, sus: 2, seventh: 2, simplified: 2, power: 1, barre: 4 }

/** Les étapes du parcours, dans l'ordre. Chaque étape demande la précédente. */
export const CHORD_TRACK: Skill[] = (() => {
  const out: Skill[] = []
  const push = (s: Omit<Skill, 'prerequisites' | 'exerciseIds' | 'tips' | 'pillar' | 'track'> & { tips?: string[] }) =>
    out.push({ pillar: 'left_hand', exerciseIds: [], tips: [], ...s, prerequisites: out.length ? [out[out.length - 1].id] : [], track: 'chords' })
  for (const b of CHORD_BLOCKS) {
    for (const [id, partner] of b.chords) {
      const chord = CHORDS.find((c) => c.id === id)!
      push({
        id: `chord-${id}`,
        level: LEVEL[b.id],
        name: `Forme · ${chordName(id)}`,
        block: b.name,
        chordIds: [id],
        why: b.why,
        howTo: FORM_HOWTO[chord.kind],
        validation: { kind: 'checklist', items: FORM_ITEMS[chord.kind], sessions: 1 },
        tips: tipsFor(chord.kind),
      })
      if (partner)
        push({
          id: `change-${partner}-${id}`,
          level: LEVEL[b.id],
          name: `Transition · ${chordName(partner)} ↔ ${chordName(id)}`,
          block: b.name,
          chordIds: [partner, id],
          why: 'Savoir un accord ne suffit pas : c’est le changement, sans arrêter le rythme, qui fait jouer une chanson.',
          howTo:
            'Pose les deux accords l’un après l’autre sans regarder la main droite. Cherche d’abord les doigts qui ne bougent pas, puis déplace tous les autres en même temps. Lance 60 secondes et compte chaque changement propre.',
          validation: { kind: 'changes_per_minute', chords: [[partner, id]], target: b.change, sessions: 2 },
          tips: ['Trop lent ? Ralentis encore : la vitesse vient de la précision.', 'Fixe le premier accord avant de lâcher pour le second.'],
        })
    }
    const ids = b.chords.map(([id]) => id)
    push({
      id: `loop-${b.id}`,
      level: LEVEL[b.id],
      name: `Boucle · ${b.name}`,
      block: b.name,
      chordIds: ids,
      why: 'Enchaîner tout le bloc fait le lien entre les accords, pas seulement les paires.',
      howTo: `Joue les accords dans l’ordre (${ids.map(chordName).join(', ')}), en boucle, sans t’arrêter entre deux. Compte les changements propres en 60 secondes.`,
      validation: { kind: 'changes_per_minute', chords: ids.slice(1).map((id, i) => [ids[i], id] as [string, string]), target: b.loop, sessions: 2 },
      tips: ['Repère les paires qui te ralentissent et retravaille-les à part.'],
    })
  }
  return out
})()

interface ScaleBlock {
  id: string
  name: string
  why: string
  kind: 'penta' | 'blues' | 'seven'
  scales: string[]
  /** Les positions voisines se relient, puis une boucle les enchaîne toutes. */
  linked?: boolean
}

export const SCALE_BLOCKS: ScaleBlock[] = [
  {
    id: 'penta-am',
    name: 'Pentatonique mineure de La',
    why: 'La gamme des solos rock et blues : cinq notes par octave, cinq positions qui couvrent tout le manche.',
    kind: 'penta',
    scales: ['penta-am-1', 'penta-am-2', 'penta-am-3', 'penta-am-4', 'penta-am-5'],
    linked: true,
  },
  {
    id: 'penta-more',
    name: 'Autres pentatoniques et blues',
    why: 'Même forme de pensée dans une autre tonalité, plus la note bleue du blues qui ajoute de la tension.',
    kind: 'blues',
    scales: ['penta-em-open', 'penta-major-g-1', 'blues-a-1', 'blues-e-open'],
  },
  {
    id: 'seven',
    name: 'Gammes majeure et mineure',
    why: 'Sept notes au lieu de cinq : la base pour comprendre une mélodie, un accord ou un solo plus riche.',
    kind: 'seven',
    scales: ['major-g-2', 'major-c-7', 'minor-a-5', 'major-g-3nps', 'minor-e-3nps'],
  },
]

const SCALE_HOWTO: Record<ScaleBlock['kind'], string> = {
  penta:
    'Apprends la forme à l’arrêt en la regardant, puis sans regarder. Joue chaque note lentement, montée puis descente, en alternant les coups de médiator. Repère les points entourés : ce sont les notes de repos (la fondamentale).',
  blues:
    'Même méthode : forme à l’arrêt, puis lente, montée et descente. Repère la note supplémentaire du blues (la « note bleue ») : elle crée la tension, ne t’y arrête pas trop longtemps.',
  seven:
    'Cette forme a plus de notes : travaille-la corde par corde, puis en entier. Garde les doigts près des frettes et un doigt par case pour que le déplacement reste régulier.',
}

const SCALE_ITEMS = [
  'Toutes les notes dans l’ordre du diagramme, montée puis descente, sans faute',
  'Doigtés respectés : un doigt par case, comme sur le diagramme',
  'À 60 BPM au métronome, trois fois de suite',
  'Notes régulières, sans bruit parasite entre elles',
]

const positionOf = (id: string) => SCALES.find((c) => c.id === id)?.position ?? 0

/** Les étapes du parcours des gammes : chaque forme, la liaison avec la suivante, puis une boucle des positions reliées. */
export const SCALE_TRACK: Skill[] = (() => {
  const out: Skill[] = []
  const push = (s: Omit<Skill, 'prerequisites' | 'exerciseIds' | 'tips' | 'pillar' | 'track'> & { tips?: string[] }) =>
    out.push({ pillar: 'technique', exerciseIds: [], tips: [], ...s, prerequisites: out.length ? [out[out.length - 1].id] : [], track: 'scales' })
  for (const b of SCALE_BLOCKS) {
    b.scales.forEach((id, i) => {
      push({
        id: `scale-${id}`,
        level: b.kind === 'seven' ? 4 : 3,
        name: `Forme · ${scaleName(id)}`,
        block: b.name,
        scaleIds: [id],
        why: b.why,
        howTo: SCALE_HOWTO[b.kind],
        validation: { kind: 'checklist', items: SCALE_ITEMS, sessions: 2 },
        tips: ['Un doigt qui traîne ? Ralentis jusqu’à ce que chaque note sorte nette.', 'Joue avec le métronome dès que la forme est connue, même très lent.'],
      })
      const next = b.scales[i + 1]
      if (b.linked && next)
        push({
          id: `link-${id}-${positionOf(next)}`,
          level: 3,
          name: `Liaison · position ${positionOf(id)} → ${positionOf(next)}`,
          block: b.name,
          scaleIds: [id, next],
          why: 'Une position seule te garde au même endroit du manche : c’est la liaison qui te fait monter et descendre le long du manche.',
          howTo:
            'Deux positions voisines partagent des notes sur les mêmes cordes. Joue la première, glisse un doigt sur la case commune en changeant de position, continue dans la seconde, puis refais le chemin dans l’autre sens.',
          validation: {
            kind: 'checklist',
            items: [
              'Aller : de la première à la seconde position, sans pause audible',
              'Retour : de la seconde à la première, sans pause audible',
              'La glissade est nette, sans bruit parasite',
              'Trois fois de suite, à 60 BPM',
            ],
            sessions: 1,
          },
          tips: ['Regarde la case d’arrivée avant de glisser, pas ta main.'],
        })
    })
    if (b.linked)
      push({
        id: `loop-${b.id}`,
        level: 3,
        name: `Boucle · ${b.name}`,
        block: b.name,
        scaleIds: b.scales,
        why: 'Enchaîner toutes les positions fait de la gamme un seul chemin sur le manche.',
        howTo:
          'Joue la première position, relie-la à la suivante, et ainsi de suite jusqu’à la dernière ; redescends par le même chemin. Garde une pulsation régulière au métronome.',
        validation: {
          kind: 'checklist',
          items: ['Les cinq positions enchaînées, montée puis descente, sans arrêt', 'À 60 BPM, régulier', 'Deux fois de suite sans faute'],
          sessions: 2,
        },
        tips: ['Repère les liaisons qui te ralentissent et retravaille-les à part.'],
      })
  }
  return out
})()

/**
 * Les grosses étapes du parcours général validées d'office quand toutes les étapes qui les couvrent le sont.
 * Rien de plus : elles gardent leur état si tu les as validées autrement.
 */
export const PATH_COVERS: Record<string, string[]> = {
  'open-chords': ['Em', 'Am', 'E', 'A', 'D', 'G', 'C'].map((c) => `chord-${c}`),
  changes: ['change-Em-Am', 'change-Am-E', 'change-E-A', 'change-A-D'],
  'chords-2': ['chord-Dm', 'chord-E7', 'chord-A7', 'chord-Fsmall'],
  'changes-c-f': ['change-Fmaj7-Fsmall'],
  'power-chords': ['chord-E5', 'chord-A5'],
  'barre-f': ['chord-F'],
  barres: ['F', 'Fm', 'Gbar', 'Gmbar', 'Bb', 'Bm'].map((c) => `chord-${c}`),
  'penta-1': ['scale-penta-am-1'],
  'penta-1-2': ['scale-penta-am-2', 'link-penta-am-1-2'],
  'penta-5': ['scale-penta-am-3', 'scale-penta-am-4', 'scale-penta-am-5', 'link-penta-am-2-3', 'link-penta-am-3-4', 'link-penta-am-4-5'],
  'major-scale': ['scale-major-g-2'],
}
