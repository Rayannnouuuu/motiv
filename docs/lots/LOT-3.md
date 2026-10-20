# Lot 3 — Plan marathon : plan

_20 oct. 2026. Point de départ : REFONTE §6 lot 3, sur la base du lot 2._

**État : fait et en ligne (20 oct.).**

## Décisions (détails, option la plus simple)

- **Où**
  - Moi › Marathon ouvre le plan (`/marathon`). Sans profil, c'est le questionnaire qui s'ouvre.
  - Aujourd'hui affiche une carte Marathon : le compte à rebours, puis la séance du jour avec « Commencer ».
- **Stockage**
  - Le profil marathon est rangé dans la ligne `profile` existante (champ `marathon`, facultatif). Pas de nouvelle table, pas de migration : la sauvegarde l'emporte déjà.
  - Le plan n'est jamais stocké. Il est recalculé à partir du profil, des sorties faites et de la date du jour. Le recalcul est donc automatique chaque lundi, et l'historique est toujours conservé.
- **Une sortie de course** est une séance sport, comme la musculation.
  - Elle contient le mouvement `course` de la bibliothèque, avec la distance et la durée.
  - La douleur (0 à 10) est notée sur la séance.
  - Elle compte pour la semaine sport et l'XP, mais pas dans les séries ni les records de musculation.
  - Une correction garde la distance et la douleur.
- **Rotation Push / Pull / Legs** : une sortie de course ou le renfo coureur ne la font pas repartir au début.
- **Faisabilité**, avec des repères modifiables dans le questionnaire :
  - confirmé (30 km par semaine ou plus, et une sortie de 15 km) : 16 semaines conseillées, 12 au minimum ;
  - régulier : 20 au minimum ;
  - débutant ou reprise : 26 au minimum, en course-marche ;
  - prudence (IMC de 30 ou plus, ou une douleur signalée) : +4 semaines au minimum.
- **Délai trop court** : un refus expliqué et 3 options.
  - Finir en course-marche : 16 semaines au minimum.
  - Viser un semi-marathon : 8 semaines au minimum pour un confirmé, 10 pour un régulier, 12 pour un débutant.
  - Choisir une course plus tardive : l'appli propose la première date réaliste.
- **Le plan**
  - 4 phases, avec les proportions indiquées dans le code.
  - Allègement : toutes les 4 semaines, ou toutes les 3 en mode prudent, avec 25 % de volume en moins. Après un allègement, on reprend au volume d'avant (la règle des +10 % porte sur la semaine de charge précédente).
  - Volume : +10 % maximum par semaine (+5 % en mode prudent).
  - Sortie longue : +2 km par semaine (+1,5 km en prudent, +2,5 km pour un confirmé), plafonnée à 32 km ou 3 h. La plus longue a lieu 3 semaines avant la course.
  - Affûtage de 3 semaines (2 si le plan est court) : 70 %, 55 %, puis 40 % du pic.
- **Allures**
  - Calculées avec la formule de Riegel depuis le chrono, avec une marge prudente de +5 %.
  - Un chrono battu en sortie (5 km, 10 km ou semi) remplace le chrono de référence.
  - Sans chrono : allures au ressenti, et zones cardiaques si les fréquences sont connues.
- **Renfo coureur**
  - Un modèle « Renfo coureur », en version salle ou maison, est créé avec le profil. Il est modifiable dans Bibliothèque › Modèles.
  - Il se lance dans la séance sport du lot 2.
  - Mouvements ajoutés à la bibliothèque : montées sur banc, abduction de hanche, dead bug, sauts pieds joints, soulevé de terre unijambe, mollets sur une jambe, gainage latéral avec élévation de jambe.
- **Adaptation**
  - On regarde les km faits les semaines passées.
  - Une semaine manquée : on ne la rattrape pas, le volume reste le même.
  - Deux semaines ou plus : on repart à 70 % de la dernière semaine faite.
  - Douleur au-dessus de 3, ou douleur 2 sorties de suite : progression gelée, alternative sans impact (vélo, marche) et conseil de consulter.
  - « Malade cette semaine » : la semaine devient allégée.
- **Fractionné et course-marche** : un minuteur d'intervalles avec des bips. Il reprend le bip du repos sport (Web Audio, comme le métronome), qui ne coupe pas ta musique.
- **Taille** : les 183 cm notés en « tour de taille » le 13 oct. pré-remplissent la taille du profil. La mesure elle-même n'est pas modifiée.

## Étapes (chacune verte et commitée)

1. Domaine : profil, faisabilité, allures, plan, renfo et adaptation, purs et testés sur au moins 6 profils types.
2. Données :
   - profil marathon et modèle renfo ;
   - sortie de course (distance, durée, douleur) ;
   - correction sans perte ;
   - rotation PPL ;
   - nouveaux mouvements.
3. Questionnaire et écran de faisabilité.
4. Vue du plan, et carte dans Aujourd'hui.
5. Séance de course : allure cible, chrono, minuteur d'intervalles, fin de sortie.
6. Vérifications, captures, version d'essai, démo.
