# MOTIV — Audit de fluidité d'utilisation, et piste de style

_30 oct. 2026. Demandé après l'essai de la séance guidée : « beaucoup d'options qu'on ne peut pas cocher, 15 clics pour modifier l'ordre des exercices, des zones qu'on ne peut pas toucher »._

**État : audit seulement. Rien n'est corrigé dans l'appli en ligne. Le style « pixel » est un essai à activer dans Réglages › Affichage.**

## En bref

- Tu as raison, et c'est mesurable : sur 19 écrans (390 px de large), **121 contrôles font moins de 44 px**, **31 blocs montrent quelque chose sans rien ouvrir**, et **14 cartes n'ont qu'un petit lien** (le reste de la carte est mort).
- Les trois pires, par ce que tu fais le plus : **ordre et remplacement des exercices** (impossible ou minuscule), **liste des morceaux** (45 petits menus de 20 px de haut), **Semaine** (les 7 jours ne s'ouvrent pas).
- Le style de ta capture est **faisable** : traits épais, ombre dure, couleurs vives, titres en pixel. Un premier essai avec les vrais écrans tient dans un calque de style (une centaine de lignes), sans toucher aux écrans eux-mêmes. Voir la planche `docs/audit-ux/planche-style.jpg`.
- Je recommande **la fluidité d'abord, le style ensuite** : le style touche chaque composant, autant corriger les zones tactiles une fois, puis habiller.

## Méthode

1. Un script ouvre 19 écrans sur des données de démo (390 × 844) et relève chaque contrôle : taille, s'il est recouvert, s'il sort de l'écran. Il relève aussi les **blocs** (carte, ligne, tuile) qui contiennent du texte : sans aucun contrôle dedans ni autour (« mort »), ou avec un contrôle qui n'en couvre que moins de 30 % (« étroit »). Mesures brutes : `docs/audit-ux/mesures-zones-tactiles.json`.
2. Des parcours comptés touche par touche dans le navigateur (séance guidée) et d'après la structure du code (séance de sport, saisie d'un log).
3. Lecture des écrans pour les actions qui n'existent pas.

Limite : je n'ai pas pu tester sur un vrai doigt. 44 px est la règle d'Apple pour une zone tactile ; en dessous, on rate souvent et on tape deux fois.

## 1. Zones qui ne se touchent pas

### Blocs qui montrent quelque chose sans rien ouvrir

| Écran | Ce qui ne répond pas | Ce qu'on attend |
| --- | --- | --- |
| Semaine | Les 7 lignes « Lun 26 · Repos… » (348 × 52). Aussi la carte « Objectifs de la semaine ». | Un jour s'ouvre : voir, ajouter ou déplacer une séance, marquer indisponible. |
| Aujourd'hui | Les deux tuiles « Guitare 0/5 » et « Sport 0/3 » de « Cette semaine ». | Elles ouvrent la Semaine. Seul « Voir la semaine » le fait, et il fait 86 × 16. |
| Progrès | « Gagné en 90 j » (chaque ligne), les observations, la courbe, **les 10 records récents**. | Un record ouvre l'exercice et sa courbe. |
| Moi | Les deux objectifs du cycle. | Ils ouvrent la fiche de l'objectif. |
| Fiche exo | La tablature, les conseils. | (texte et dessin) La tablature gagnerait à pouvoir s'agrandir pour jouer. |
| Réglages | « Version ». | (pas d'action utile) |
| Strava | Les deux blocs d'explication. | (texte seulement) |

### Cartes où seul un petit morceau est tactile

Aujourd'hui : bandeau « Ajoute MOTIV à l'écran d'accueil » (8 % de la carte), bandeau de sauvegarde (19 %), carte « On relance » (10 %), « Cette semaine » (2 %). Moi : le cycle (13 %), les idées (27 %). **Réglages : les lignes avec un interrupteur** (« Check-in du matin » : l'interrupteur ne couvre que 9 % de la ligne). Il faut viser l'interrupteur de 51 × 31, et pas la ligne.

### Contrôles de moins de 44 px (121 au total)

| Contrôle | Taille | Où |
| --- | --- | --- |
| Menu « Statut » de chaque morceau | **100 × 20** (45 morceaux, 45 menus) | Bibliothèque › Morceaux |
| Monter / Descendre une séance ou un exo | **22 × 26** | Bibliothèque › Modèles, éditeur de séance |
| Choix de période, de vue, de thème, de discipline | 32 de haut | Partout (contrôles segmentés) |
| Les 10 onglets de courbes | 36 de haut, **8 sur 10 hors écran** | Progrès |
| Raccourcis du métronome (−5, Record, Cible, +5) | 30 de haut | Fiche exo |
| « Plus tard », « Fermer », « Annuler », « Moi » (retour) | 28 à 38 de haut | Cartes, barres du haut |
| Liens des pistes « On relance », « Séance guidée » | 40 de haut | Aujourd'hui |
| « Autre séance ou séance déjà faite », « Corriger le dernier log » | 36 de haut | Aujourd'hui |
| Questionnaire marathon : 19 choix | 32 de haut | Profil sportif |

## 2. Actions qui manquent ou coûtent trop de touchers

