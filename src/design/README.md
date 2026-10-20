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
- **Typo** : échelle ramenée au corps de texte, 17 px = `1rem`. Styles `t-display-lg` à `t-caption2` et `t-overline` (taille, graisse, interligne et approche ensemble).
- **Espacements** : base 4 px (`p-1` = 4 px, `p-4` = 16 px), en rem.
- **Rayons** : `xs` 6, `sm` 8, `md` 12 (listes), `lg` 14 (boutons, blocs dans une carte), `xl` 16 (cartes, tuiles), `2xl` 20 (carte héros, feuilles).
- **Ombres** : `card` (cartes, en clair seulement), `raised` (feuilles, fenêtres), `thumb` (pastilles), `glow` (halo d'un grand bouton plein).
- **Durées** : `press` 80 ms, `fast` 200, `base` 300, `move` 500, `enter` 700, `page` 850 ; ressorts `ease-spring` et `ease-bounce`.

Tailles en rem : `1rem` suit la taille de texte du téléphone (sur iPhone, Réglages › Luminosité et affichage › Taille du texte). Les icônes se mesurent en `em`. Une zone tactile fait au moins 44 px ; l'utilitaire `hit` l'agrandit autour d'un petit contrôle sans changer son dessin.

## Rôles des couleurs

Référence : l'artefact « MOTIV — Refonte visuelle » (REFONTE §7). Deux univers, une couleur chacun ; le reste est neutre.

| Couleur        | Jeton    | Pour                                                                                                          |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| Texte (neutre) | `accent` | Le global seulement : onglet choisi, « Commencer » au centre de la barre, réglages, niveau global.            |
| Ambre          | `guitar` | Tout ce qui touche la guitare (icône note) : chrono, métronome, exos, morceaux, courbes guitare.              |
| Bleu           | `sport`  | Tout ce qui touche le sport (icône pouls) : course, renfo et plan marathon, séance en direct, repos, mesures. |
| Rouge          | `danger` | Supprimer, abandonner, erreurs.                                                                               |
| Or             | `record` | Record battu, le même dans les deux disciplines.                                                              |

Chaque couleur a son texte posé dessus : `on-accent`, `on-guitar`, `on-sport`, `on-danger`, `on-record`. En sombre ce texte est le fond `#0F1012` ; en clair, les accents sont plus profonds et le texte est blanc. Typo, espacements, formes et animations sont les mêmes dans les deux disciplines : seuls la couleur et l'icône changent.

**Typo** : Barlow (400 à 700) pour le texte, Barlow Condensed 700 pour les titres d'écran, de carte héros et les grands chiffres (`t-large`, `t-title1`, `t-title2`, `t-display…`, ou `font-display`). Surtitre en capitales : `t-overline`. Polices auto-hébergées (paquets `@fontsource`, sous-ensemble latin), rien n'est chargé depuis un service tiers.

**Mesures** : marge 20 px, 24 px entre sections, 12 px entre un titre et son contenu ; rayons 20 (héros), 16 (cartes), 14 (boutons) ; cibles de 44 px au moins.

## Contrastes mesurés

Calculés depuis `tokens.css` comme dans `tokens.test.ts`, qui exige au moins 4,5:1 (AA) pour toutes les paires de texte, dans les deux thèmes.

| Texte sur fond                                        | Sombre          | Clair           |
| ----------------------------------------------------- | --------------- | --------------- |
| `ink` sur `bg` / `surface`                            | 16,7 / 15,5     | 17,1 / 19,0     |
| `muted` sur `bg` / `surface`                          | 7,9 / 7,3       | 5,6 / 6,2       |
| `muted` sur `inset` (dans une carte)                  | 6,6             | 5,6             |
| `accent` en texte sur `bg`                            | 16,7            | 15,9            |
| `guitar` / `sport` / `danger` en texte sur `surface`  | 8,5 / 7,2 / 7,0 | 6,2 / 6,3 / 6,5 |
| Bouton plein global (`on-accent` sur `accent`)        | 16,7            | 15,5            |
| Bouton plein guitare (`on-guitar` sur `guitar`)       | 9,1             | 6,2             |
| Bouton plein sport (`on-sport` sur `sport`)           | 7,8             | 6,3             |
| Bouton plein danger (`on-danger` sur `danger`)        | 7,4             | 6,5             |
| Record (`on-record` sur `record`)                     | 12,6            | 12,6            |
| Bouton secondaire guitare (teinte 12 % sur `surface`) | 6,8             | 5,2             |
| Bouton secondaire sport (teinte 12 % sur `bg`)        | 6,5             | 4,8             |

## Icônes

Grille de 24, trait de 1,8, bouts arrondis, couleur du texte (`currentColor`), toujours `aria-hidden` : le texte voisin ou l'`aria-label` du bouton dit ce qu'elles représentent. Taille par défaut 1,25 fois le texte. Pas d'emoji comme icône d'interface, pas de flamme.

`today` `progress` `library` `me` · `guitar` `sport` · `target` `song` `timer` `trophy` · `play` `pause` `stop` `plus` `minus` `check` `chevron` `close` `search` `export` `import`
