# MOTIV — Journal de la refonte

Pour reprendre une session : lire `docs/REFONTE.md` (le cahier des charges), puis ce journal, puis `docs/AUDIT.md`.

## Où on en est

**Lots 1, 2 et 3 en ligne sur `/motiv/` (« Push tout », 20 oct.).** Prochain : lot 4 — Progrès et rythme.

## Fait

- 19 oct. 2026 : phase 0.
  - Le cahier des charges est enregistré dans `docs/REFONTE.md`.
  - L'audit est dans `docs/AUDIT.md` : stack, inventaire, modèle de données, problèmes, plan et 5 questions.
  - Les captures 390 px, en sombre et en clair, sont dans `docs/audit/`.
  - État de départ : commit `2723589`, 453 tests verts, `tsc` propre, 5 avertissements oxlint.
- 19 oct. 2026 : audit validé (« Ok » aux 5 propositions).
- 19 oct. 2026 : lot 1, étape 0, dans l'appli actuelle (`main`).
  - Réglages › Sauvegarde › « Exporter mes données » : un fichier `motiv-sauvegarde-AAAA-MM-JJ.json` au format 0, avec toutes les séances, morceaux, programmes (archivés compris), mesures et défis. Le bouton est désactivé tant que les données du serveur ne sont pas reçues.
  - Préparation de la version d'essai : `MOTIV_BASE` dans `vite.config.ts`, le service worker principal ignore `/motiv/essai/`, le 404 y renvoie, et `deploy.yml` construit la dernière branche `refonte/lot-N` sous `/motiv/essai/`.

