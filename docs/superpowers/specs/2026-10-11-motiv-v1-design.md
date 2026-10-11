# Motiv v1 — suivi guitare + sport

Date : 2026-10-11
Statut : en revue

## 1. Objectif

Garder la motivation en rendant le progrès visible chaque jour, contre l'ennui et l'éparpillement.

Critères de réussite :

- Un log guitare ou sport prend moins de 30 secondes (hors séance sport en direct).
- En ouvrant l'appli, l'action à faire maintenant est visible sans scroller.
- Chaque log montre immédiatement l'XP gagnée et la jauge qui monte.

Utilisateur : une seule personne (le propriétaire). Pas de partage, pas de social.

## 2. Périmètre

### Dans la v1

- Écran « Aujourd'hui » : série, objectif guitare du jour, séances sport de la semaine, niveaux, défi en cours.
- Log guitare (3 étapes) et log sport (en direct, exo par exo).
- XP, niveaux (global + guitare + sport), défis de palier obligatoires.
- Suivi chiffré : tempo max par exo, morceaux maîtrisés, heures cumulées ; charges, répétitions, poids, mensurations.
- Courbes sur 30 / 90 / 365 jours.
- PWA installable, données dans Supabase.

### Repris de l'ancien site (`C:\Users\rayan\musique`)

- Uniquement les 8 fichiers `src/content/exercises/*.json` (100 exercices), copiés tels quels.
- Rien d'autre : pas de code, pas de composants, pas de tabs.

### Hors v1 (v2)

Mode anti-stagnation, enregistrements audio avant/après, photos, parking à idées.

## 3. Stack

| Rôle | Choix |
|---|---|
| Front | Vite + React + TypeScript + Tailwind CSS + React Router |
| PWA | `vite-plugin-pwa` (manifest, icône, coquille hors-ligne) |
| Données + auth | Supabase (Postgres, Row Level Security, lien magique par email) |
| Requêtes | `@supabase/supabase-js` + TanStack Query |
| Courbes | Composant SVG maison (une courbe à la fois) |
| Tests | Vitest + Testing Library |
| Hébergement | Vercel (statique), Supabase offre gratuite |

Auth : connexion par lien magique. Les inscriptions sont désactivées dans Supabase une fois le compte du propriétaire créé.

## 4. Écrans

Navigation basse à 3 onglets : **Aujourd'hui**, **Progrès**, **Réglages**. Conception mobile d'abord (largeur de référence 375 px).

### 4.1 Aujourd'hui

De haut en bas :

