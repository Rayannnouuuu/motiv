/**
 * Bibliothèque sport : les mouvements de base fournis par l'appli (musculation en salle, rangés comme un Push / Pull / Legs).
 * Les noms tapés librement dans les programmes y sont retrouvés par `findMovement` ; les inconnus deviendront des mouvements à toi.
 */

/** Ce qu'on mesure pour progresser : charge × répétitions, répétitions au poids du corps, durée ou distance. */
export type SportMetric = 'load_reps' | 'reps' | 'duration' | 'distance'

export type MuscleGroup = 'chest' | 'shoulders' | 'triceps' | 'back' | 'biceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'cardio'

export type Equipment = 'barbell' | 'dumbbells' | 'machine' | 'cable' | 'bodyweight'

export type RepRange = [min: number, max: number]

export interface SportMovement {
  /** Stable : les séances le référenceront. */
  id: string
  discipline: 'sport'
  name: string
  /** Groupe musculaire principal. */
  category: MuscleGroup
  /** Fixe le pas de la double progression : +2,5 kg en haut, +5 kg en bas. Soulevé de terre et cardio en bas, abdos en haut. */
  body: 'upper' | 'lower'
  metric: SportMetric
  /** Fourchette de la double progression, si on compte des répétitions. */
  repRange: RepRange | null
  equipment: Equipment
  /** Fourni par l'appli (les mouvements à toi viendront avec le nouveau stockage). */
  source: 'legacy'
  /**
   * Autres noms usuels, en français et en anglais. Une variante (supination, autre matériel…) n'en est pas un : elle garde son propre historique.
   * Un nom sans matériel désigne la version la plus courante (« Développé incliné » → haltères, « Presse » → presse à cuisses).
   */
  aliases: string[]
}

const mv = (
  id: string,
  name: string,
  category: MuscleGroup,
  body: SportMovement['body'],
  equipment: Equipment,
  metric: SportMetric,
  repRange: RepRange | null,
  aliases: string[],
): SportMovement => ({ id, discipline: 'sport', name, category, body, metric, repRange, equipment, source: 'legacy', aliases })

