# Lot 3b — Refonte visuelle

_20 oct. 2026. Point de départ : REFONTE §7 (mis à jour le 20 oct.) et l'artefact [MOTIV — Refonte visuelle](https://claude.ai/artifact/KXWWKDbUXrhH3swfux4ztV), qui fait foi pour la disposition et le design._

**État : en cours.**

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
- **Progrès** : surtitre de la période et sélecteur 30 j / 90 j / 1 an en haut. La refonte du contenu reste au lot 4.

## Étapes

- [x] A. Jetons et polices.
- [x] B. Barre d'onglets : Aujourd'hui · Semaine · « Commencer » au centre · Progrès · Moi.
- [x] C. Gabarit d'écran : surtitre, titre, une pastille.
- [x] D. Aujourd'hui : héros « Prochaine séance », « Aussi aujourd'hui », « Cette semaine ».
- [x] E. Semaine : héros du plan ou de la semaine, « Jour par jour ».
- [x] F. Moi : niveau, objectif daté, outils.
- [x] G. Progrès : en-tête et période.
- [ ] H. Séances guitare et sport : même gabarit.
- [ ] I. Vérification, captures, essai, démo.
