# Lot G2 — Séance guidée

_27 oct. 2026. `docs/GUITARE.md` §5._

**État : validé et en ligne sur `/motiv/` (« Push », 27 oct.).**

## Ce qui change

- **Séance guidée** (`/seance`, accessible par « Commencer › Séance guidée » et par un lien dans la carte Guitare d'Aujourd'hui) :
  1. **Durée** : 15, 30, 45 ou 60 min (15 présélectionné les 3 premières semaines, avec la mise en garde sur la douleur au bout des doigts, normale, et au poignet, qui ne l'est pas).
  2. **Blocs** selon le tableau du §5 : échauffement (chromatique à 80 % de ton record propre), focus, entretien, répertoire, bonus (de 30 min). Chaque bloc a son minuteur.
  3. **Objectif** de séance en une ligne chiffrée (ex. « Changements d'accords : passer de 22 à 25 »).
  4. **Mesure** dans l'écran, selon le test de la compétence : métronome au bon tempo et « propre » pour un tempo, compteur « une minute » (60 s, gros bouton), checklist, score de quiz saisi à la main (les entraîneurs arrivent au lot G3), bends justes sur 10, grille de 5 critères.
  5. **Bilan** : objectif atteint ou non, essais réussis ou à refaire, validations, une ligne « ce qui coince ».
  6. Puis l'écran de log habituel (durée, exos et morceau joués, les deux notes de 1 à 5), avec « ce qui coince » dans la note.
- **Focus de la semaine** : la première compétence en cours (ou celle choisie), affichée dans Semaine.
- **Compétences en cours** : 3 démarrées d'office au premier lancement, puis celles proposées dès qu'une place se libère.
- **Entretiens** : une compétence validée dont l'entretien est dû passe en priorité dans le bloc entretien, en test court.

## Stockage

La progression est un champ facultatif du profil (`profile.guitar`) : **pas de nouvelle version de base**, pas de migration, la sauvegarde l'emporte. Chaque essai est écrit tout de suite (rien à perdre si l'appli se ferme).

## Décisions (option la plus simple)

- Les quiz sont saisis à la main (score, secondes par question) tant que G3 n'a pas les entraîneurs : l'appli ne prétend pas les avoir entendus.
- Le diagnostic d'entrée, l'écran Parcours et les épreuves de niveau restent au lot G4 : en G2, les compétences démarrent au niveau 0.
- Une séance guidée interrompue garde les essais déjà notés ; le log n'est créé que si tu valides le bilan.

## Vérif

728 tests verts : règles du générateur (minutes, échauffement à 80 %, entretien dû prioritaire, focus, objectif) et parcours complet de la page. Captures 390 px, sombre et clair, dans `docs/lots/lotG2/`. Essai fait dans Chromium : séance de 30 min complète, essais enregistrés dans la base, focus visible dans Semaine.

## Correctifs après essai (retour : « inutilisable »)

- **Mise en place hors du temps de jeu** : accordage, son clair et posture ne sont plus des blocs de la séance. Une fenêtre « Avant de jouer » (3 cases, quelques secondes) s'ouvre avant la séance, tant que ces trois points ne sont pas validés (2 jours). Ils ne comptent plus dans les 3 compétences en cours, ni dans le focus, ni dans l'entretien.
- **Exercices visibles dans chaque bloc** : tablature, description, métronome réglé, et un choix d'autres exercices (ceux de la compétence, puis tous ceux débloqués). Avant, seul un test de tempo les affichait.
- **Morceaux** : le bloc répertoire propose tes morceaux (en cours d'abord, puis à apprendre ; jamais les maîtrisés seuls) avec un choix. Avant, il cherchait seulement les morceaux « en cours », et tes 45 morceaux sont « à apprendre » tant qu'ils ne sont pas joués.
- **Focus** : une compétence qui se joue avec un exercice passe avant un quiz saisi à la main.
- **Métronome et micro** : le micro est brut (l'annulation d'écho d'iPhone traite la guitare comme une voix et baisse le volume du métronome). Pendant l'écoute, le clic est plus aigu (3,8 à 5,2 kHz) et le détecteur n'écoute que 150 Hz à 2 kHz : le clic du haut-parleur n'est pas pris pour une note. Un indicateur de niveau du micro s'affiche, avec un message si rien n'est entendu.
- Pas testé sur un vrai iPhone : la détection a été vérifiée dans Chromium avec une guitare synthétique branchée comme micro.