| Ce que tu veux faire | Aujourd'hui | Problème |
| --- | --- | --- |
| **Changer l'ordre des exercices d'un modèle de séance** | Moi › Bibliothèque › Modèles › Modifier › ▲ ou ▼ (22 px) pour chaque cran › Enregistrer : **5 touchers pour monter un exo de 3 crans**, sur des cibles minuscules | Pas de glisser-déposer ; cibles trop petites. |
| **Changer l'ordre ou remplacer un des 3 exos du plan du jour (guitare)** | **Impossible** | Le plan est calculé ; tu peux seulement l'ouvrir ou le cocher. |
| **Ajouter, déplacer ou remplacer un exo pendant une séance de sport** | **Impossible.** « Changer » (texte seul, en haut à droite) ne sert qu'à choisir une autre séance, et disparaît dès la première série. « Exo suivant » saute, c'est tout | Une séance de sport suit strictement l'ordre du modèle. |
| **Saisir une charge jamais faite** | Pas à pas de 2,5 kg : **24 touchers pour 60 kg** (ou taper dans le champ) | Pas de répétition à l'appui long, pas de saisie directe évidente. |
| **Séance de sport « Pull » (6 exos × 4 séries)** | ≥ **24 touchers de séries** + 5 « Exo suivant » + départ et fin ≈ 35 | « Même chose que la dernière fois » n'est pas en un toucher. |
| **Séance guidée de 30 min, du début au log** | **≈ 20 touchers** (compté), dont 6 de mise en place la 1re fois | Le log final redemande ce que la séance sait déjà. |
| **Passer un morceau à « maîtrisé » ou « à entretenir »** | Menu de 20 px dans la ligne ; le titre ne s'ouvre pas | Pas de fiche du morceau. |
| **Ajouter une séance à un autre jour de la semaine** | Passer par Commencer › Noter une séance déjà faite, puis régler le jour | Les jours de la Semaine ne s'ouvrent pas. |
| **Voir la courbe d'un record** | Progrès › onglet (hors écran) › menu d'exo | Un record n'ouvre rien. |

## 3. Ce que je propose, dans l'ordre

Effort : S = quelques heures de travail de ma part, M = une journée, L = plus.

1. **Règle générale : toute carte, ligne ou tuile qui montre quelque chose l'ouvre, sur toute sa surface ; toute zone fait au moins 44 px.** (M)
   - Les composants de base (ligne, tuile, carte, contrôle segmenté, interrupteur) portent la règle : ils la corrigent partout d'un coup.
   - Réglages : toute la ligne bascule l'interrupteur.
   - Aujourd'hui : « Cette semaine », les tuiles et les bandeaux ouvrent leur écran sur toute la surface.
2. **Semaine : chaque jour s'ouvre** sur une feuille : le plan du jour, ajouter ou déplacer une séance, marquer indisponible. (M)
3. **Ordre des exercices, partout** (modèles, plan du jour guitare, séance de sport en cours, séance guidée) : une poignée à glisser-déposer + appui long, et « Monter / Descendre » gardés en grands boutons pour l'accessibilité. « Remplacer » et « Ajouter un exo » dans chaque liste. (L)
4. **Morceaux** : toute la ligne s'ouvre sur une feuille (statut en grandes pastilles, objectif de tempo, notes). Plus de menus de 20 px. (M)
5. **Saisie rapide** (S à M) :
   - appui long sur ± pour répéter, et pavé numérique direct sur la charge ;
   - « Comme la dernière fois » en un toucher ;
   - le log de fin de séance guidée se pré-remplit complètement et ne demande que les deux notes.
6. **Progrès** : au lieu de 10 onglets qui défilent (8 hors écran), deux niveaux visibles : Guitare / Sport, puis 3 ou 4 courbes. Les records ouvrent leur courbe. (M)
7. **Retour visuel** de ce qui vient d'être fait (coche, vibration) sur chaque action. (S)

Les points 1, 2, 4 et 5 règlent l'essentiel de ce que tu décris. Le point 3 est le plus gros ; je le ferais en dernier de cette série, avec son propre essai.

## 4. Changer de style (ta capture)

**C'est faisable, et c'est déjà essayé.** J'ai posé un calque de style qui ne s'active que si on le choisit (Réglages › Affichage › Style : Pixel). Il reprend ce que montre ta capture :

- fond crème à damier, cartes blanches avec **trait noir de 3 px et ombre dure** (décalée, sans flou) ;
- boutons qui **s'enfoncent à l'appui**, onglet actif plein et noir ;
- aplats jaune (guitare) et bleu (sport), texte coloré foncé sur blanc pour rester lisible ;
- **titres de page en police pixel** (Pixelify Sans, auto-hébergée, rien n'est chargé d'un service tiers).

La planche `docs/audit-ux/planche-style.jpg` montre quatre vrais écrans, avant et après, **sans avoir changé un écran** : tout passe par les couleurs, les rayons, les ombres et les polices.

**Ce que j'ai appris en l'essayant (et à ne pas répéter) :**
- La police pixel est **illisible à petite taille** : le chiffre 5 ressemble à un S (« 1S min » pour « 15 min ») et le C à un O (« OYCLE »). Elle reste donc réservée aux **grands titres de page** ; surtitres, chiffres et textes gardent Barlow.
- Le jaune vif sur blanc ne passe pas le contraste AA : les textes colorés prennent une teinte foncée, les aplats gardent le jaune.
- **Le mode sombre** n'est pas fait : ce style est pensé en clair. Un sombre brutaliste est possible (traits clairs, ombres colorées), mais c'est un second travail.

**Ce que je ne reprends pas de la capture :** l'avatar pixel, les icônes, les textes, le nom, la mise en page de leurs écrans. Seulement la famille de style (néo-brutalisme : traits épais, ombres dures, couleurs vives).

**Pour aller de l'essai au style définitif (lot de style) :** corriger les composants pour que les traits, ombres et états « pressé » viennent des composants plutôt que d'un calque (M à L), ajouter un vrai état sombre, refaire les captures, vérifier les contrastes (les tests de contraste existent déjà). Rien ne casse les données.

## 5. Question

Je lance **la fluidité d'abord (points 1, 2, 4, 5), puis le lot de style**, ou tu préfères **le style d'abord** ?