1. **Bloc série** (le plus grand) : 🔥 nombre de jours de série guitare, phrase d'action (« Encore 25 min de guitare pour tenir la série »), bouton principal « Logger N min » qui ouvre le log guitare avec la durée restante pré-sélectionnée. Si l'objectif du jour est atteint : « Série tenue aujourd'hui ✓ » et le bouton devient secondaire.
2. **Deux tuiles côte à côte** : guitare `minutes du jour / 60` avec barre ; sport `séances / 3` cette semaine avec 3 cases.
3. **Bouton secondaire** « + Séance <nom> » : propose la prochaine séance type du programme (rotation dans l'ordre).
4. **Bloc niveaux** : niveau global + XP restants, barre ; dessous, niveau guitare et niveau sport. Si une jauge est bloquée : « Défi requis » + XP en réserve.
5. **Bloc défis en cours** : un par domaine, avec le temps écoulé depuis le blocage s'il y a lieu.

Bandeau en haut si des logs attendent l'envoi : « 1 log en attente d'envoi ».

### 4.2 Log guitare (3 mini-écrans)

Barre d'étapes en haut, bouton « Suivant » en bas.

1. **Durée** : puces 15 / 30 / 45 / 60 / autre (saisie libre). Sélecteur de date : aujourd'hui (défaut) ou hier.
2. **Contenu** : liste des éléments travaillés.
   - Exo : recherche dans les 100 exercices, récents en premier. Champ « tempo max atteint » pré-rempli avec le dernier tempo saisi pour cet exo.
   - Morceau : recherche dans tes morceaux, ou création par nom. Case « maîtrisé ».
   - L'étape peut rester vide.
3. **Notes** : « Temps oublié » 1-5, « Envie d'y retourner » 1-5. Bouton « Enregistrer ».

Après enregistrement : écran « +N XP » avec détail des bonus et la jauge qui monte, puis retour à Aujourd'hui.

### 4.3 Log sport (en direct)

1. Choix de la séance type (la prochaine dans la rotation est pré-sélectionnée).
2. Un écran par exo, dans l'ordre du programme :
   - Nom de l'exo, rappel « Dernière fois : 4×8 à 62,5 kg ».
   - Charge et reps avec boutons − / + (pas de 2,5 kg pour la charge, 1 pour les reps), pré-remplis avec la dernière fois. « PDC » possible (poids du corps, charge = 0).
   - Cases de séries ; bouton « ✓ Série N faite » enregistre la série avec la charge et les reps affichées.
   - « Exo suivant → ». Un exo peut être passé.
3. Fin : durée (pré-remplie avec le temps écoulé depuis le début), notes 1-5 ×2, « Terminer ».
4. Écran « +N XP » comme pour la guitare.

Chaque tap est sauvegardé localement. Si l'appli est fermée en cours de séance, elle rouvre la séance au même exo et à la même série. Une séance en cours non terminée depuis plus de 12 h propose « Terminer » ou « Abandonner ».

### 4.4 Progrès

- Onglets de métrique en haut : Heures guitare, Tempo (puis choix de l'exo), Morceaux maîtrisés, Charges (puis choix de l'exo), Poids, Mensurations (puis choix de la mesure).
- Sélecteur 30 j / 90 j / 365 j.
- Valeur actuelle en grand + variation sur la période.
- Une grande courbe.
- Dessous : liste des records datés pour la métrique choisie.
- Sur Poids et Mensurations : bouton « + mesure » (date, poids, taille, poitrine, bras, cuisse ; chaque champ facultatif).

### 4.5 Réglages

- Programme sport : créer / renommer / ordonner les séances types et leurs exos (nom, séries visées, reps visées).
- Morceaux : liste, renommer, changer le statut.
- Compte : déconnexion.

## 5. Données

Toutes les tables ont `user_id uuid not null references auth.users` et une politique RLS `user_id = auth.uid()` pour select / insert / update / delete. Les dates de jour sont des `date` calculées en heure de Paris (`Europe/Paris`), pas des timestamps UTC.

### Contenu embarqué (lecture seule)

`src/content/exercises/*.json` : `id` (ex. `legato-4`), `title`, `category` (arpeggios, bends, legato, palmMuting, picking, rhythm, scales, sweep), `difficulty` (1 à 10), `description`, `targetBpm`, `xpReward`, `pattern`. L'appli n'utilise pas `pattern` ni `xpReward`.

### Tables

**Guitare**

- `songs` : `id`, `title`, `status` (`learning` | `mastered`), `mastered_on date null`, `created_at`.
- `guitar_sessions` : `id`, `day date`, `duration_min int > 0`, `flow_rating 1-5`, `desire_rating 1-5`, `xp int`, `created_at`.
- `guitar_session_items` : `id`, `session_id`, `exercise_id text null`, `song_id null`, `max_bpm int null`, `marked_mastered bool`. Contrainte : exactement un de `exercise_id` / `song_id` est renseigné.

**Sport**

- `sport_programs` : `id`, `name`, `position int`.
- `program_exercises` : `id`, `program_id`, `name`, `target_sets int`, `target_reps int`, `position int`.
- `sport_sessions` : `id`, `day date`, `program_id`, `duration_min`, `flow_rating 1-5`, `desire_rating 1-5`, `xp int`, `created_at`.
- `sport_sets` : `id`, `session_id`, `program_exercise_id`, `set_index int`, `reps int`, `weight_kg numeric` (0 = poids du corps).

**Corps et progression**

- `body_metrics` : `id`, `day date`, `weight_kg`, `waist_cm`, `chest_cm`, `arm_cm`, `thigh_cm` (tous facultatifs, au moins un renseigné).
- `challenges` : `id`, `domain` (`guitar` | `sport`), `level int`, `kind`, `target jsonb`, `easier bool`, `status` (`active` | `done` | `replaced`), `created_on date`, `blocked_since date null`, `done_on date null`, `rerolls int`.

Les niveaux, l'XP totale, la réserve, les séries et les records ne sont pas stockés : ils sont recalculés depuis les sessions. Le champ `xp` d'une session fige l'XP gagnée à l'enregistrement pour l'affichage et les sommes.

## 6. Règles (module `src/domain/`)

Fonctions pures, sans React ni Supabase, entièrement couvertes par des tests unitaires.

### 6.1 Série guitare

- Un jour compte si la somme des `duration_min` des sessions guitare de ce jour est ≥ 60.
- La série = nombre de jours consécutifs qui comptent, en remontant depuis aujourd'hui. Si aujourd'hui ne compte pas encore, on part d'hier (la série n'est pas cassée avant minuit).
- Pas de joker.

### 6.2 Série sport

- Une semaine (lundi → dimanche, heure de Paris) compte si elle a ≥ 3 séances sport terminées.
- La série = nombre de semaines consécutives qui comptent, en remontant depuis la semaine en cours. Si la semaine en cours ne compte pas encore, on part de la précédente.

### 6.3 XP guitare (par session)

| Source | XP |
|---|---|
| Minutes jouées | 1 par minute |
| Nouveau record de tempo sur un exo (`max_bpm` > meilleur précédent) | +10 par exo |
| Exo de difficulté supérieure au maximum déjà travaillé dans sa catégorie | +50 par catégorie |
| Morceau qui passe à `mastered` | +100 par morceau |

Le premier tempo saisi sur un exo n'est pas un record. Le premier exo travaillé d'une catégorie ne donne pas le bonus difficulté.

### 6.4 XP sport (par séance)

| Source | XP |
|---|---|
| Séance terminée | +60 |
| Record sur un exo (au plus un par exo et par séance) | +15 par exo |