- 19 oct. 2026 : export fait (« C'est bon »). Une copie de test au format 0 est relue depuis Supabase, en lecture seule. Elle reste dans le dossier temporaire de session, jamais dans le dépôt.
- 20 oct. 2026 : **nouveau lot 3, Plan marathon**, ajouté au cahier des charges (`REFONTE.md` §6). Les lots suivants sont renumérotés : 4 = Progrès et rythme, 5 = Preuves et anti-stagnation. Au §9, les push sont repoussés « après le lot 5 » (même sens qu'avant : après le dernier lot) et le plan marathon devient la seule exception à « pas de programmes générés ».

- 20 oct. 2026 : lot 1, contenus.
  - Base guitare normalisée : `metric`, `startBpm` et `source` ajoutés, ids inchangés, les 20 « doublons » retitrés.
  - Bibliothèque sport de 34 mouvements, avec `findMovement` qui reconnaît un nom exact ou un alias.
- 20 oct. 2026 : lot 1, stockage. Le détail est dans `docs/lots/LOT-1-DONNEES.md`.
  - Dexie local, une base par adresse.
  - Modèle v1 unifié, avec une migration format 0 → 1 pure et testée.
  - Export format 1, import avec aperçu et annulation, premier lancement (reprise des données laissées par l'ancienne version).
  - Rappel de sauvegarde et bandeau d'installation.
  - Retirés de l'appli : connexion, file d'envoi, instantané, réglages push, TanStack Query, supabase-js.
  - Vérifié sur la copie réelle : aller-retour exact, mêmes niveaux, même série, même plan du jour.
  - 453 tests verts.

- 20 oct. 2026 : lot 1, design et navigation.
  - Design system dans `src/design/` : jetons, sombre par défaut, une couleur par discipline, icônes au trait à la place des emoji, contrastes AA testés.
  - Navigation : Aujourd'hui · Progrès · Bibliothèque (exercices guitare et sport, morceaux, modèles) · Moi (thème, sauvegarde, version).
  - Bouton « Commencer » sur tous les écrans à onglets.
  - Mouvements sport modifiables : nom, haut ou bas du corps, fourchette de reps.
  - Prettier ajouté (`npm run format`, `npm run lint`).
  - 558 tests verts.
  - Captures 390 px, sombre et clair, dans `docs/lots/lot1/`.

- 20 oct. 2026 : **bascule du lot 1** (validé : « ça me convient »).
  - Une sauvegarde complète et à jour a été recalculée depuis Supabase : 8 séances guitare, dont 2 du 19 oct. au soir, faites après l'export. Elle a été vérifiée par la migration (aller-retour identique) et envoyée à l'utilisateur. Elle n'est pas dans le dépôt.
  - `main` = lot 1. Au premier lancement, l'appli propose de reprendre les données laissées sur le téléphone par l'ancienne version, ou d'importer la sauvegarde.
  - Le cron `motiv-notify` de Supabase est coupé. Supabase reste actif, en lecture seule, comme copie de secours. Sa mise en pause et le retrait de `supabase/` du dépôt viendront une fois l'import confirmé.
  - 183 cm dans « Taille » le 13 oct. = la hauteur. Ce sera corrigé avec le profil du lot 3 (taille, poids), sans toucher à l'historique avant.

- 20 oct. 2026 : **lot 2, la séance unifiée** (plan et détails dans `docs/lots/LOT-2.md`).
  - Moteur de progression : guitare, propre 3 séances de suite → +4 bpm ; sport, double progression (+2,5 / +5 kg). Chaque cible a sa raison en une phrase.
  - Sport : les dernières fois, la charge proposée, les records et l'XP suivent le mouvement, plus la ligne du programme (bug 1 de l'audit).
  - Guitare en direct : l'exo en cours s'ouvre en plein écran (exo k/N, chrono), métronome au tempo du jour, ±1 et ±5, case « propre », « Valider · exo suivant ».
  - Fin de séance commune : les deux notes et une note libre. Une correction garde la note, la séance légère et les tempos propres.
  - Log rapide (`/log`) depuis « Commencer », guitare ou sport.
  - Répertoire à 4 statuts dans la Bibliothèque ; un morceau « à entretenir » pas joué depuis 14 jours revient dans Aujourd'hui.
  - Aujourd'hui : la semaine en haut (guitare x/5, sport x/3), puis les séances, les morceaux à entretenir, les défis.
  - Suites du lot 1 : toast et feux d'artifice au-dessus de l'écran, chevrons, code mort retiré, un fichier JS par écran (premier chargement 189 → 132 Ko), variantes `-11` à `-15` dans le plan du jour.
  - 585 tests verts. Captures 390 px, sombre et clair, dans `docs/lots/lot2/`.

- 20 oct. 2026 : lot 2 validé (« Ok »). La mise en ligne sur `main` a été bloquée par le contrôle de sécurité, faute de « déploie » explicite : elle attend ton feu vert.
- 20 oct. 2026 : **lot 3, le plan marathon** (plan et décisions dans `docs/lots/LOT-3.md`).
  - Générateur dans `src/domain/marathon` (règles pures, jamais stocké, recalculé chaque lundi). Il est testé sur 8 profils types, dont un débutant complet ; le délai trop court est testé à part.
  - Faisabilité : refus argumenté et 3 options (course-marche, semi, course plus tardive), mode prudent (IMC, douleur), rappel médical.
  - Plan :
    - 4 phases ;
    - allègement toutes les 3 ou 4 semaines ;
    - +10 % au plus par semaine ;
    - sortie longue plafonnée à 32 km ou 3 h, la plus longue 3 semaines avant la course ;
    - affûtage à 60 % puis 50 % ;
    - environ 80 % facile ;
    - allures par Riegel, avec 5 % de marge.
  - Renfo coureur, en version salle ou maison : un modèle créé avec le profil, placé après les séances dures, jamais la veille, rien les 10 derniers jours.
  - Adaptation :
    - semaine manquée ;
    - plus d'une semaine manquée ;
    - douleur au-dessus de 3, ou deux sorties de suite avec une douleur : progression gelée, vélo ou marche à la place ;
    - malade ;
    - date de course changée.
  - Écrans : Moi › Marathon (questionnaire, plan), carte dans Aujourd'hui, séance de course (allure cible, chrono, minuteur d'intervalles avec bips, distance, durée, douleur).
  - Un nouvel écran s'ouvre désormais en haut de page.
  - 625 tests verts. Captures 390 px, sombre et clair, dans `docs/lots/lot3/`. Questionnaire rempli → plan en quelques secondes.
- 20 oct. 2026 : **« Push tout »** : les lots 2 et 3 passent sur `main` et sur `/motiv/`. Le schéma de stockage n'a pas changé depuis le lot 1 : pas de migration, données intactes.

## Décidé (détails, option la plus simple)

- Les ids des exos guitare ne changent pas (`scales-3`…), pour garder l'historique valide.
- `masteredOn` reste sur le morceau, car on peut maîtriser un morceau sans séance.
- Les jours restent au format `AAAA-MM-JJ`, heure de Paris.
- Graphiques : on garde `LineChart` maison (0 dépendance), et on ajoute des barres du même style.
- Lint : on garde oxlint et on ajoute Prettier, au lieu de passer à ESLint.
- Les exos guitare en double deviennent des variantes : ils sont renommés, pas supprimés.
- Stockage : l'XP reste stockée jusqu'au lot 4 (plancher de niveau). Les défis restent jusqu'au lot 4. Les écrans du lot 1 lisent une projection vers l'ancienne forme.
- Mouvements sport : nom exact ou alias uniquement, jamais de rapprochement approximatif. Un nom inconnu devient un mouvement à toi.
- Versions de dépendances : figées, et publiées depuis au moins 2 semaines (fake-indexeddb 6.2.5 plutôt que 6.2.6).
- `supabase/` reste dans le dépôt jusqu'à la bascule : l'appli en ligne s'en sert encore. Sa suppression se fera avec ton accord.
- Lot 3 : une sortie de course est une séance sport (mouvement « course »). Elle compte pour la semaine sport et l'XP, pas pour les records de musculation.
- Lot 3 : le profil marathon est rangé dans la ligne `profile` (champ facultatif), donc pas de migration. Le plan n'est jamais stocké.
- Lot 3 : les bips du minuteur reprennent ceux du repos sport, qui ne coupent pas la musique.
- Lot 2 : une séance guitare de la semaine = un jour à 30 min ou plus (plusieurs petites séances le même jour comptent ensemble).
- Lot 2 : un morceau « à entretenir » jamais joué compte depuis sa date de maîtrise.
- Lot 2 : à niveau égal, la variante d'un exo guitare change selon le jour.
- Lot 3 marathon : le sport couvre maintenant la course à pied en plus de la musculation. Dès le lot 1, le modèle de données prévoit la distance, la durée et la douleur (0-10) d'une sortie, pour ne pas avoir à migrer plus tard.

## Réponses aux questions de l'audit (validées le 19 oct.)

1. **Stockage local avec Dexie.** Supabase sert seulement à la migration, puis il est mis en pause (pas supprimé). Les rappels push s'arrêtent à la bascule et sont à rediscuter après le lot 5. Le cron `notify` est à couper au moment de la bascule.
2. **Section 1 :**
   - Sport : musculation en salle, 3 séances par semaine (Push, Pull, Legs).
   - Guitare : niveau intermédiaire, 30 min par jour.
   - Priorité : guitare au centre, sport en socle.
3. **Objectifs de la semaine (lot 4, ex-lot 3)** : 5 séances guitare d'au moins 30 min et 3 séances sport. La série compte les semaines réussies. La règle 30/60 disparaît au lot 4 ; jusque-là, elle reste.
4. **Niveaux (lot 4, ex-lot 3)** : le niveau actuel sert de plancher. Les défis bloquants sont remplacés par l'objectif phare du cycle.
5. **Une branche par lot** (`refonte/lot-1`…). La version d'essai sur `/motiv/essai/` a sa propre base. L'appli actuelle reste sur `/motiv/` jusqu'à la validation.

## Reste à faire

- [x] Lot 1, étape 0 : export JSON dans l'appli actuelle.
- [x] Lot 1 : tu exportes tes données (fait le 19 oct.).
- [x] Lot 1 : base d'exos guitare normalisée, bibliothèque sport.
- [x] Lot 1 : stockage Dexie versionné, import avec aperçu (format 0 migré), export format 1, migration testée sur une copie.
- [x] Lot 1 : design system, navigation à 4 onglets, Prettier, captures, version d'essai.
- [x] Lot 1 : validé et basculé sur `/motiv/` (20 oct.).
- [ ] Après la bascule : confirmer que tes données sont bien dans la nouvelle appli, puis mettre Supabase en pause et retirer `supabase/` du dépôt.
- [x] Suites notées pour le lot 2 (sauf les graphiques : ils s'adaptent déjà à la largeur, rien à changer).
- [x] 183 cm le 13 oct. : c'est ta hauteur.
- [x] Lot 2 — La séance unifiée : en ligne.
- [x] Lot 3 — Plan marathon : en ligne.
- [ ] Lot 4 — Progrès et rythme
- [ ] Lot 5 — Preuves et anti-stagnation
