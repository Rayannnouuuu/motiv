# Lot 22 — La sortie longue reste une sortie longue, des allures plus exigeantes

_2 nov. 2026. Retour d'usage : « tu as transformé la séance longue en fractionné, ça ne va pas avec le programme, et les allures sont trop faciles »._

**État : sur la branche `refonte/lot-22`, en attente de validation. Pas en ligne.**

## Ce qui change

- **Aujourd'hui : ce que tu ajoutes ou déplaces passe devant le plan.** Si le plan prévoyait une sortie ce jour-là (fractionné, seuil…), c'était elle qui prenait la carte Sport et le bouton Commencer, et ta sortie longue disparaissait. Maintenant la sortie que tu as ajoutée ou déplacée se lance, et celle du plan reste listée dans la carte (« Aussi prévu · fractionné »).
- **La sortie longue d'une sortie ajoutée suit la règle du plan** : facile et régulière, sans blocs de fractionné ; de l'allure course sur la fin (25 % de la sortie, 3 à 10 km) **seulement en phase spécifique**, comme le plan. J'avais ajouté 10 % à allure course dès la phase de développement au lot 21 : retiré.
- **Allures plus exigeantes** (c'est le réglage qui change tes allures partout : plan, Aujourd'hui, minuteur) :
  - footing : de 15–25 % à **10–20 %** plus lent que l'allure marathon ;
  - sortie longue : de 18–28 % à **12–22 %** ;
  - récupération : de 30–40 % à **25–35 %** ;
  - seuil et fractionné : marge de **2 %** au lieu de 5 % sur ton chrono (la marge de 5 % reste pour l'allure marathon et le temps prédit).
- Exemple, chrono de 10 km en 48:00 : footing 6:19–6:52 → **6:03–6:36** ; longue 6:29–7:02 → **6:09–6:42** ; seuil 5:10 → **5:01** ; fractionné 4:50 → **4:42** ; allure marathon inchangée (5:30).

## Stockage

Aucun changement. Les allures sont recalculées à chaque affichage : rien à migrer.

## À savoir

- Des allures plus rapides allongent un peu la sortie longue maximale du plan (le plafond est de 3 h), donc le plan peut proposer des sorties longues un peu plus longues.
- C'est un réglage global : si c'est encore trop facile ou trop dur, on le resserre ou on le desserre, ou on en fait un réglage du profil.
