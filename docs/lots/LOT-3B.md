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

## Étapes

- [x] A. Jetons et polices.
- [ ] B. Barre d'onglets : Aujourd'hui · Semaine · « Commencer » au centre · Progrès · Moi.
- [ ] C. Gabarit d'écran : surtitre, titre, une pastille.
- [ ] D. Aujourd'hui : héros « Prochaine séance », « Aussi aujourd'hui », « Cette semaine ».
- [ ] E. Semaine : héros du plan ou de la semaine, « Jour par jour ».
- [ ] F. Moi : niveau, objectif daté, outils.
- [ ] G. Progrès : en-tête et période.
- [ ] H. Séances guitare et sport : même gabarit.
- [ ] I. Vérification, captures, essai, démo.
