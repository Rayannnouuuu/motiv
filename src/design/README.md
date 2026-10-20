# Design system MOTIV

Tout ce qui fixe l'apparence de l'appli est ici. Les composants n'utilisent que ces jetons, via les utilitaires Tailwind qu'ils génèrent (`bg-surface`, `text-muted`, `bg-guitar text-on-guitar`, `rounded-2xl`, `t-body`…).

| Fichier          | Rôle                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokens.css`     | Les jetons, en propriétés CSS : couleurs des deux thèmes, typo, espacements, rayons, ombres, durées. Importé par `src/index.css`.                |
| `theme.ts`       | Thème choisi (sombre par défaut, clair, auto), mémorisé sur l'appareil. Le script d'`index.html` applique le même défaut avant le premier rendu. |
| `tone.ts`        | Classes par rôle de couleur (`TONE.solid.guitar`, `TONE.tint.sport`…).                                                                           |
| `icons.tsx`      | Icônes au trait (`<Icon name="guitar" />`).                                                                                                      |
| `tokens.test.ts` | Calcule les contrastes des paires clés à partir de `tokens.css`.                                                                                 |

## Jetons

- **Base neutre** : `bg` (écran), `surface` (carte), `surface-2`, `inset` (bloc dans une carte), `fill` / `fill-strong` (champs, pistes), `line`, `ink` (texte), `muted` (texte secondaire), `faint` (décor et états désactivés seulement, jamais un texte à lire). Les feuilles prennent les `elevated-…`, un cran plus clairs en sombre.
- **Typo** : échelle iOS ramenée au corps de texte, 17 pt = `1rem`. Styles `t-display-lg` à `t-caption2` (taille, graisse, interligne et approche ensemble).
- **Espacements** : base 4 px (`p-1` = 4 px, `p-4` = 16 px), en rem.
- **Rayons** : `xs` 6, `sm` 8, `md` 12 (listes), `lg` 14 (boutons), `xl` 16 (tuiles), `2xl` 20 (cartes, feuilles).
- **Ombres** : `card` (cartes, en clair seulement), `raised` (feuilles, fenêtres), `thumb` (pastilles), `glow` (halo d'un grand bouton plein).
- **Durées** : `press` 80 ms, `fast` 200, `base` 300, `move` 500, `enter` 700, `page` 850 ; ressorts `ease-spring` et `ease-bounce`.

Tailles en rem : `1rem` suit la taille de texte du téléphone (sur iPhone, Réglages › Luminosité et affichage › Taille du texte). Les icônes se mesurent en `em`. Une zone tactile fait au moins 44 px ; l'utilitaire `hit` l'agrandit autour d'un petit contrôle sans changer son dessin.

## Rôles des couleurs

| Couleur       | Jeton    | Pour                                                                                                     |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Orange (logo) | `accent` | Le global seulement : actions communes à tout (corriger un log, réglages), onglet choisi, niveau global. |
| Violet        | `guitar` | Tout ce qui touche la guitare : « Jouer », chrono, métronome, exos, morceaux, courbes guitare.           |
| Vert          | `sport`  | Tout ce qui touche le sport : « Commencer », séance en direct, repos, programme, poids et mesures.       |
| Rouge         | `danger` | Supprimer, abandonner, erreurs.                                                                          |
| Or            | `record` | Record battu, le même dans les deux disciplines.                                                         |

Chaque couleur a son texte posé dessus : `on-accent`, `on-guitar`, `on-sport`, `on-danger`, `on-record`. En sombre ce texte est presque noir (le blanc sur l'orange `#ff9f0a` ne donnait que 2,1:1) ; en clair, les accents sont plus profonds et le texte est blanc. Typo, espacements, formes et animations sont les mêmes dans les deux disciplines : seuls la couleur et l'icône changent.

## Contrastes mesurés

Calculés depuis `tokens.css` comme dans `tokens.test.ts`, qui exige au moins 4,5:1 (AA) pour toutes les paires de texte, dans les deux thèmes.

| Texte sur fond                                        | Sombre          | Clair           |
| ----------------------------------------------------- | --------------- | --------------- |
| `ink` sur `bg` / `surface`                            | 21,0 / 17,0     | 18,8 / 21,0     |
| `muted` sur `bg` / `surface`                          | 8,5 / 6,9       | 4,7 / 5,2       |
| `muted` sur `inset` (dans une carte)                  | 5,2             | 4,7             |
| `accent` en texte sur `bg`                            | 10,2            | 5,5             |
| `guitar` / `sport` / `danger` en texte sur `surface`  | 6,8 / 8,3 / 6,7 | 6,8 / 6,0 / 6,5 |
| Bouton plein orange (`on-accent` sur `accent`)        | 8,9             | 6,2             |
| Bouton plein guitare (`on-guitar` sur `guitar`)       | 7,4             | 6,8             |
| Bouton plein sport (`on-sport` sur `sport`)           | 8,5             | 6,0             |
| Bouton plein danger (`on-danger` sur `danger`)        | 7,4             | 6,5             |
| Record (`on-record` sur `record`)                     | 12,6            | 12,6            |
| Bouton secondaire orange (teinte 12 % sur `bg`)       | 8,9             | 4,6             |
| Bouton secondaire guitare (teinte 12 % sur `surface`) | 5,6             | 5,5             |
| Bouton secondaire sport (teinte 12 % sur `bg`)        | 8,8             | 4,6             |

Le gris `muted` ne va pas sur une teinte à 12 % en clair (environ 4,3:1) : sur une teinte, le texte secondaire reste en `ink`.

## Icônes

Grille de 24, trait de 1,8, bouts arrondis, couleur du texte (`currentColor`), toujours `aria-hidden` : le texte voisin ou l'`aria-label` du bouton dit ce qu'elles représentent. Taille par défaut 1,25 fois le texte. Pas d'emoji comme icône d'interface, pas de flamme.

`today` `progress` `library` `me` · `guitar` `sport` · `target` `song` `timer` `trophy` · `play` `pause` `stop` `plus` `minus` `check` `chevron` `close` `search` `export` `import`
