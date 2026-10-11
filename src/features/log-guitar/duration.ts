export const PRESETS = [15, 30, 45, 60] as const
export type DurationChoice = (typeof PRESETS)[number] | 'other' | null

export function parseDuration(choice: DurationChoice, other: string): number | null {
  if (choice === null) return null
  if (choice !== 'other') return choice
  const n = Number(other)
  return Number.isInteger(n) && n > 0 && n <= 600 ? n : null
}
