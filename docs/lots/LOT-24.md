# Lot 24 — Un plan plus exigeant : fin du blocage à 20 km par semaine

_4 nov. 2026. Retour d'usage : « reprends tous les plans de sport, ce n'est pas assez exigeant, je ne dépasse jamais 20 km par semaine, c'est peu pour préparer un marathon »._

**État : sur la branche `refonte/lot-24`, en attente de validation. Pas en ligne.**

## Cause

Le plan **s'adaptait vers le bas** : chaque semaine, il repartait de ce qui avait été couru la semaine d'avant. Dès qu'on faisait 90 % du prévu, le volume suivant était calculé sur ces 90 %, puis +10 %, soit à peu près le volume de départ : **le plan stagnait au même niveau pour toujours** (20 km → 20 → 20 → 13 de semaine allégée → 20…). Simulation, coureur à 20 km/semaine qui fait 90 % du prévu pendant 14 semaines : 20 km à la semaine 14 ; il montait à 51 km à 100 %.

## Ce qui change

- **Une semaine tenue à 85 % ou plus compte comme tenue : la progression continue** (+10 % par semaine, une semaine allégée toutes les 4). Même coureur à 90 % : 20 → **51 km** à la semaine 14, puis 56, 62 et **65 km** au pic.
- **Entre 70 % et 85 % : on garde le même volume** (message « Semaine presque tenue : on garde le même volume avant de monter »), sans le faire redescendre.
- **Sous 70 % : le plan repart de ce qui a été couru** (sans descendre sous 70 % du volume de départ). **Sous 50 % : semaine manquée**, comme avant.
- **Volumes maximum relevés** (semaines de pic), marathon : débutant 35 → **45 km**, régulier 50 → **65 km**, confirmé 70 → **85 km** ; semi : 25 → **32**, 38 → **48**, 50 → **62**. Un coureur qui court déjà plus que le plafond le garde (jusqu'à 90 km).
- **Plus de sorties par semaine** quand tes jours disponibles le permettent : débutant 3 → **4**, régulier 4 → **5** (confirmé 5 ; mode prudent et course-marche : 4 au plus, inchangé).
- Inchangés : la progression de 10 % par semaine, la semaine allégée, la règle des 80 % d'endurance facile, la sortie longue (32 km au plus, 3 h au plus), l'affûtage, les alertes de douleur, le mode prudent (IMC ou douleur : progression plus lente).

## Exemples (plan de 25 semaines, 4 jours de course, sans retard)

| Coureur                          | Départ | Pic (semaine)   | Sortie longue max |
| -------------------------------- | ------ | --------------- | ----------------- |
| Reprise 12 km/sem                | 12     | 51 km (sem. 22) | 27 km             |
| Régulier 20 km/sem               | 20     | 65 km (sem. 18) | 28 km             |
| Confirmé 35 km/sem, 5 jours      | 35     | 85 km (sem. 17) | 32 km             |
| Régulier 20 km/sem, mode prudent | 20     | 39 km           | 21 km             |

## Stockage

Aucun changement : le plan est recalculé à chaque affichage d'après ton profil et tes sorties.

## À savoir

- Le plan ne peut pas monter plus vite que tes jours disponibles et tes sorties ne le permettent : avec 3 jours de course, le volume est plafonné par la distance de chaque sortie.
- **Mode prudent** (IMC au-dessus du seuil ou douleur signalée dans le profil) : la progression reste plus lente (+5 % par semaine, allégée toutes les 3 semaines) : pic autour de 39 km dans l'exemple. Si tu es dans ce cas et que tu veux plus, on peut en faire un réglage.
- Les programmes de **muscu** (Push / Pull / Legs, Haut / Bas, Renfo coureur) ne sont pas modifiés par ce lot.
