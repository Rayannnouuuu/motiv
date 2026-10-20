# Lot 1 — Couche de données

_Décisions prises le 20 oct. 2026. Point de départ : un plan « intégrité d'abord » (trois architectes étaient prévus, un seul a rendu), simplifié._

## En une minute

- **Stockage local** avec IndexedDB (Dexie 4.4.6). Plus de compte, plus de serveur, plus de file d'envoi.
- **Une base par adresse** :
  - `/motiv/` utilise la base `motiv` ;
  - `/motiv/essai/` utilise la base `motiv-essai`.
  - Les clés locales suivent le même nom : `motiv.liveSport.v1` reste inchangée dans l'appli principale.
- **Modèle v1** (`src/domain/model.ts`) : guitare et sport partagent une seule forme de `Session`, avec des blocs qui contiennent des entrées, qui contiennent des séries.
  - Le sport repose sur une bibliothèque de mouvements modifiables (table `exercises`).
  - Les programmes deviennent des modèles de séance.
- **Écrans du lot 1** : ils lisent encore l'ancienne forme, recalculée par `data/migrations/project.ts`, réciproque exacte de la migration. Ils passent au modèle v1 au lot 2.
- **Écritures** : une intention = une transaction (`write()` dans `data/db.ts`). Les actions gardent leurs noms d'avant (`saveGuitarSession`…) et réutilisent les fonctions de la migration.
- **Migration format 0 → 1** (`data/migrations/v0ToV1.ts`) : pure, sans date ni hasard, triée par id. Elle n'est utilisée que par l'import de fichier. Le nouveau code n'appelle jamais Supabase.

## Écarts au §5 de REFONTE.md

| Point | Choix | Pourquoi |
|---|---|---|
| `Session.xp` | Gardée jusqu'au lot 4 | Recalculer maintenant ferait bouger les niveaux, et les défis qui en dépendent. Le niveau à la migration est noté dans `profile.levelsAtMigration` : ce sera le plancher du lot 4. |
| `Session.date` | `day` (AAAA-MM-JJ, Paris) + `createdAt` | Tout le domaine fonctionne au jour près. `createdAt` départage deux séances du même jour. |
| `Song.lastPlayedAt` | Non stocké | Il se calcule à partir des séances. |
| `Song.masteredOn` | Gardé | On peut maîtriser un morceau sans séance. |
| `Proof{kind:'measurement'}` | Table `measurements`, de même forme que l'ancienne | Les preuves (audio, photos) arrivent au lot 5. |
| `Template` | Ajout de `position` et `archived`. Chaque entrée garde le nom tapé et l'ancien id d'exo de programme | Pour que la rotation des séances et l'historique restent identiques. |
| Défis | Table `challenges` gardée jusqu'au lot 4 | Ils seront remplacés par les objectifs de cycle. |
| `Meta` | Séparée en deux : `meta` (cet appareil, jamais exporté) et `profile` (exporté) | `lastBackupAt` n'a pas de sens dans un autre téléphone. |
| `clean` | Jamais déduit pour l'historique | L'ancien « tempo max » ne disait pas si c'était propre. |
| Exos guitare | Restent dans le code, ids inchangés | Règle 7. Seuls les mouvements sport sont en base, modifiables. |

## Correspondance des mouvements

- `findMovement` (bibliothèque) ne reconnaît que le **nom exact ou un alias**, sans tenir compte des accents, de la casse et du pluriel simple. Il n'y a jamais de rapprochement approximatif, qui mélangerait des charges non comparables.
- Un nom inconnu devient un mouvement à moi `user-…` (catégorie et haut/bas du corps à compléter).
- Sur la vraie copie, les 36 noms sont tous reconnus. Une seule réunion : « Développé incliné » et « Développé incliné haltères ».
- Bug 1 de l'audit (l'historique sport lié au programme) : les données sont prêtes (`exerciseId` sur chaque entrée), mais les écrans suivent encore l'id d'exo de programme. La correction se fera au lot 2, avec l'écran séance.

## Sauvegarde

- **Export format 1** : `{ app, schemaVersion: 1, exportedAt, source: { db, build }, counts, data }`.
  - Les lignes sont exportées telles quelles.
  - Fichier nommé `motiv-sauvegarde-AAAA-MM-JJ-HHMM.json`, à l'heure de Paris.
- **Import** :
  - d'abord, lecture, validation, migration éventuelle, comparaison : rien n'est écrit ;
  - puis un aperçu, qui met en avant **ce qui disparaîtrait**, avec deux confirmations dans ce cas ;
  - enfin, une transaction qui garde l'état d'avant (les 3 derniers), vide et réécrit tout. La base est ensuite relue : si elle diffère du fichier, l'état d'avant est remis.
  - Le bouton « Annuler le dernier import » revient en arrière.
  - Un fichier format 1 tronqué (comptes incohérents) est refusé.
- **Premier lancement** :
  - reprendre les données que l'ancienne version a laissées sur le téléphone (`motiv.snapshot.v1` + la file d'envoi, jamais effacées) ;
  - ou importer un fichier ;
  - ou commencer sans données.
  - Rien n'est écrit tout seul avant ce choix.
- **Persistance** :
  - `navigator.storage.persist()` est demandé.
  - Un bandeau d'installation s'affiche quand l'appli est ouverte dans Safari.
  - Un rappel de sauvegarde apparaît s'il y a des changements et plus de 7 jours depuis la dernière (ou jamais), avec « Plus tard » qui le repousse de 3 jours.

## Vérifié sur la copie réelle (hors dépôt)

- **Aller-retour exact** : format 0 → v1 → ancienne forme égale à l'original.
- **Comptes** : 6 séances guitare (105 min), 1 séance sport de 19 séries, 45 morceaux (« à apprendre », 45 artistes retrouvés), 6 modèles, 1 mesure, 4 défis. XP totale : 175.
- **Mêmes résultats** :
  - niveaux identiques ;
  - série guitare et plan du jour identiques au 14, 19 et 20 oct. et au 2 nov. ;
  - prochaine séance identique (Pull).
- **Export → import → export** : identique.
- **Un seul avertissement** : 183 cm en tour de taille. La valeur est gardée telle quelle.

## Bascule (après validation du lot 1)

1. Dans l'ancienne appli : vérifier qu'il n'y a ni séance en cours ni envoi en attente, puis faire un dernier export.
2. Fusionner dans `main`. La nouvelle appli propose alors de reprendre les données locales, ou d'importer le fichier.
3. Faire une première sauvegarde au nouveau format.
4. **Avec ton accord seulement** :
   - couper le cron `notify` ;
   - mettre Supabase en pause (pas le supprimer) ;
   - retirer `supabase/` et `scripts/build-notify.mjs` du dépôt (son code n'est plus construit depuis ce lot).
