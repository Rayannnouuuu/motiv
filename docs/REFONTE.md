# MOTIV — Prompt de refonte complète

_19 oct. 2026 · @Rayan_

## Mode d'emploi (ne pas coller)

Colle les sections 1 à 9 dans Claude Code, ouvert à la racine du projet MOTIV. L'agent commence par un audit et s'arrête : rien n'est modifié avant ta validation.

- Avant de coller, complète les trois crochets de la section 1 (ton sport, ton niveau, ta priorité).
- Enregistre aussi ce texte dans le dépôt sous docs/REFONTE.md. À chaque nouvelle session, il suffit d'écrire : « Reprends docs/REFONTE.md au lot en cours ».
- Valide un lot à la fois. C'est ce qui évite une refonte à moitié finie partout.

## 1. Contexte et vision

Tu reprends MOTIV, mon application perso de suivi guitare électrique et sport. Ta mission : la refondre de A à Z pour qu'elle soit plus propre, plus poussée et cohérente entre ses deux univers.

Pourquoi MOTIV existe. Je suis motivé par le progrès visible, et je décroche quand je stagne ou que je m'éparpille. MOTIV doit montrer chaque progrès, rendre la prochaine étape évidente et me ramener au cap quand je dérive.

L'objectif commun. Guitare et sport servent le même but : un loisir qui me fait du bien et m'aide à reprendre ma vie en main. L'appli doit donner envie d'y retourner, jamais culpabiliser.

Pour qui. Un seul utilisateur : moi. Usage solo, sur téléphone, juste avant, pendant ou juste après une séance.

### Ce que je pratique

