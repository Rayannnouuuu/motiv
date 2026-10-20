/**
 * Couleur d'accent d'un élément, selon ce qu'il concerne : `guitar` (violet) et `sport` (vert) pour une
 * discipline, `accent` (orange) seulement pour le global (actions communes, onglet choisi).
 * Une discipline (`Domain`) s'utilise telle quelle comme ton.
 */
export type Tone = 'accent' | 'guitar' | 'sport'

/** Classes Tailwind par ton, écrites en entier pour que Tailwind les trouve. */
export const TONE = {
  /** Texte, lien, bouton texte */
  text: { accent: 'text-accent', guitar: 'text-guitar', sport: 'text-sport' },
  /** Fond plein sans texte (jauge, point) */
  bg: { accent: 'bg-accent', guitar: 'bg-guitar', sport: 'bg-sport' },
  /** Fond plein et son texte (bouton principal, choix fait) */
  solid: { accent: 'bg-accent text-on-accent', guitar: 'bg-guitar text-on-guitar', sport: 'bg-sport text-on-sport' },
  /** Fond teinté et texte de l'accent (bouton secondaire, étiquette) */
  tint: { accent: 'bg-accent/12 text-accent', guitar: 'bg-guitar/12 text-guitar', sport: 'bg-sport/12 text-sport' },
  stroke: { accent: 'stroke-accent', guitar: 'stroke-guitar', sport: 'stroke-sport' },
  fill: { accent: 'fill-accent', guitar: 'fill-guitar', sport: 'fill-sport' },
  ring: { accent: 'ring-accent', guitar: 'ring-guitar', sport: 'ring-sport' },
} satisfies Record<string, Record<Tone, string>>
