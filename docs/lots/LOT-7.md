# Lot 7 — Métronome qui écoute ton rythme

_26 oct. 2026. Demande : « quand je joue avec le métronome, détecter si je suis dans le rythme », écran sur le modèle de Kizamu (capture envoyée)._

**État : sur l'essai `/motiv/essai/`, en attente de validation.**

## Ce qui change

Retour : « tout sur la même page, pas d'options cachées ». Plus de bouton à part : **lancer le métronome ouvre un seul écran plein** avec tout dessus.

- En haut, le tempo du métronome avec − / + (l'objectif), et les 4 temps qui s'allument.
- Le micro écoute tout seul : une jauge TRAÎNE / PRESSE, la zone « dans le temps » (± 5 bpm) en couleur, l'aiguille sur ton tempo.
- « Dans le temps », « Tu presses » ou « Tu traînes », et ton tempo joué en grand.
- Stabilité en 4 barres (régularité de tes intervalles), régularité de la séance en %.
- « Terminer » arrête le métronome et le micro.
- Sans micro (refusé ou navigateur qui ne sait pas) : le même écran, en métronome seul.
- Croches, triolets ou doubles : chaque intervalle est ramené au temps, le tempo lu reste celui du métronome.
- Rien n'est enregistré : le son du micro est analysé sur le téléphone, puis oublié.

## Comment ça marche

- Le micro passe par un détecteur d'attaques (AudioWorklet) : énergie du son toutes les 3 ms, comparée à sa moyenne ; une attaque compte une fois (70 ms de pause), le grave est coupé (200 Hz).
- Le tempo joué est la médiane des 8 derniers intervalles, ramenés au temps (`features/exercise/rhythm.ts`, testé).
- Annulation d'écho activée : le clic joué par le haut-parleur est retiré du micro. Sans écouteurs : avec des écouteurs Bluetooth, le téléphone passerait sur leur micro, qui entend mal la guitare. Téléphone posé près de la guitare.

## Décisions (option la plus simple)

- Pas de « en avance / en retard » par rapport au clic : la latence du téléphone (haut-parleur, micro) fausserait ce chiffre de plusieurs dizaines de ms. Le tempo joué n'en dépend pas.
- Aiguille en butée à ± 15 bpm. Plus de 2,5 s sans note : l'écran attend la reprise et repart de zéro.

## Captures

390 px, dans `docs/lots/lot7/` : croches à 100 bpm (dans le temps, 100, stable, 100 %), noires à 112 bpm (tu presses). Faites dans Chromium avec un fichier audio de guitare synthétique branché comme micro : la vraie chaîne micro → détecteur → lecture a tourné.

## Vérif

683 tests verts, oxlint et Prettier propres.
