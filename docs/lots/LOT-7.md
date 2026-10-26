# Lot 7 — Vérifier mon rythme

_26 oct. 2026. Demande : « quand je joue avec le métronome, détecter si je suis dans le rythme », écran sur le modèle de Kizamu (capture envoyée)._

**État : sur l'essai `/motiv/essai/`, en attente de validation.**

## Ce qui change

- **Fiche exo › Métronome › « Vérifier mon rythme »** : le métronome démarre (s'il ne joue pas déjà) et un écran plein s'ouvre, le micro écoute.
  - En haut, l'objectif : le tempo du métronome, ± 5 bpm.
  - Une jauge TRAÎNE / PRESSE, avec la zone « dans le temps » en couleur et l'aiguille sur ton tempo.
  - « Dans le temps », « Tu presses » ou « Tu traînes », et ton tempo joué en grand.
  - Stabilité en 4 barres (régularité de tes intervalles).
  - Régularité de la séance : la part du temps passé dans le temps, en %.
  - « Terminer » referme l'écran ; le métronome continue.
- Croches, triolets ou doubles : chaque intervalle est ramené au temps, le tempo lu reste celui du métronome.
- Rien n'est enregistré : le son du micro est analysé sur le téléphone, puis oublié.

## Comment ça marche

- Le micro passe par un détecteur d'attaques (AudioWorklet) : énergie du son toutes les 3 ms, comparée à sa moyenne ; une attaque compte une fois (70 ms de pause), le grave est coupé (200 Hz).
- Le tempo joué est la médiane des 8 derniers intervalles, ramenés au temps (`features/exercise/rhythm.ts`, testé).
- Annulation d'écho activée : le clic joué par le haut-parleur est retiré du micro. Avec des écouteurs, le micro n'entend que la guitare.

## Décisions (option la plus simple)

- Pas de « en avance / en retard » par rapport au clic : la latence du téléphone (haut-parleur, micro) fausserait ce chiffre de plusieurs dizaines de ms. Le tempo joué n'en dépend pas.
- Aiguille en butée à ± 15 bpm. Plus de 2,5 s sans note : l'écran attend la reprise et repart de zéro.

## Captures

390 px, dans `docs/lots/lot7/` : croches à 100 bpm (dans le temps, 100, stable, 100 %), noires à 112 bpm (tu presses). Faites dans Chromium avec un fichier audio de guitare synthétique branché comme micro : la vraie chaîne micro → détecteur → lecture a tourné.

## Vérif

683 tests verts, oxlint et Prettier propres.
