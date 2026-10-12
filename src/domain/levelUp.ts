export type LevelKey = 'global' | 'guitar' | 'sport'
export type LevelSnapshot = Record<LevelKey, number>

const ORDER: LevelKey[] = ['global', 'guitar', 'sport']

export function snapshot(levels: { global: { level: number }; guitar: { level: number }; sport: { level: number } }): LevelSnapshot {
  return { global: levels.global.level, guitar: levels.guitar.level, sport: levels.sport.level }
}

/** Niveaux qui ont monté depuis la dernière fois qu'on les a montrés (global d'abord). */
export function levelUps(seen: LevelSnapshot, now: LevelSnapshot): LevelKey[] {
  return ORDER.filter((k) => now[k] > seen[k])
}