Une série (charge `w`, reps `r`) est un record si, parmi toutes les séries précédentes du même exo : soit aucune série avec ≥ `r` reps n'a une charge ≥ `w` (record de charge), soit aucune série avec une charge ≥ `w` n'a ≥ `r` reps (record de reps). La toute première série d'un exo n'est pas un record.

Notes 1-5 et mensurations : 0 XP.

### 6.5 Niveaux

- Guitare : 1 200 XP par niveau. Sport : 600 XP par niveau. Seuil fixe à chaque niveau.
- Niveau de départ : 1.
- **Blocage** : quand l'XP du niveau atteint le seuil, la jauge s'arrête. Le niveau suivant n'est débloqué que si le défi actif du domaine est `done`.
- **Réserve** : l'XP gagnée pendant le blocage est conservée. Au déblocage, la réserve est versée dans le niveau suivant, plafonnée au seuil de ce niveau (on ne saute jamais un défi). L'excédent reste en réserve.
- **XP débloquée** d'un domaine = XP totale du domaine − réserve.
- **Global** : niveau = 1 + floor((XP débloquée guitare + XP débloquée sport) / 1 800). La réserve ne compte pas.

### 6.6 Défis

- Un défi est créé au début de chaque niveau de domaine (y compris le niveau 1) et affiché tout de suite.
- **Génération guitare**, dans cet ordre de préférence :
  1. Exo travaillé dans les 14 derniers jours, sous son `targetBpm` : atteindre min(meilleur tempo × 1,10 arrondi à l'entier pair, `targetBpm`).
  2. Exo travaillé dans les 14 derniers jours, déjà à son `targetBpm` : atteindre le `targetBpm` de l'exo suivant de la même catégorie (difficulté + 1).
  3. Morceau `learning` : le passer à `mastered`.
  4. Aucun historique : `scales-1` à son `targetBpm`.
- **Génération sport** : exo du programme fait dans les 14 derniers jours, au choix :
  1. Meilleure charge + 2,5 kg aux mêmes reps.
  2. Même charge, meilleures reps + 2.
  Exo au poids du corps (charge 0) : toujours l'option 2.
  Aucun historique : terminer 3 séances dans la semaine.
- **Réussite** : vérifiée à chaque log. Si un log atteint la cible, `status = done`, `done_on = jour`.
- **Relance** : 2 relances par défi (`rerolls`). Le défi relancé passe à `replaced`.
- **Version plus facile** : si `blocked_since` date de 14 jours ou plus, l'appli propose de remplacer le défi par une cible réduite de moitié (+5 % de tempo, +1,25 kg, +1 rep). `easier = true`. Proposé une seule fois par niveau.

## 7. Erreurs et hors-ligne

- **Envoi d'un log échoue** (réseau) : le log est placé dans une file locale (`localStorage`), l'écran « +N XP » s'affiche quand même avec l'XP calculée localement, et le bandeau « N log(s) en attente d'envoi » apparaît. Nouvel essai à l'ouverture de l'appli, au retour du réseau (`online`) et toutes les 60 s tant que la file n'est pas vide. Chaque log porte un `id` généré côté client pour qu'un renvoi ne crée pas de doublon (`upsert`).
- **Séance sport en cours** : état complet en `localStorage` après chaque tap.
- **Session expirée** : écran de connexion par lien magique ; la file locale est conservée et envoyée après reconnexion.
- **Données incohérentes** (ex. `exercise_id` absent des JSON) : l'élément est affiché « Exo inconnu » et ignoré dans les calculs, sans plantage.

## 8. Tests

1. **Unitaires (Vitest), écrits avant le code** sur `src/domain/` :
   - Série : 35 + 25 min = jour valide ; 59 min = non ; journée en cours non comptée ne casse pas la série ; log daté d'hier répare la série.
   - XP : premier tempo ≠ record ; bonus difficulté à chaque nouveau maximum dans une catégorie, pas au premier exo ; morceau maîtrisé ; record sport selon la règle 6.4.
   - Niveaux : blocage au seuil ; réserve ; versement plafonné ; global sans réserve.
   - Défis : chaque règle de génération ; réussite détectée ; relances limitées à 2 ; version plus facile après 14 jours.
2. **Composants (Testing Library)** : parcours log guitare en 3 étapes ; reprise d'une séance sport après rechargement.
3. **Sécurité** : script SQL vérifiant qu'un second utilisateur ne lit ni n'écrit aucune ligne du premier.
4. **Manuel** : installation de la PWA sur le téléphone, un log guitare et une séance sport complets, mode avion pendant un log.

## 9. Structure du code

```
src/
  content/exercises/*.json   copie de l'ancien site
  domain/                    règles pures + tests
    streak.ts  xp.ts  levels.ts  challenges.ts  records.ts
  data/                      Supabase, TanStack Query, file hors-ligne
  features/
    today/  log-guitar/  log-sport/  progress/  settings/  auth/
  ui/                        composants partagés (bouton, jauge, courbe SVG, puces)
supabase/
  migrations/                schéma + RLS
```
