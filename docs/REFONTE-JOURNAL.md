# MOTIV — Journal de la refonte

Pour reprendre une session : lire `docs/REFONTE.md` (le cahier des charges), puis ce journal, puis `docs/AUDIT.md`.

## Où on en est

**Phase 0 (audit) livrée. En attente de ta validation et de tes réponses aux 5 questions d'`AUDIT.md`.** Aucun code de l'appli n'a été modifié.

## Fait

- 19 oct. 2026 : phase 0.
  - Le cahier des charges est enregistré dans `docs/REFONTE.md`.
  - L'audit est dans `docs/AUDIT.md` : stack, inventaire, modèle de données, problèmes, plan et 5 questions.
  - Les captures 390 px, en sombre et en clair, sont dans `docs/audit/`.
  - État de départ : commit `2723589`, 453 tests verts, `tsc` propre, 3 avertissements oxlint.

## Décidé (détails, option la plus simple)

- Les ids des exos guitare ne changent pas (`scales-3`…), pour garder l'historique valide.
- `masteredOn` reste sur le morceau, car on peut maîtriser un morceau sans séance.
- Les jours restent au format `AAAA-MM-JJ`, heure de Paris.
- Graphiques : on garde `LineChart` maison (0 dépendance), et on ajoute des barres du même style.
- Lint : on garde oxlint et on ajoute Prettier, au lieu de passer à ESLint.
- Les exos guitare en double deviennent des variantes : ils sont renommés, pas supprimés.

## En attente de réponse (questions de l'audit)

1. Stockage : local avec Dexie (et plus de rappels push), ou Supabase gardé ?
2. Crochets du §1 : sport, nombre de séances, niveau guitare, durée, priorité.
3. Objectifs de la semaine à la place de la règle 30/60 quotidienne ?
4. Niveau actuel gardé comme plancher, et défis remplacés par les objectifs de cycle ?
5. Une branche par lot (`refonte/lot-N`), avec une version d'essai sur `/motiv/essai/` ?

## Reste à faire

- [ ] Lot 1 — Fondations. Il commence par l'export JSON complet, et tu dois exporter tes données avant toute migration.
- [ ] Lot 2 — La séance unifiée
- [ ] Lot 3 — Progrès et rythme
- [ ] Lot 4 — Preuves et anti-stagnation
