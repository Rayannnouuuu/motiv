# MOTIV — Audit (phase 0)

_19 oct. 2026 · état du dépôt au commit `2723589` (en ligne sur GitHub Pages)._
Rien n'a été modifié dans l'appli pour cet audit. Les questions sont à la fin.

## 1. Stack et architecture

| Sujet | Aujourd'hui |
|---|---|
| Langage | TypeScript strict (`tsc -b` propre) |
| Interface | React 19, React Router 7 (base `/motiv`), Tailwind 4 (jetons dans `src/index.css`, thème via `data-theme`) |
| Données | **Supabase** (Postgres + RLS « chaque ligne à son propriétaire », connexion par mot de passe). TanStack Query v5 pour la lecture |
| Hors ligne | File d'envoi (`src/data/outbox.ts`) + instantané local (`src/data/snapshot.ts`) dans `localStorage` |
| PWA | vite-plugin-pwa (generateSW, mise à jour immédiate), icônes générées depuis `public/logo.png` |
| Rappels | Push Web : fonction `notify` (Supabase Edge, v7) appelée toutes les 15 min par pg_cron ; `public/push-sw.js` côté appareil |
| Tests | Vitest + Testing Library : **58 fichiers, 453 tests, tous verts** (66 s, jsdom recréé 58 fois) |
| Qualité | oxlint : 5 avertissements (2 dans `AppDataProvider`, 2 dans `Sheet`, 1 dans `WeightInput`). Pas de Prettier |
| Déploiement | GitHub Actions sur `main` : `npm ci`, tests, build, GitHub Pages |
| Poids | 1 seul paquet JS de 326 Ko (92 Ko gzip), CSS 8 Ko gzip |

Dépendances d'exécution : `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`. Pas de librairie de graphiques : `src/ui/LineChart.tsx` fait 108 lignes en SVG.

Dossiers :

```
src/
  app/        coque : routes, mises à jour, écran allumé, liens des notifications
  content/    base d'exos guitare (8 JSON, 100 exos), catalogue de 45 morceaux, programmes sport, conseils
  data/       Supabase, file d'envoi, instantané, mappers ligne ↔ objet, fournisseur de données
  domain/     règles pures : séries, XP, niveaux, défis, records, plan du jour, notifications (testées)
  features/   un dossier par écran (today, log-guitar, log-sport, practice, exercise, progress, songs, settings, edit-log, xp, levels, auth)
  ui/         composants communs (Sheet, Stepper, Segmented, Gauge, LineChart, Splash…)
supabase/     4 migrations SQL, fonction notify
```

Où sont les données : tout est sur Supabase, en 9 tables (détail en §3). Le téléphone n'en garde qu'une copie de lecture (instantané) et les envois en attente. À chaque ouverture, l'appli relit toutes les tables, page par page.

## 2. Inventaire des fonctionnalités

État : ✅ marche · 🟡 marche avec un défaut · 🧩 à moitié faite · 💤 peu ou pas utilisée.

