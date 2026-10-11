import type { BodyField } from '../../domain/types'

export const BODY_FIELDS: { field: BodyField; label: string; unit: 'kg' | 'cm' }[] = [
  { field: 'weightKg', label: 'Poids', unit: 'kg' },
  { field: 'waistCm', label: 'Taille', unit: 'cm' },
  { field: 'chestCm', label: 'Poitrine', unit: 'cm' },
  { field: 'armCm', label: 'Bras', unit: 'cm' },
  { field: 'thighCm', label: 'Cuisse', unit: 'cm' },
]
