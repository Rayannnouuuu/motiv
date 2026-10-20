# Lot 2 — La séance unifiée : plan

_20 oct. 2026. Point de départ : REFONTE §6 lot 2, sur la base du lot 1 (stockage v1, écrans encore branchés sur l'ancienne forme)._

**État : les 8 étapes sont faites, en attente de validation.**

## Décisions (détails, option la plus simple)

- **Modèles de séance**
  - Sport : les modèles sont les programmes, comme avant.
  - Guitare : le modèle est le **plan du jour** (3 exos et les morceaux du jour), ou une séance libre. Les modèles guitare personnalisés viendront plus tard, si le besoin se confirme.
- **Séance en direct** (`/seance`) : un cadre commun aux deux disciplines.
  - En haut : la discipline, l'exo en cours sur le total (2/6) et le chrono.
  - En bas : l'action principale, puis Exo suivant et Terminer.
  - Le corps de l'écran dépend de la discipline, et c'est justifié (§4) :
    - guitare : métronome avec ±1 et ±5, case « propre », tempo validé ;
    - sport : charge et répétitions, séries à cocher, repos qui démarre seul.
  - L'état est gardé sur le téléphone, comme aujourd'hui : il survit à la fermeture de l'appli.
- **Moteur de progression** (`domain/targets.ts`, pur et testé) : il propose une cible avec sa raison en une phrase, toujours modifiable.
  - Guitare : propre 3 séances de suite au même tempo ou plus vite → +4 BPM, sinon le même tempo. Sans historique, on part du BPM de départ de l'exo. L'ancien « tempo max » (pas marqué propre) sert de point de départ, sans compter comme propre.
  - Sport, double progression : haut de la fourchette atteint sur toutes les séries → +2,5 kg (haut du corps) ou +5 kg (bas du corps), et retour au bas de la fourchette. Sinon, même charge et une répétition de plus que la plus faible série, sans dépasser le haut.
  - Au poids du corps : une répétition de plus. Durée et distance : pas de cible au lot 2.
- **L'historique sport suit le mouvement** (bug 1 de l'audit) : les dernières fois, les cibles et les records viennent de `exerciseId`, plus de l'exo du programme.
- **Fin de séance** : durée, les deux notes de 1 à 5 et une note libre. L'écran XP montre aussitôt les records battus.
- **Log rapide** (`/log`) : discipline, jour, durée, modèle (sport) et les deux notes. Moins de 20 secondes.
  - Pour la guitare, « Détailler » ouvre l'ancien log en 3 étapes : il est gardé (règle 4).
- **Répertoire** : quatre statuts, à apprendre, en cours, maîtrisé, à entretenir, modifiables depuis la Bibliothèque. Un morceau à entretenir non joué depuis 14 jours remonte dans Aujourd'hui.
- **Aujourd'hui**, de haut en bas :
  - les jauges de la semaine (5 séances guitare d'au moins 30 min, 3 séances sport) ;
  - les séances prévues : plan guitare du jour, prochaine séance sport ;
  - les morceaux à entretenir ;
  - les défis ;
  - le bouton « Commencer ».
  - La série 30/60 reste jusqu'au lot 4 (décision de l'audit).
- **Fusions**
  - Le chrono `/jouer` devient la séance guitare en direct. Chaque exo s'ouvre en plein écran sur `/jouer/exo/:id`, avec le titre commun (exo k/N, chrono).
  - La séance sport garde son écran ; son titre affiche le même chrono.
  - Pas d'ancienne adresse à rediriger : `/jouer` et `/log/sport` restent.
- **Correction d'un log** : corriger une séance garde ce que l'ancienne forme ne connaît pas (note libre, séance légère, tempos marqués propres).

## Étapes (chacune verte et commitée)

1. Domaine v1 : historique par exo et mouvement, et le moteur de progression, avec leurs tests.
2. Données : les écrans reçoivent aussi le modèle v1, `saveSession` (v1) calcule l'XP, une correction garde les champs v1, les statuts de morceaux.
3. Séance en direct commune, avec le lancement depuis « Commencer ».
4. Fin de séance commune et log rapide.
5. Répertoire à 4 statuts et rappel « à entretenir ».
6. Écran Aujourd'hui.
7. Suites du lot 1 :
   - toast « Record » et feux d'artifice affichés au-dessus de l'écran ;
   - chevrons dans `ModalBar` ;
   - code mort retiré ;
   - découpage du paquet JS par écran.
8. Vérifications, captures, version d'essai, démo.