export const SPORT_MOVEMENTS: SportMovement[] = [
  // Pectoraux
  mv(
    'developpe-couche',
    'Développé couché',
    'chest',
    'upper',
    'barbell',
    'load_reps',
    [6, 10],
    ['Développé couché barre', 'DC', 'Bench', 'Bench press', 'Barbell bench press'],
  ),
  mv(
    'developpe-incline-halteres',
    'Développé incliné haltères',
    'chest',
    'upper',
    'dumbbells',
    'load_reps',
    [8, 12],
    ['Développé incliné', 'Développé incliné aux haltères', 'DI haltères', 'Incline dumbbell press'],
  ),
  mv(
    'ecarte-poulie',
    'Écarté poulie',
    'chest',
    'upper',
    'cable',
    'load_reps',
    [12, 15],
    ['Écartés à la poulie', 'Poulie vis-à-vis', 'Vis-à-vis', 'Cable fly', 'Cable crossover'],
  ),
  mv('dips', 'Dips', 'chest', 'upper', 'bodyweight', 'reps', [8, 12], ['Dips barres parallèles', 'Dips lestés', 'Barres parallèles', 'Chest dips']),
  mv('pompes', 'Pompes', 'chest', 'upper', 'bodyweight', 'reps', [10, 20], ['Push-ups', 'Pushups']),
  // Épaules
  mv(
    'developpe-militaire',
    'Développé militaire',
    'shoulders',
    'upper',
    'barbell',
    'load_reps',
    [6, 10],
    ['Développé militaire barre', 'Développé debout', 'Overhead press', 'OHP', 'Military press'],
  ),
  mv(
    'developpe-epaules-halteres',
    'Développé épaules haltères',
    'shoulders',
    'upper',
    'dumbbells',
    'load_reps',
    [8, 12],
    ['Développé assis haltères', 'Shoulder press haltères', 'Dumbbell shoulder press'],
  ),
  mv(
    'elevations-laterales',
    'Élévations latérales',
    'shoulders',
    'upper',
    'dumbbells',
    'load_reps',
    [12, 15],
    ['Élévations latérales haltères', 'Lateral raises', 'Side raises', 'Dumbbell lateral raises'],
  ),
  mv('face-pull', 'Face pull', 'shoulders', 'upper', 'cable', 'load_reps', [12, 15], ['Face pull à la corde', 'Tirage visage', 'Rope face pull']),
  // Triceps
  mv(
    'extension-triceps-poulie',
    'Extension triceps poulie',
    'triceps',
    'upper',
    'cable',
    'load_reps',
    [8, 12],
    ['Extensions triceps à la poulie', 'Extension poulie haute', 'Triceps poulie', 'Pushdown', 'Triceps pushdown', 'Cable pushdown'],
  ),
  mv(
    'barre-au-front',
    'Barre au front',
    'triceps',
    'upper',
    'barbell',
    'load_reps',
    [8, 12],
    ['Barre front', 'Extension triceps barre', 'Skull crusher', 'Skullcrusher', 'Lying triceps extension'],
  ),
  // Dos
  mv(
    'tractions',
    'Tractions',
    'back',
    'upper',
    'bodyweight',
    'reps',
    [6, 10],
    ['Tractions pronation', 'Tractions lestées', 'Tractions à la barre fixe', 'Barre fixe', 'Pull-ups', 'Pullups'],
  ),
  mv(
    'tirage-vertical',
    'Tirage vertical',
    'back',
    'upper',
    'cable',
    'load_reps',
    [8, 12],
    ['Tirage vertical poulie', 'Tirage poulie haute', 'Tirage poitrine', 'Lat pulldown', 'Pulldown'],
  ),
  mv(
    'rowing-barre',
    'Rowing barre',
    'back',
    'upper',
    'barbell',
    'load_reps',
    [6, 10],
    ['Rowing buste penché', 'Rowing barre buste penché', 'Barbell row', 'Bent over row'],
  ),
  mv(
    'rowing-haltere',
    'Rowing haltère',
    'back',
    'upper',
    'dumbbells',
    'load_reps',
    [8, 12],
    ['Rowing haltère un bras', 'Rowing un bras', 'Rowing unilatéral', 'Dumbbell row', 'One arm dumbbell row'],
  ),
  mv(
    'tirage-horizontal',
    'Tirage horizontal',
    'back',
    'upper',
    'cable',
    'load_reps',
    [8, 12],
    ['Tirage horizontal poulie', 'Tirage assis', 'Tirage poulie basse', 'Rowing assis', 'Rowing poulie basse', 'Seated row', 'Seated cable row', 'Cable row'],
  ),
  mv(
    'souleve-de-terre',
    'Soulevé de terre',
    'back',
    'lower',
    'barbell',
    'load_reps',
    [5, 8],
    ['Soulevé de terre conventionnel', 'SDT', 'Deadlift', 'Conventional deadlift'],
  ),
  // Biceps
  mv(
    'curl-biceps',
    'Curl biceps',
    'biceps',
    'upper',
    'dumbbells',
    'load_reps',
    [8, 12],
    ['Curl', 'Curl haltères', 'Curl biceps haltères', 'Biceps curl', 'Dumbbell curl'],
  ),
  mv(
    'curl-barre',
    'Curl barre',
    'biceps',
    'upper',
    'barbell',
    'load_reps',
    [8, 12],
    ['Curl à la barre', 'Curl barre EZ', 'Curl EZ', 'Barbell curl', 'EZ bar curl'],
  ),
  mv('curl-marteau', 'Curl marteau', 'biceps', 'upper', 'dumbbells', 'load_reps', [8, 12], ['Curl prise marteau', 'Curl marteau haltères', 'Hammer curl']),
  // Quadriceps
  mv('squat', 'Squat', 'quads', 'lower', 'barbell', 'load_reps', [6, 10], ['Squat barre', 'Squat arrière', 'Back squat', 'Barbell squat']),
  mv(
    'presse-a-cuisses',
    'Presse à cuisses',
    'quads',
    'lower',
    'machine',
    'load_reps',
    [8, 12],
    ['Presse', 'Presse cuisses', 'Presse à jambes', 'Presse inclinée', 'Leg press'],
  ),
  mv(
    'fentes',
    'Fentes',
    'quads',
    'lower',
    'dumbbells',
    'load_reps',
    [8, 12],
    ['Fentes marchées', 'Fentes avant', 'Fentes haltères', 'Lunges', 'Walking lunges'],
  ),
  mv(
    'squat-bulgare',
    'Squat bulgare',
    'quads',
    'lower',
    'dumbbells',
    'load_reps',
    [8, 12],
    ['Fentes bulgares', 'Split squat bulgare', 'Bulgarian split squat'],
  ),
  mv('leg-extension', 'Leg extension', 'quads', 'lower', 'machine', 'load_reps', [8, 12], ['Extension des jambes', 'Extension quadriceps', 'Quad extension']),
  // Ischios, fessiers, mollets
  mv(
    'souleve-de-terre-roumain',
    'Soulevé de terre roumain',
    'hamstrings',
    'lower',
    'barbell',
    'load_reps',
    [8, 12],
    ['SDT roumain', 'RDL', 'Romanian deadlift'],
  ),
  mv('leg-curl', 'Leg curl', 'hamstrings', 'lower', 'machine', 'load_reps', [8, 12], ['Curl ischios', 'Curl jambes', 'Hamstring curl']),
  mv('hip-thrust', 'Hip thrust', 'glutes', 'lower', 'barbell', 'load_reps', [8, 12], ['Hip thrust barre', 'Poussée de hanches', 'Barbell hip thrust']),
  mv(
    'mollets-debout',
    'Mollets debout',
    'calves',
    'lower',
    'machine',
    'load_reps',
    [12, 15],
    ['Mollets', 'Mollets à la machine', 'Extension mollets debout', 'Standing calf raises', 'Calf raises'],
  ),
  // Abdos
  mv('crunchs', 'Crunchs', 'core', 'upper', 'bodyweight', 'reps', [10, 20], ['Crunch au sol', 'Abdos crunch', 'Crunches']),
  mv('gainage', 'Gainage', 'core', 'upper', 'bodyweight', 'duration', null, ['Gainage ventral', 'Gainage planche', 'Planche', 'Plank']),
  // Cardio
  mv('rameur', 'Rameur', 'cardio', 'lower', 'machine', 'distance', null, ['Ergomètre', 'Aviron indoor', 'Rowing machine', 'Indoor rowing', 'Rower']),
  mv('course', 'Course', 'cardio', 'lower', 'bodyweight', 'distance', null, [
    'Course à pied',
    'Tapis de course',
    'Footing',
    'Jogging',
    'Running',
    'Run',
    'Treadmill',
  ]),
  mv('velo', 'Vélo', 'cardio', 'lower', 'machine', 'duration', null, [
    "Vélo d'appartement",
    'Vélo stationnaire',
    'Spinning',
    'Home trainer',
    'Bike',
    'Cycling',
  ]),
]

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  triceps: 'Triceps',
  back: 'Dos',
  biceps: 'Biceps',
  quads: 'Quadriceps',
  hamstrings: 'Ischios',
  glutes: 'Fessiers',
  calves: 'Mollets',
  core: 'Abdos',
  cardio: 'Cardio',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barre',
  dumbbells: 'Haltères',
  machine: 'Machine',
  cable: 'Poulie',
  bodyweight: 'Poids du corps',
}

/** Clé de comparaison d'un nom : sans accents, casse ni ponctuation, chaque mot au singulier (« Élévations latérales » → « elevation laterale »). */
export function movementKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w.length > 2 ? w.replace(/s$/, '') : w))
    .join(' ')
}

const byKey = new Map(SPORT_MOVEMENTS.flatMap((m) => [m.name, ...m.aliases].map((n) => [movementKey(n), m] as const)))

/** Mouvement de base d'après un nom tapé librement (nom ou alias). `undefined` si inconnu. */
export function findMovement(name: string): SportMovement | undefined {
  return byKey.get(movementKey(name))
}
