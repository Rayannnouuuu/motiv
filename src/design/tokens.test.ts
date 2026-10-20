import { describe, expect, test } from 'vitest'
import css from './tokens.css?raw'

/**
 * Contrastes WCAG des paires de jetons clés, calculés depuis tokens.css lui-même (seule source des valeurs) :
 * thème sombre = le premier bloc :root, thème clair = ce bloc corrigé par son `@variant light`.
 */

type Rgba = [number, number, number, number]

/** Contenu du bloc `{ … }` qui suit `start` (accolades imbriquées comprises). */
function block(src: string, start: string): string {
  const open = src.indexOf('{', src.indexOf(start))
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i)
  }
  throw new Error(`bloc ${start} non fermé`)
}

/** Propriétés `--nom: valeur` du premier niveau d'un bloc (les blocs imbriqués sont ignorés). */
function props(body: string): Record<string, string> {
  let flat = ''
  let depth = 0
  for (const c of body) {
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (depth === 0) flat += c
  }
  return Object.fromEntries([...flat.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

const root = block(css, ':root')
const THEMES = { sombre: props(root), clair: { ...props(root), ...props(block(root, '@variant light')) } }

/** `#rrggbb` ou `rgb(r g b / a)`. */
function parse(v: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as Rgba
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(v)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])]
  throw new Error(`couleur illisible : ${v}`)
}

/** Couleur `top` (éventuellement translucide, ou à l'opacité `alpha`) posée sur une couleur opaque. */
function over(top: Rgba, under: Rgba, alpha = top[3]): Rgba {
  return [0, 1, 2].map((i) => top[i] * alpha + under[i] * (1 - alpha)).concat(1) as Rgba
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: Rgba, bg: Rgba): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/**
 * Fond désigné comme dans les classes : `surface`, `guitar/12 sur surface` (teinte d'un bouton secondaire),
 * `inset sur surface` (jeton translucide posé sur une carte).
 */
function background(theme: Record<string, string>, name: string): Rgba {
  const [top, under] = name.split(' sur ')
  const [token, pct] = top.split('/')
  const color = parse(theme[token])
  if (!under) return color
  return over(color, background(theme, under), pct === undefined ? color[3] : Number(pct) / 100)
}

const AA = 4.5
const DISCIPLINES = ['accent', 'guitar', 'sport', 'danger'] as const
const SURFACES = ['bg', 'surface', 'surface-2', 'elevated-bg', 'elevated-surface', 'elevated-surface-2']

/** [texte, fond] : tout texte doit atteindre 4,5:1 (AA, texte courant) dans les deux thèmes. */
const PAIRS: [string, string][] = [
  // Textes neutres sur les fonds de l'appli, des cartes et des feuilles
  ...SURFACES.flatMap((s) => [['ink', s] as [string, string], ['muted', s] as [string, string]]),
  ['ink', 'inset sur surface'],
  ['muted', 'inset sur surface'],
  ['ink', 'fill sur surface'],
  ['muted', 'fill sur surface'],
  // Accents en texte (liens, boutons texte), sur les fonds où ils apparaissent
  ...DISCIPLINES.flatMap((d) => ['bg', 'surface', 'elevated-bg', 'elevated-surface'].map((s) => [d, s] as [string, string])),
  // Boutons pleins : texte « on-… » sur l'accent
  ...DISCIPLINES.map((d) => [`on-${d}`, d] as [string, string]),
  ['on-record', 'record'],
  // Boutons secondaires et étiquettes : accent sur sa teinte à 12 %, posée sur la page ou sur une carte
  ...DISCIPLINES.flatMap(
    (d) =>
      [
        [d, `${d}/12 sur bg`],
        [d, `${d}/12 sur surface`],
      ] as [string, string][],
  ),
  // Jour à moitié fait dans la frise de la semaine
  ['ink', 'guitar/20 sur surface'],
  ['ink', 'sport/20 sur surface'],
  // Séance de sport en cours sur l'accueil : exos faits en gris sur la teinte du sport
  ['muted', 'sport/10 sur surface'],
]

describe.each(Object.entries(THEMES))('thème %s', (_, theme) => {
  test.each(PAIRS)('%s sur %s : au moins 4,5:1', (fg, bg) => {
    expect(contrast(parse(theme[fg]), background(theme, bg))).toBeGreaterThanOrEqual(AA)
  })
})

test('calcul : noir sur blanc 21:1, blanc sur blanc 1:1', () => {
  expect(contrast(parse('#000000'), parse('#ffffff'))).toBeCloseTo(21)
  expect(contrast(parse('#ffffff'), parse('#ffffff'))).toBe(1)
})
