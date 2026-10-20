# Lot 3b — Refonte visuelle

_20 oct. 2026. Point de départ : REFONTE §7 (mis à jour le 20 oct.) et l'artefact [MOTIV — Refonte visuelle](https://claude.ai/artifact/KXWWKDbUXrhH3swfux4ztV), qui fait foi pour la disposition et le design._

**État : 2e version sur l'essai (`/motiv/essai/`), en attente de validation.**

## Retour du 20 oct. (1re version refusée)

« La partie sport est trop petite. » Il faut que ce soit « déroulant » pour la guitare et le sport (choix : deux cartes qui s'ouvrent), et que le marathon et la muscu fassent un seul plan, bien visible. Strava : plus tard, dans un lot à part.

- **Aujourd'hui** : deux cartes de même taille, Guitare et Sport. Un toucher sur l'en-tête déplie la carte (étapes, bouton). La prochaine séance est en premier et ouverte ; l'autre est fermée.
- **Plan sport complet** (`src/domain/marathon/combined.ts`) : les créneaux de renfo du plan marathon deviennent ta rotation de muscu (Push, Pull, Legs…).
  - Combien : 3 en base et développement (une de moins en semaine allégée), 2 en spécifique, 1 légère au début de l'affûtage, rien les 10 derniers jours ni en semaine malade.
  - Où : jamais le jour de la sortie longue ; jambes jamais la veille d'une sortie longue, d'une séance dure ou de la course, ni le lendemain de la sortie longue ; jambes de préférence le jour d'une séance dure, haut du corps un jour sans course. L'ordre de la rotation est gardé, les séances sont étalées.
  - En spécifique et en affûtage, la séance jambes devient le renfo coureur.
  - Sans rotation de muscu, le renfo coureur du lot 3 reste.
  - Pendant le plan, « Commencer » ne propose pas de muscu hors plan.
- **Visible** : la carte Sport montre la sortie et la muscu du jour (« Footing 6 km + Push », avec les exos et les charges). Semaine : « marathon + muscu », course (pouls) et muscu (haltère) jour par jour, compteur « muscu 1 / 3 ». Le plan complet liste la muscu de chaque semaine et ses règles.
- Rien de stocké en plus : le plan combiné se recalcule comme le plan marathon.

## Retour suivant (20 oct.)

« Je ne peux pas modifier les séances : aujourd'hui je voudrais faire jambes et un peu de course à la fin. » Et l'animation d'ouverture est moche.

- **Séance au choix** dans la carte Sport : une pastille par séance de muscu (Push, Pull, Legs, renfo coureur pendant le plan), « Course seule », et « Course à la fin ». La carte montre alors les exos puis la course, et « Commencer » lance la muscu.
- **Course enchaînée** : la séance de sport garde la course à faire (même si l'appli est fermée entre-temps). À la fin, « Enchaîner la course » ouvre la séance de course (celle du plan s'il y en a une aujourd'hui, sinon une course libre).
- Le plan suit ce que tu as fait : la rotation repart de la séance faite, et le plan se recalcule.
- **Ouverture** : fini les grains sur fond vert. « MOTIV » monte lettre par lettre sur le fond de l'appli, puis deux traits (ambre et bleu) se tracent dessous ; environ 1,5 s, un toucher la passe, rien si les animations sont réduites.

## Validé, avec un ajout (20 oct.)

« Certaines semaines, je veux pouvoir mettre des jours d'indisponibilité. »

- **Semaine › Jour par jour › « Mes dispos »** : un interrupteur par jour à venir. Un jour décoché devient « Indisponible ».
- Des flèches passent aux semaines suivantes, jusqu'à la course, pour poser ses indisponibilités à l'avance.
- Le plan se recalcule sans ces jours : les sorties vont sur les autres jours libres (la sortie longue sur le dernier jour libre), la muscu aussi, en gardant ses règles. Une semaine raccourcie ne fait pas baisser les suivantes.
- Stockage : une liste de dates dans le profil marathon (`offDays`, facultative), comme les semaines malades. Pas de migration ; la sauvegarde l'emporte.

## Décisions (option la plus simple)

- **Couleurs**
  - Neutres de l'artefact : fond `#0F1012`, surface `#17191C`, surface haute `#1F2226`, trait `#24272B`, texte `#F2F0EB`, texte secondaire `#A3A7AE`.
  - Guitare en ambre `#F2A33A`, sport en bleu `#5AA9FF`. Le texte posé dessus est le fond `#0F1012`.
  - Le global (onglet choisi, « Commencer » au centre, réglages) devient neutre, de la couleur du texte. L'orange disparaît : il était trop proche de l'ambre de la guitare.
  - Sombre par défaut. Le clair reste au choix : fond `#F4F3EF`, accents plus profonds (ambre `#8F5300`, bleu `#1C5EB5`) pour tenir 4,5:1. Tous les contrastes sont vérifiés par `tokens.test.ts`.
- **Typo** : Barlow pour le texte, Barlow Condensed 700 pour les titres et les grands chiffres. Auto-hébergées (paquets `@fontsource` épinglés, sous-ensemble latin) : rien n'est chargé depuis un service tiers.
- **Formes** : cartes bordées d'un trait, rayon 16 ; carte héros rayon 20 ; boutons rayon 14.
- **Barre d'onglets** : Aujourd'hui · Semaine · « Commencer » au centre · Progrès · Moi.
  - « Commencer » lance la première séance du jour : une séance en cours d'abord, puis la guitare, puis le sport (la séance du plan marathon, sinon le programme dû). Rien de prévu : il ouvre toutes les façons de commencer (jouer, choisir une séance, noter une séance déjà faite).
  - Le bouton flottant disparaît. Le log rapide reste à un toucher depuis Aujourd'hui (« Autre séance ou séance déjà faite »).
  - La Bibliothèque passe sous Moi › Outils.
- **Aujourd'hui** : la prochaine séance en héros (étapes numérotées, « Commencer »), « Aussi aujourd'hui » (les autres séances du jour, les morceaux à entretenir), « Cette semaine » en deux tuiles. La pastille : la série guitare.
  - Les cartes Guitare, Sport et Marathon disparaissent : leur contenu est dans le héros, la Semaine et Moi.
  - Le cercle de niveau et les défis passent dans Moi.
- **Semaine** (nouvel onglet) : le plan marathon en héros (J-N, phase, km de la semaine), sinon les objectifs de la semaine. « Jour par jour » : ce qui est fait se corrige d'un toucher, ce qui est prévu aujourd'hui se lance.
- **Moi** : la pastille « Niveau N » ouvre la progression ; les défis en cours en héros, en attendant le cycle du lot 4 ; l'objectif daté ; les outils (Bibliothèque, Profil sportif et santé, Sauvegarde et réglages).
- **Séances** (guitare, sport, course) : la même barre du haut (quitter, nom et bloc en cours, chrono), des segments par exo ou par bloc, la carte de mesure avec ses steppers, le bouton principal en bas.
  - Le déroulé par blocs de l'artefact (échauffement, technique, répertoire, créativité ; course puis renfo dans une seule séance) n'est pas fait : il demande de changer le déroulé des séances, pas seulement leur dessin. À reprendre au lot 4 ou 5.
- **Progrès** : surtitre de la période et sélecteur 30 j / 90 j / 1 an en haut. La refonte du contenu reste au lot 4.

## Étapes

- [x] A. Jetons et polices.
- [x] B. Barre d'onglets : Aujourd'hui · Semaine · « Commencer » au centre · Progrès · Moi.
- [x] C. Gabarit d'écran : surtitre, titre, une pastille.
- [x] D. Aujourd'hui : héros « Prochaine séance », « Aussi aujourd'hui », « Cette semaine ».
- [x] E. Semaine : héros du plan ou de la semaine, « Jour par jour ».
- [x] F. Moi : niveau, objectif daté, outils.
- [x] G. Progrès : en-tête et période.
- [x] H. Séances guitare et sport : même gabarit (barre du haut, segments, carte de mesure, bouton en bas).
- [x] I. Vérification, captures (`docs/lots/lot3b/`), essai, démo.
- [x] J. Retour du 20 oct. : deux cartes qui se déplient, plan sport complet marathon + muscu.
- [ ] Strava : lot à part (l'échange de jetons demande un secret et un petit serveur ; à décider).
