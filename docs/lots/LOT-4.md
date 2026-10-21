# Lot 4 — Progrès et rythme

_21 oct. 2026. Point de départ : REFONTE §6. Critère : « je vois en 10 secondes sur l'écran Progrès si j'avance »._

**État : sur l'essai `/motiv/essai/`, en attente de validation.**

## Ce qui change

- **Rythme de la semaine** (`domain/streak.ts`) : 5 séances guitare (une séance compte à partir de 30 min dans la journée) et 3 séances sport, ou le nombre prévu par le plan marathon. La série compte les semaines où les deux objectifs sont tenus. La règle 30/60 disparaît.
- **XP de progression** (`domain/levels.ts`, `domain/xp.ts`) : plus d'XP aux minutes. On gagne de l'XP en avançant :
  - record de tempo +20, difficulté supérieure +50, morceau maîtrisé +100, record sport +20, plus longue sortie +20 ;
  - objectif de la semaine tenu +100 par discipline (à partir du 19 oct.) ; objectif de cycle atteint +300.
  - 600 XP par niveau et par discipline, 1 200 pour le global. L'XP déjà gagnée reste : les niveaux ne baissent jamais. Plus de défi qui bloque le niveau.
- **Cycles de 6 semaines** (`domain/cycles.ts`, Moi) : un objectif phare par discipline, une barre de 6 semaines, puis un bilan (avant / après, records du cycle, « ce que je garde ») et « Lancer le cycle suivant ». Pendant un plan marathon, l'objectif sport est la plus longue sortie prévue dans le cycle.
- **Bilan du dimanche** (`/bilan`) : la semaine en chiffres, puis 3 questions (ce qui a marché, ce qui a bloqué, le focus). Le lien apparaît dans Aujourd'hui le dimanche (et le lundi en rattrapage) ; le focus s'affiche dans « Cette semaine » et dans Semaine.
- **Écran Progrès** (`domain/progress.ts`) :
  - en haut, « Gagné en 30 j / 90 j / 1 an » : tempo gagné, morceaux maîtrisés, force gagnée, km courus, plus longue sortie. Rien d'inventé quand rien n'a bougé ;
  - nouvelles courbes : force (1RM estimé), volume de muscu par semaine, km par semaine, allure ;
  - répartition du temps de guitare par catégorie ;
  - le mur des records, guitare et sport mélangés, du plus récent au plus ancien (10, puis « Tout voir »).
- Le mot « Défi » devient « Objectif » partout.

## Décisions (option la plus simple)

- **Stockage** : aucune migration. Les cycles et les bilans sont des champs facultatifs du profil (`cycles`, `reviews`) ; les objectifs de cycle réutilisent la table des défis (`level` = numéro du cycle). La sauvegarde les emporte.
- Les séances enregistrées avant le 19 oct. gardent leur XP d'origine, même corrigées.
- Répartition guitare : une séance n'a qu'une durée, elle est partagée à parts égales entre ses exos et ses morceaux.
- Un premier essai n'est pas un record (ni sur le mur, ni pour l'XP).
- Les rappels de défi disparaissent des notifications ; le rappel du jour devient « Ta séance de guitare du jour ».

## Captures

390 px, sombre et clair, dans `docs/lots/lot4/` (données de démo fabriquées, rien de personnel) : Aujourd'hui, Semaine, Progrès (gagné, répartition, km, force), Moi (cycle à lancer, cycle en cours), bilan du dimanche.

## Vérif

630 tests verts, oxlint et Prettier propres, build OK.