| Fonctionnalité | Écran | État | Remarque |
|---|---|---|---|
| Connexion par mot de passe | Connexion | ✅ | Le lien magique est masqué dans l'appli installée (limite iOS) |
| **Aujourd'hui** : série guitare, bouton « Jouer », défis, carte Guitare, carte Sport | `/` | ✅ | Brief respecté. L'écran fait 2 hauteurs d'iPhone à 390 px |
| Plan guitare du jour (3 exos, un par catégorie) | Aujourd'hui | ✅ | |
| Morceaux du jour (1 en cours + 1 facile) | Aujourd'hui | ✅ | |
| Chrono guitare « Jouer » qui préremplit le log | `/jouer` | ✅ | |
| **Log rapide guitare** en 3 étapes (durée, contenu, 2 notes 1-5) | `/log/guitare` | ✅ | Brief respecté |
| **Séance sport en direct** : séries préremplies avec la dernière fois, minuteur de repos, records en direct | `/log/sport` | 🟡 | L'historique est rattaché à l'exo *du programme* (voir §4, bug 1) |
| Correction ou suppression d'un log | `/log/corriger` | ✅ | |
| **XP, niveaux et paliers** : XP par séance, niveaux guitare/sport/global, niveau bloqué tant que le défi n'est pas réussi | `/xp`, feuille Niveau | ✅ | L'XP récompense surtout le temps côté guitare (1 XP/min) |
| Défis (tempo, morceau, charge, reps, séances/semaine), changer ou alléger | Aujourd'hui | ✅ | |
| Animations : ouverture, montée de niveau, feux d'artifice | partout | ✅ | |
| Fiche exo : tablature de l'exo, métronome Web Audio, meilleur tempo, conseils | `/exo/:id` | ✅ | |
| **Suivi chiffré guitare** : heures, tempo par exo, morceaux maîtrisés | Progrès | ✅ | |
| **Suivi chiffré sport** : force (1RM d'Epley), poids, mensurations | Progrès | 🟡 | Pas de volume par semaine, pas de courbe de charge brute |
| **Courbes 30 / 90 / 365 jours** | Progrès | ✅ | Brief respecté |
| Morceaux : en cours, proposés, maîtrisés classés | `/morceaux` | ✅ | Pas d'artiste ni de notes sur mes morceaux |
| Programme sport : éditeur, ordre, programmes tout faits (Full body, Haut/Bas, PPL) | Réglages | ✅ | Changer de programme coupe l'historique (bug 1) |
| Thème clair / sombre / auto | Réglages | ✅ | Défaut : auto |
| Rappels push (plan, sport en retard, défi, série, résumé du dimanche) | Réglages | 🟡 | Déployé, journaux de la v7 pas encore vérifiés |
| Hors ligne : lecture de l'instantané, envois en attente | partout | ✅ | |
| Export / sauvegarde de mes données | — | ❌ absent | Prérequis du lot 1 |
| Semaine, cycle de 6 semaines, bilan, jour léger | — | ❌ absent | Lot 3 |
| Audio, photos, plateau, parking à idées, check-in | — | ❌ absent | Lot 4 |

Écarts avec le brief d'origine : tout ce qu'il demandait est là. Il manque seulement le volume sport par semaine. En plus du brief : défis, chrono, métronome, rappels push, morceaux du jour.

## 3. Modèle de données actuel

| Entité (table) | Champs | Remarque |
|---|---|---|
| `GuitarSession` (guitar_sessions + guitar_session_items) | id, day, durationMin, flowRating, desireRating, **xp**, createdAt, items[] | Item = exo `{exerciseId, maxBpm}` ou morceau `{songId, markedMastered}` |
| `SportSession` (sport_sessions + sport_sets) | id, day, programId, durationMin, flowRating, desireRating, **xp**, createdAt, sets[] | Série = `{programExerciseId, setIndex, reps, weightKg}`, 0 kg = poids du corps |
| `Song` (songs) | id, title, status `learning`/`mastered`, masteredOn | Ni artiste ni notes. 45 lignes jamais jouées, créées par l'ancien « Ajouter tout » |
| `Program` (sport_programs) | id, name, position, archived, exercises[] | |
| `ProgramExercise` (program_exercises) | id, programId, name (texte libre), targetSets, targetReps, position, archived | **Un mouvement n'existe que dans un programme** |
| `BodyMetric` (body_metrics) | id, day, weightKg, waistCm, chestCm, armCm, thighCm | |
| `Challenge` (challenges) | id, domain, level, target (5 sortes), easier, status, createdOn, blockedSince, doneOn, rerolls | |
| Exercice guitare (JSON, lecture seule) | id, title, category (8), difficulty 1-10, description, targetBpm, pattern (tablature de l'exo), xpReward | `xpReward` n'est jamais lu |
| Morceau du catalogue (TS, lecture seule) | title, artist, difficulty 1-10, tuning | |

Ce qui est dupliqué ou incohérent entre guitare et sport :

1. **Deux types de séance** (items et sets), avec deux actions d'enregistrement, deux calculs d'XP, deux fonctions de record et deux modules « semaine ». Dans le modèle cible, c'est une seule `Session` à blocs.
2. **Deux identités d'exercice.** Côté guitare, l'id est stable (`scales-3`). Côté sport, c'est la ligne du programme : un « Squat » dans deux programmes donne deux historiques séparés.
3. **Deux rythmes.** La guitare a une série quotidienne (30 min, et 60 min le lendemain d'un jour court). Le sport compte des séances par semaine.
4. **Deux barèmes d'XP sans logique commune.** Guitare : 1 XP/min + bonus, 1 200 XP par niveau. Sport : 60 XP par séance + 15 par record, 600 XP par niveau.
5. **L'XP est stockée dans chaque séance** au lieu d'être recalculée. Elle doit être réécrite à chaque correction et devient fausse dès qu'on change une règle.
6. **« Maîtrisé » est écrit à deux endroits** : le statut du morceau et la case de l'item de séance.
7. **Pas de notion de « propre »** sur un tempo : `maxBpm` est le plus rapide joué, pas le plus rapide joué proprement.

Écarts que je propose de garder par rapport au schéma cible (§5 de REFONTE.md) :
- **Ids des exos guitare inchangés** (`scales-3`…), pour que tout l'historique reste valide.
- **`masteredOn` gardé sur le morceau**, car on peut le maîtriser depuis l'onglet Morceaux sans séance. Sans cette date, le mur des records ne sait pas où le placer.
- **`day` en `AAAA-MM-JJ` (heure de Paris)** plutôt qu'un horodatage : c'est déjà le cas partout, et c'est testé.

## 4. Problèmes

Bugs encore ouverts (ceux des revues précédentes sont corrigés et testés) :

1. **L'historique sport est lié au programme.** Si je change de programme ou si j'archive un exo, je perds les « dernières fois », les records et la courbe de force. Rien n'est effacé, c'est juste déconnecté. Cause : tout passe par `programExerciseId` (`liveSession.ts:189`, `ProgressPage.tsx:67`).
2. **Deux seuils sur la même carte guitare.** La série compte un jour à partir de 30 min, mais la frise de la semaine affiche « 0/7 jours à 60 min » (capture 01).
3. **Doublons dans la base d'exos guitare.** Arpèges, picking, rythme et gammes ont 2 exos aux niveaux 1 à 5 (`-11` à `-15`). Par exemple « Gamme majeure 11 » refait « Gamme majeure 1 ». Le plan du jour n'en propose qu'un.
4. **45 morceaux jamais joués en base.** L'appli les traite comme des propositions, mais ce sont des données parasites.
5. **5 avertissements oxlint** (setState dans un effet, refs lues pendant le rendu, export mixte).

Code dupliqué et composants à mettre en commun :
- `GuitarCard` et `SportCard` montrent la même chose (frise de la semaine, séance du jour) avec deux composants. Même chose pour `guitarWeek`/`sportWeek`, `guitarSessionXp`/`sportSessionXp` et `saveGuitarSession`/`saveSportSession`.
- Le « direct » existe trois fois : chrono `/jouer`, métronome dans la fiche exo, séance sport. Ce sont trois mises en page différentes.
- Composants de plus de 200 lignes : `LogSportPage` (563), `EditLogPage` (358), `PracticePage` (334), `ProgramEditor` (295), `Metronome` (278), `AppDataProvider` (276), `ProgressPage` (269), `StepContent` (218), `mappers` (216).
- Couche de données lourde pour un seul utilisateur : mappers, file d'envoi, instantané et requêtes paginées représentent environ 800 lignes, qui n'existent que parce que les données sont sur un serveur.

Incohérences visuelles :
- **Rôle des couleurs flou.** L'orange sert pour toutes les actions principales, le violet guitare n'apparaît que par endroits et le vert sport presque jamais. « Jouer » est orange alors que « Démarrer » est violet (captures 01 et 08).
- **Icônes emoji** (🎸 🏋️ 🔥 🎯 🎵) **mélangées aux icônes au trait** de la barre d'onglets. La flamme reste l'icône d'Aujourd'hui alors que le logo a changé.
- **Écran Aujourd'hui trop long** : quatre blocs empilés, soit environ 1 600 px à 390 px de large. La prochaine action n'est visible qu'en haut.
- Le thème par défaut est « auto », alors que la cible est sombre.

Lenteurs :
- Le premier affichage attend la session Supabase. Ensuite, l'appli relit toutes les tables à chaque ouverture, et cette lecture grossit avec l'historique. L'instantané masque l'attente, mais n'est pas la source.
- Un seul paquet JS de 92 Ko gzip, dont une bonne part pour supabase-js. Il n'y a pas de découpage par écran.
- La suite de tests met 66 s, car jsdom est recréé pour chaque fichier.

## 5. Captures (390 px)

Elles sont faites avec des données factices (aperçu local), en sombre et en clair, dans `docs/audit/`.

| Écran | Sombre | Clair |
|---|---|---|
| Aujourd'hui | [01](audit/dark-01-aujourdhui.jpg) | [01](audit/light-01-aujourdhui.jpg) |
| Progrès | [02](audit/dark-02-progres.jpg) | [02](audit/light-02-progres.jpg) |
| Morceaux | [03](audit/dark-03-morceaux.jpg) | [03](audit/light-03-morceaux.jpg) |
| Réglages | [04](audit/dark-04-reglages.jpg) | [04](audit/light-04-reglages.jpg) |
| Log guitare | [05](audit/dark-05-log-guitare.jpg) | [05](audit/light-05-log-guitare.jpg) |
| Choix de la séance sport | [06](audit/dark-06-log-sport.jpg) | [06](audit/light-06-log-sport.jpg) |
| Séance sport en direct | [07](audit/dark-07-seance-sport.jpg) | [07](audit/light-07-seance-sport.jpg) |
| Chrono « Jouer » | [08](audit/dark-08-jouer.jpg) | [08](audit/light-08-jouer.jpg) |
| Fiche exo + métronome | [09](audit/dark-09-fiche-exo.jpg) | [09](audit/light-09-fiche-exo.jpg) |
| Corriger un log | [10](audit/dark-10-corriger.jpg) | [10](audit/light-10-corriger.jpg) |
| Résultat XP | [11](audit/dark-11-xp.jpg) | [11](audit/light-11-xp.jpg) |

L'écran de connexion n'est pas capturé, car l'aperçu fonctionne sans compte.

## 6. Plan

### Stack retenue

| Choix | Décision | Raison |
|---|---|---|
| React 19, Vite, TypeScript strict, Tailwind 4, React Router | **Garder** | Saine, déjà en place et à jour |
| vite-plugin-pwa | **Garder** | Déjà réglé pour iPhone (mise à jour immédiate, icônes) |
| Vitest | **Garder** | 453 tests à conserver. J'ajoute `pool: 'vmThreads'` pour accélérer |
| Stockage | **Dexie (IndexedDB) en local**, à valider (question 1) | Conforme au §8 et au hors-périmètre « serveur, sync » : premier affichage sans réseau, plus de connexion, et ~800 lignes de synchro en moins |
| Supabase et TanStack Query | **Retirer après migration**, à valider (question 1) | Utiles seulement pour le serveur. Supabase est mis en pause, pas supprimé, tant que tu n'as pas dit oui |
| Graphiques | **Garder `LineChart` maison** et ajouter un graphique en barres du même style | 0 dépendance et plus léger que n'importe quelle librairie. Écart noté avec le §8 |
| Lint | **Garder oxlint** (mêmes règles qu'ESLint pour React et TS, 50 fois plus rapide) **et ajouter Prettier** | Détail : option la plus simple. Écart noté avec le §8 |
| Persistance | `navigator.storage.persist()`, bandeau « Installe MOTIV sur l'écran d'accueil », rappel de sauvegarde hebdomadaire | §8 |

### Garder

- **`src/domain/` et ses tests** : la logique est pure et testée ; je l'adapte au modèle unifié au lieu de la réécrire.
- **Base d'exos guitare (100 exos, ids inchangés) et catalogue de morceaux** : règle 7. Elle est enrichie (métrique, BPM de départ, BPM cible), pas remplacée.
- **Métronome Web Audio** (`metronome.ts`) : la planification est déjà précise (lookahead) ; il devient celui de la séance en direct.
- **Séance sport en direct** (préremplissage, minuteur de repos, records en direct) : c'est la base de la séance unifiée.
- **Les deux notes de 1 à 5, le log rapide en 3 étapes, la correction d'un log** : conformes au brief.
- **Courbes 30, 90 et 365 jours, 1RM d'Epley, poids, mensurations** : conformes au §6 du lot 3.
- **Composants `ui/`** (Sheet, Stepper, Segmented, Gauge…) : ils deviennent le design system.
- **Animation d'ouverture du logo** : tu l'as demandée ; elle reste, sobre.

### Refaire

- **Modèle de données** en une seule `Session` à blocs, avec `Exercise` commun et `Template`. C'est ce qui supprime les doublons du §3.
- **Couche de données** : un seul module Dexie versionné, migration testée sur une copie de ton export.
- **Navigation** en 4 onglets : Aujourd'hui · Progrès · Bibliothèque · Moi, avec un bouton « Commencer » partout.
- **Écran Aujourd'hui** : une prochaine action, les jauges de la semaine et les séances prévues, sur un écran.
- **XP et niveaux** (lot 3) : récompenser la progression, recalculés depuis les séances, plus jamais stockés.
- **Couleurs et icônes** : une couleur par discipline appliquée partout, des icônes au trait à la place des emoji, et le sombre par défaut.
- **Les composants de plus de 200 lignes**, découpés.

### Fusionner

| Aujourd'hui | Devient | Raison |
|---|---|---|
| Chrono `/jouer` + métronome de la fiche exo + séance sport | **Séance en direct** commune | Une seule façon de faire une séance |
| `GuitarCard` + `SportCard` | **Carte de séance** paramétrée par discipline | Règle « un composant par concept » |
| Programmes sport et exos de programme | **Bibliothèque de mouvements** (une trentaine) + **modèles de séance** | Répare le bug 1 : l'historique suit le mouvement |
| Onglet Morceaux | **Bibliothèque** (exos, morceaux, modèles) | Navigation cible |
| Réglages | **Moi** (cycles, bilans, idées, réglages, sauvegarde) | Navigation cible |
| Défis et paliers bloquants | **Objectifs de cycle** (lot 3), à valider (question 4) | Même idée, sur 6 semaines au lieu d'un niveau |
| Série guitare quotidienne + compteur sport | **Objectifs de la semaine** (lot 3), à valider (question 3) | Un rythme commun qui ne casse pas sur un jour de repos |

### Supprimer (seulement avec ton accord)

- **Les 45 morceaux jamais joués en base**, qui deviennent « à apprendre » ou partent : ce sont des données parasites. Ils restent proposés via le catalogue.
- **Les 20 exos guitare en double** (`-11` à `-15` de 4 catégories) : je propose de les garder, mais de les renommer en variantes (« Gamme majeure, variante B ») plutôt que de les supprimer. Règle 7.
- **`xpReward` des JSON** : ce champ n'est jamais lu.
- **Rappels push et connexion** : seulement si tu choisis l'option locale à la question 1.

## Mes 5 questions

1. **Stockage.** Je propose de tout passer en local sur l'iPhone (Dexie), comme le demandent les §8 et §9. En échange, la connexion disparaît, mais les rappels push aussi : le serveur ne verrait plus tes séances. Ils reviendraient après le lot 4. L'autre option : garder Supabase pour tes données, ce qui conserve les rappels et une sauvegarde en ligne, mais aussi la connexion et le réseau. **Local (recommandé) ou Supabase ?**
2. **Les crochets du §1.** Voici ce que je déduis de l'appli : musculation en salle, 3 séances par semaine (Push, Pull, Legs) ; guitare de niveau intermédiaire, 30 min par jour en moyenne ; guitare au centre et sport en socle. **C'est juste ?**
3. **Ta règle 30/60 de la semaine dernière.** Le lot 3 remplace la série quotidienne par des objectifs de la semaine. Je propose 5 séances guitare d'au moins 30 min et 3 séances sport, avec une série qui compte les semaines réussies. Dans ce cas, la règle « deux jours courts d'affilée cassent la série » disparaît. **D'accord ?**
4. **Niveaux et défis.** En recalculant l'XP sur la progression, ton niveau actuel peut baisser. Je propose de garder ton niveau actuel comme plancher, et de remplacer les défis bloquants par l'objectif phare de chaque cycle. **D'accord ?**
5. **Branches et essai.** « Un lot = une branche » : je crée `refonte/lot-1`, puis `-2`, etc. Pour que tu puisses tester sur l'iPhone avant de valider, je publie le lot sur `…/motiv/essai/`, avec une base séparée qui ne touche pas tes vraies données. La version actuelle reste en ligne jusqu'à ta validation. **OK ?**