- Sport : [musculation en salle / poids du corps / course…], [N] séances par semaine visées.
- Guitare : niveau [débutant / intermédiaire], [durée] par jour visée.
- Priorité : [guitare au centre et sport en socle / l'inverse / à égalité].

La promesse en une phrase. J'ouvre MOTIV, je sais quoi faire aujourd'hui. Je la ferme, je sais que j'ai avancé.

## 2. Règles de travail

Ces règles priment sur tout le reste du prompt.

1. Lis tout le dépôt avant d'écrire une ligne. Ne suppose rien sur l'existant.
2. Aucune perte de données. Avant de toucher au stockage, ajoute un export JSON complet et fais-moi exporter mes données. Ensuite seulement, écris une migration versionnée et teste-la sur une copie.
3. Livre par lots (section 6). Un lot = une branche, des commits clairs, une démo. Puis tu t'arrêtes et tu attends ma validation.
4. Ne supprime aucune fonctionnalité sans mon accord. Si une fonctionnalité doit disparaître ou fusionner, propose-le dans l'audit.
5. Si un choix est important et ambigu, pose-moi une question courte. Si c'est un détail, prends l'option la plus simple et note-la.
6. Interface entièrement en français.
7. Garde la base d'exercices guitare reprise de mon ancien site. Enrichis-la, ne la remplace pas.
8. Morceaux : titre, artiste et mes notes uniquement. Jamais de tablature ni de paroles, je les trouve moi-même.
9. Tiens à jour docs/REFONTE-JOURNAL.md : fait, décidé, reste à faire. Je dois pouvoir reprendre n'importe quelle session à partir de ce fichier.

## 3. Phase 0 — Audit

Avant toute modification, produis docs/AUDIT.md, puis arrête-toi. Il contient :

1. Stack et architecture : framework, langage, structure des dossiers, dépendances, déploiement, où et comment les données sont stockées.
2. Inventaire des fonctionnalités : pour chacune, son état (marche, buggée, à moitié faite, inutilisée) et son écran. Compare avec le brief d'origine :
  - écran Aujourd'hui avec cartes Guitare et Sport ;
  - log rapide avec les deux notes de 1 à 5 et la série de jours ;
  - XP, niveaux et paliers ;
  - suivi chiffré guitare (tempo, morceaux, heures) et sport (charges, répétitions, poids, mensurations) ;
  - courbes sur 30, 90 et 365 jours.
3. Modèle de données actuel : chaque entité et ses champs, et ce qui est dupliqué ou incohérent entre guitare et sport.
4. Problèmes : bugs, code dupliqué, composants propres à un univers qui devraient être communs, incohérences visuelles, lenteurs.
5. Captures de chaque écran en largeur 390 px, si tu peux lancer l'appli.
6. Ton plan : ce que tu gardes, refais, fusionnes ou supprimes, avec une raison d'une ligne pour chacun. Indique la stack retenue (section 8).

Termine par tes 5 questions les plus importantes pour moi, pas plus.

## 4. Le principe qui unifie guitare et sport

Guitare et sport sont deux disciplines pratiquées avec la même méthode : pratique délibérée et surcharge progressive. MOTIV rend ce parallèle visible partout, avec le même vocabulaire, les mêmes écrans et le même moteur.

| Concept commun | Guitare | Sport |
|---|---|---|
| Séance | Session de pratique | Séance d'entraînement |
| Blocs | Échauffement, technique, répertoire, créativité | Échauffement, exercices principaux, accessoires, cardio ou mobilité |
| Exercice | Exercice de la base (ex. chromatique) | Mouvement (ex. squat) |
| Intensité | Tempo en BPM | Charge en kg ou répétitions |
| Progression | +BPM quand c'est propre 3 séances de suite | +charge quand toutes les répétitions sont faites |
| Record | Tempo max propre, morceau maîtrisé | Charge max, 1RM estimé, meilleure perf cardio |
| Preuve avant/après | Enregistrement audio | Photo et mensurations |
| Plateau | Tempo bloqué depuis N séances | Charge bloquée depuis N séances |
| Récupération | Jour léger (écoute, théorie) | Jour de repos |
| Objectif de cycle | Jouer tel morceau à X BPM | Squat X kg × 5 |

### Règles qui en découlent

- Un seul composant par concept, paramétré par discipline : carte de séance, courbe de progression, badge de record, suggestion de cible. Tout composant propre à un seul univers doit être justifié.
- Chaque discipline a sa couleur d'accent et son icône. Tout le reste est identique : typo, espacements, formes, animations.
- Un rythme commun : la semaine (objectifs de volume), le cycle de 6 semaines (un objectif phare par discipline), le bilan.
- Deux notes communes en fin de séance, de 1 à 5 : « J'ai perdu la notion du temps » et « J'ai envie d'y retourner ». Elles vérifient que la pratique reste un plaisir.
- Un écran Aujourd'hui et un écran Progrès qui mélangent les deux disciplines. On ne navigue pas entre deux applis collées.

## 5. Modèle de données unifié

Une seule source de vérité : les séances. Records, XP, niveaux et séries sont recalculés à partir d'elles, jamais saisis ni stockés en double. Adapte ce schéma à l'existant et justifie les écarts dans l'audit.

```ts
type Discipline = 'guitar' | 'sport'
type Metric = 'bpm' | 'load_reps' | 'reps' | 'duration' | 'distance'

Exercise { id, discipline, name, category, metric,
           startValue?, targetValue?, notes?, source: 'legacy' | 'user' }

Song { id, title, artist, notes?, targetBpm?,
       status: 'to_learn' | 'learning' | 'mastered' | 'maintain', lastPlayedAt? }

Session { id, discipline, date, durationMin, isLight, blocks: Block[],
          flowScore: 1-5, desireScore: 1-5, note? }

Block { type: 'warmup' | 'technique' | 'repertoire' | 'creative'
            | 'main' | 'accessory' | 'conditioning',
        entries: Entry[] }

Entry { exerciseId? | songId?,
        sets: { reps?, loadKg?, bpm?, durationSec?, distanceKm?, clean?, rpe? }[] }

Template { id, discipline, name, blocks }        // modèles de séance
WeekTarget { weekStart, guitarSessions, sportSessions, guitarMinutes? }
Cycle { id, start, end, goals: Goal[], review? }  // 6 semaines
Goal { discipline, label, exerciseId? | songId?, metric, target, achievedAt? }
Proof { id, discipline, kind: 'audio' | 'photo' | 'measurement',
        blobKey?, values?, date, exerciseId? | songId? }
Checkin { date, sleepHours?, energy?: 1-5 }       // optionnel
Idea { id, text, createdAt, status: 'parked' | 'promoted' | 'dropped' }
WeeklyReview { weekStart, wins, blockers, nextFocus }
Meta { schemaVersion, lastBackupAt }
```

## 6. Fonctionnalités par lot

Cinq lots, dans cet ordre, avec ma validation entre chacun. Les valeurs chiffrées sont des réglages par défaut, modifiables dans l'appli.

### Lot 1 — Fondations

Rien de spectaculaire à l'écran, mais tout devient propre.

- Design system et navigation refaite (section 7).
- Couche de données unique, schéma versionné, migration de mes données existantes.
- Export et import JSON, avec aperçu avant d'écraser quoi que ce soit.
- Base d'exercices guitare normalisée : catégorie, métrique, BPM de départ et BPM cible.
- Bibliothèque sport créée avec une trentaine de mouvements de base, tous modifiables.

Terminé quand l'appli fait au moins tout ce qu'elle faisait avant, sans perte de données.

### Lot 2 — La séance unifiée

Le cœur de l'appli : une seule façon de faire une séance, quelle que soit la discipline.

- Écran Aujourd'hui : séances prévues, jauges des objectifs de la semaine, un bouton « Commencer ».
- Lancement : choix de la discipline, puis d'un modèle de séance ou d'une séance libre.
- Log rapide : enregistrer une séance déjà faite en moins de 20 secondes, toujours possible.
- Séance en direct : un écran par exercice, même mise en page pour les deux disciplines.
  - Guitare : métronome intégré (Web Audio, planification précise), réglé sur le tempo cible, boutons ±1 et ±5 BPM, case « propre ».
  - Sport : séries à cocher, préremplies avec la dernière séance, minuteur de repos qui démarre seul.
- Moteur de progression : propose la prochaine cible de chaque exercice, toujours modifiable.
  - Guitare : tempo validé propre sur 3 séances, alors +4 BPM. Sinon, même tempo.
  - Sport, double progression : haut de la fourchette atteint sur toutes les séries, alors +2,5 kg (haut du corps) ou +5 kg (bas du corps), et retour au bas de la fourchette.
- Fin de séance : les deux notes de 1 à 5, une note libre, et les records battus affichés tout de suite.
- Répertoire : statuts à apprendre, en cours, maîtrisé, à entretenir. Un morceau à entretenir non joué depuis 14 jours remonte dans Aujourd'hui.

Terminé quand je fais une séance complète de chaque discipline sans quitter l'écran séance.

### Lot 3 — Plan marathon

Un générateur de plan de préparation marathon, construit à rebours depuis la date de course et adapté à mon profil. Il repose sur des règles écrites dans domain/, explicables et testées. Chaque séance proposée reste modifiable.

Questionnaire de départ, modifiable à tout moment :

- Course : nom, date, objectif (finir, ou un temps visé).
- Corps : taille, poids, année de naissance, sexe. Le poids suit mes pesées.
- Niveau en course : km par semaine sur les 4 dernières semaines, plus longue sortie du dernier mois, années de pratique, un chrono récent sur 5 km, 10 km ou semi s'il existe.
- Contraintes : jours disponibles, jour préféré pour la sortie longue, accès à une salle ou non.
- Santé : douleurs ou blessures récentes en texte libre, fréquences cardiaques max et de repos si je les connais.

Faisabilité, avant de générer quoi que ce soit

- L'appli compte les semaines jusqu'à la course et les compare à mon niveau. Repères par défaut, paramétrables :
  - déjà 30 à 40 km par semaine et une sortie de 15 km : 16 à 20 semaines, 12 au minimum ;
  - course régulière mais petit volume : 20 à 24 semaines ;
  - débutant ou reprise : 6 mois ou plus, en commençant par de la course-marche.
- Délai trop court : elle le dit franchement et propose 3 options. Finir en alternant course et marche, viser un semi-marathon, ou choisir une course plus tardive. Jamais un plan risqué pour tenir une date.
- Taille et poids servent à calculer l'IMC. À partir de 30 (seuil paramétrable), ou si une douleur est signalée, la progression devient plus prudente : plus de course-marche, volume qui monte plus lentement, vélo ou marche en complément.
- Un rappel conseille un avis médical avant de démarrer, surtout en partant de peu de pratique.

Structure du plan

- 4 phases : base (volume facile), développement (seuil, allure marathon), spécifique (pic de volume, sorties longues avec passages à allure), affûtage (2 à 3 semaines, volume réduit de 40 à 60 %, intensité conservée).
- Une semaine allégée toutes les 3 ou 4 semaines, avec environ 25 % de volume en moins.
- Volume hebdomadaire : +10 % maximum d'une semaine à l'autre.
- Sortie longue : +1,5 à 3 km par semaine, plafonnée vers 32 km ou 3 h. La plus longue a lieu 3 semaines avant la course.
- Environ 80 % du temps en endurance facile.
- 3 à 5 sorties par semaine selon mes jours disponibles : footing facile, sortie longue, seuil, fractionné, allure marathon, récupération, course-marche.
- Allures calculées depuis mon chrono récent (formule de Riegel) et recalculées quand j'en bats un. Riegel est optimiste pour un premier marathon : applique une marge prudente. Sans chrono, allures au ressenti et à la fréquence cardiaque.

Musculation intégrée au plan

- 2 séances par semaine en base et en développement, 1 en phase spécifique, une légère au début de l'affûtage, aucune les 10 derniers jours.
- Contenu orienté coureur, en version salle et maison : fentes et montées sur banc, soulevé de terre jambes tendues, mollets, moyen fessier, gainage, pliométrie légère.
- Placement : le même jour qu'une séance de course difficile, après elle, pour garder les jours faciles vraiment faciles. Jamais la veille d'une sortie longue ou d'une séance de qualité.
- Pendant la préparation, la musculation sert la course : charges entretenues, pas de recherche de prise de masse. L'appli l'affiche clairement.

Adaptation semaine après semaine

- Le plan se recalcule chaque lundi à partir de ce que j'ai vraiment fait.
- Séance manquée : on ne la rattrape pas, on reprend le plan. Plus d'une semaine manquée : le volume redescend avant de remonter.
- Douleur notée de 0 à 10 en fin de sortie. Au-dessus de 3, ou présente 2 sorties de suite : progression gelée, alternative sans impact proposée, conseil de consulter.
- Maladie déclarée : semaine allégée proposée.
- Date de course modifiée : plan régénéré, historique conservé.

Affichage et séance

- Vue du plan semaine par semaine : phase en cours, km prévus et faits, compte à rebours jusqu'à la course.
- Les séances du plan apparaissent dans Aujourd'hui et se lancent dans le mode séance du lot 2.
- Course : allure cible affichée et chrono, distance et durée saisies à la fin. Fractionné : minuteur d'intervalles avec signaux sonores, sur le même moteur audio que le métronome.

Terminé quand je saisis mon profil et ma date, et j'obtiens en moins d'une minute un plan réaliste, ou un refus argumenté avec des alternatives. Le générateur est testé sur au moins 6 profils types, dont un débutant complet et un délai trop court.

### Lot 4 — Progrès et rythme

- Écran Progrès commun : courbes 30, 90 et 365 jours par exercice, 1RM estimé (formule d'Epley), volume par semaine, poids et mensurations.
- Répartition guitare : temps passé par catégorie, pour voir ce que je néglige.
- Mur des records : les deux disciplines mélangées, du plus récent au plus ancien.
- Objectifs de la semaine au lieu d'une série quotidienne, par exemple 5 séances guitare et 3 séances sport. La série compte les semaines réussies. Repos et jours légers ne cassent rien.
- Cycles de 6 semaines : un objectif phare par discipline, une barre d'avancement, un bilan de fin de cycle (avant/après, records, ce que je garde).
- Bilan du dimanche en 3 questions et 2 minutes : ce qui a marché, ce qui a bloqué, le focus de la semaine suivante.
- XP et niveaux refondus : l'XP récompense la progression (record, morceau maîtrisé, semaine réussie, cycle atteint), pas le temps brut. Un niveau MOTIV global, plus un niveau par discipline.

Terminé quand je vois en 10 secondes sur l'écran Progrès si j'avance.

### Lot 5 — Preuves et anti-stagnation

- Enregistrement audio dans l'appli, rattaché à un morceau ou un exercice. Écran « Il y a 30 jours / aujourd'hui » pour réécouter côte à côte.
- Photos de progression sport, avec la même grille de comparaison que l'audio.
- Détection de plateau : pas de record depuis 4 séances sur un exercice, ou note « envie » en baisse 3 séances de suite. Une carte propose alors de changer de variante, d'alléger une semaine ou de travailler une autre sous-compétence. Jamais d'abandonner.
- Parking à idées : noter une nouvelle envie en 5 secondes sans la lancer. On la revoit au bilan de cycle.
- Observations croisées, après 4 semaines de données seulement. Exemple : « Tes séances guitare durent X min de plus les jours où tu as fait du sport ». Toujours avec le nombre de séances derrière le chiffre.
- Check-in du matin optionnel et désactivable : heures de sommeil et énergie, en 2 taps.

Terminé quand je vois et j'entends mon progrès sur un mois, en un seul écran.

## 7. Design et UX

L'appli doit se manier d'une main, en salle ou guitare sur les genoux, en quelques secondes.

- Format : mobile d'abord, largeur de référence 390 px. Zones tactiles d'au moins 44 px, actions principales en bas de l'écran.
- Navigation à 4 onglets : Aujourd'hui · Progrès · Bibliothèque (exercices, morceaux, modèles) · Moi (cycles, bilans, idées, réglages, sauvegarde). Le bouton « Commencer » reste accessible partout.
- Design system dans un dossier dédié : base neutre, un accent guitare, un accent sport, échelle typographique, espacements sur une base de 4 px, rayons, ombres. Thème sombre par défaut, thème clair disponible.
- Saisie : jamais plus de 3 taps pour enregistrer une série ou une séance. Valeurs préremplies avec la dernière séance et la cible suggérée. Un stepper plutôt qu'un clavier quand c'est possible.
- Ton des textes : direct et encourageant, jamais culpabilisant. Pas de « tu as raté », plutôt « on reprend demain ».
- Animations sobres, réservées aux moments qui comptent : record battu, semaine réussie, cycle terminé.
- États vides : chaque écran vide dit en une phrase quoi faire.
- Accessibilité : contrastes au niveau AA, respect de la taille de texte du téléphone.

## 8. Technique et qualité

Garde la stack actuelle si elle est saine. Sinon, voici la cible, et tout changement doit être justifié dans l'audit avant migration.

- Stack cible : React, Vite et TypeScript strict. IndexedDB via Dexie pour les données, l'audio et les photos. Une librairie de graphiques légère. vite-plugin-pwa pour le hors ligne.
- Logique métier isolée dans un dossier domain/ : progression, records, plateaux, XP, semaines, cycles. Aucune dépendance à l'interface.
- Tests unitaires (Vitest) sur toute cette logique. C'est là que naissent les bugs qui faussent mes stats.
- Persistance : appelle navigator.storage.persist(). Sur iPhone, Safari peut effacer les données d'un site non installé après quelques jours sans visite. Affiche donc un bandeau qui invite à installer l'appli sur l'écran d'accueil.
- Sauvegarde : export JSON complet, avec ou sans médias, et rappel chaque semaine si aucune sauvegarde récente.
- Confidentialité : photos, audio et données perso restent sur l'appareil. Rien de personnel dans le dépôt Git, surtout si le site est publié sur un hébergement public.
- Performance : premier affichage en moins de 2 secondes sur un téléphone milieu de gamme.
- Propreté du code : ESLint et Prettier, pas de any non justifié, composants de moins de 200 lignes, aucun code mort.

## 9. Hors périmètre et définition du terminé

### Hors périmètre pour cette refonte

- Comptes, serveur, synchronisation dans le cloud.
- Partage, réseau social, classements.
- Tablatures et paroles : seulement le titre et l'artiste.
- Programmes d'entraînement ou conseils nutritionnels générés par l'appli. Je saisis mes programmes, l'appli propose seulement la progression. Seule exception : le plan marathon du lot 3.
- Notifications push : à rediscuter après le lot 5.

### Un lot est terminé quand

- [ ] Mes données sont intactes après migration, vérifié par un export avant et après.
- [ ] Les tests de la logique métier passent.
- [ ] Tout est testé en 390 px, en thème sombre et clair, et hors ligne.
- [ ] docs/REFONTE-JOURNAL.md est à jour.
- [ ] Tu m'as donné une démo courte : ce qui a changé et comment le tester en 2 minutes.
- [ ] Tu t'es arrêté pour attendre ma validation avant le lot suivant.
