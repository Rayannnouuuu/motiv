# MOTIV — Journal de la refonte

Pour reprendre une session : lire `docs/REFONTE.md` (le cahier des charges), puis ce journal, puis `docs/AUDIT.md`.

## Où on en est

**Lot 1 en cours** sur `refonte/lot-1`. Tu as exporté tes données le 19 oct. : la migration et le nouveau stockage peuvent avancer (règle 2).

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

## Décidé (détails, option la plus simple)

- Les ids des exos guitare ne changent pas (`scales-3`…), pour garder l'historique valide.
- `masteredOn` reste sur le morceau, car on peut maîtriser un morceau sans séance.
- Les jours restent au format `AAAA-MM-JJ`, heure de Paris.
- Graphiques : on garde `LineChart` maison (0 dépendance), et on ajoute des barres du même style.
- Lint : on garde oxlint et on ajoute Prettier, au lieu de passer à ESLint.
- Les exos guitare en double deviennent des variantes : ils sont renommés, pas supprimés.
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
- [ ] Lot 1 : design system et navigation, base d'exos guitare normalisée, bibliothèque sport (rien de tout ça ne touche au stockage).
- [ ] Lot 1 : stockage Dexie versionné, import avec aperçu (le format 0 est migré), export au format 1, migration testée sur une copie.
- [ ] Lot 2 — La séance unifiée
- [ ] Lot 3 — Plan marathon
- [ ] Lot 4 — Progrès et rythme
- [ ] Lot 5 — Preuves et anti-stagnation
