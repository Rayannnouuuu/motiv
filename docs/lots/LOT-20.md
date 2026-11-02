# Lot 20 — Moduler ses journées

_2 nov. 2026. Demande : « moduler toutes mes journées, ajouter les séances que je veux, faire aujourd'hui la séance longue que je n'ai pas pu faire hier, faire plus de sport que ce qui est prévu »._

**État : en ligne sur `/motiv/` (« Push », 2 nov.), sans passage par l'essai : son déploiement n'a pas pu être lancé (outil GitHub déconnecté).**

## Ce qui change

- **Ajouter une séance à un jour** (Plan › toucher un jour › « Ajouter une séance », à partir d'aujourd'hui) : **muscu** (un de tes modèles), **course** (footing, sortie longue, récupération, seuil, fractionné, distance réglable de 1 à 60 km) ou **guitare**. Sans limite : on peut dépasser le programme.
- **Déplacer ou retirer** une séance prévue (du plan ou ajoutée) : toucher la séance dans la feuille du jour › « Déplacer à un autre jour » (aujourd'hui, demain, ou un des 7 prochains jours) › « Retirer de ce jour ». Toucher une séance prévue n'est donc plus un lancement direct dans la feuille ; le lancement direct reste sur la ligne du jour (la puce) et sur Aujourd'hui.
- **Rattraper** : Aujourd'hui affiche une carte **« Pas faite »** pour les séances prévues dans les 3 derniers jours et non faites (sortie longue d'hier, muscu…) : « La faire aujourd'hui » (la séance est déplacée sur aujourd'hui) ou « Laisser tomber » (retirée). Les vélo/marche et les courses ne comptent pas comme manquées.
- **Ce qui est ajouté pour aujourd'hui apparaît sur Aujourd'hui**, dans la carte Sport et sous « Commencer » : une sortie ajoutée se lance avec sa distance (course libre) ; une muscu avec son modèle. Sans plan marathon aussi.
- **Jours passés de la semaine** : les séances prévues et pas faites y sont marquées « manquée ».
- Une séance ajoutée est **faite** dès qu'une séance du même genre est notée ce jour-là. Les objectifs de la semaine ne changent pas : une séance en plus compte simplement comme faite.

## Stockage

Champ facultatif `planEdits` du profil (séances ajoutées, séances du plan masquées un jour) : **pas de migration**, il part dans l'export JSON et revient à l'import. On ne garde que 14 jours de passé. Le plan marathon n'est pas modifié : il se recalcule toujours chaque lundi d'après ce qui est fait.

## Pas fait

- Glisser-déposer.
- Revenir sur la semaine précédente depuis Plan (les 3 derniers jours se rattrapent depuis Aujourd'hui).
- Une séance déplacée ne change pas la charge calculée du plan marathon.
- Ajouter une séance à un jour passé (utilise « Noter une séance » ou le log).
