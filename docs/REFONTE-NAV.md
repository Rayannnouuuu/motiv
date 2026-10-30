# MOTIV — Carte des écrans et refonte de la navigation

_30 oct. 2026. Demande : « l'application est devenue trop compliquée, trop d'onglets et de sous-menus ; 3 clics maximum par chose »._

**État : carte à valider. Aucun écran n'est modifié.** Les nombres de touchers sont comptés d'après la structure du code (pas encore au doigt). Un toucher d'onglet compte pour 1.

## 1. Ce qui existe

4 onglets (Aujourd'hui, Semaine, Progrès, Moi) + « Commencer » au centre = **5 entrées**, **23 routes**.

| Où                                                            | Ce qu'on y trouve                                                                         | Niveau  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------- |
| Aujourd'hui                                                   | cartes Guitare et Sport, « Aussi aujourd'hui », « Cette semaine », 3 liens de bas de page | 0       |
| Semaine                                                       | 7 jours (feuille), lien Marathon, lien Séance guidée, lien Bilan                          | 0       |
| Progrès                                                       | 10 courbes en onglets (8 hors écran), records, lien Avant/après                           | 0       |
| Moi                                                           | cycle, objectif daté, idées, **5 outils**                                                 | 0       |
| Moi › Bibliothèque                                            | **3 vues** : Exercices, Morceaux, Modèles                                                 | 2       |
| Moi › Sauvegarde et réglages                                  | sauvegarde, thème, style, rituels                                                         | 2       |
| Moi › Mes séances                                             | historique avec filtre                                                                    | 2       |
| Moi › Courses Strava                                          | import de fichier                                                                         | 2       |
| Moi › Profil sportif / Objectif daté › Plan marathon › Profil | questionnaire marathon et profil, deux chemins                                            | 2–3     |
| Progrès › Avant / après                                       | preuves audio et photos                                                                   | 1       |
| Commencer                                                     | 6 façons de commencer (guitare 3, sport 3)                                                | feuille |

## 2. Ce qui se répète ou se croise

- **Marathon** : 3 entrées (Moi › Objectif daté, Semaine › lien, Moi › Profil), 3 écrans (`/marathon`, `/marathon/profil`, `/course`).
- **Noter ou corriger une séance** : 5 routes (`/log`, `/log/guitare`, `/log/sport`, `/log/corriger`, `/log/corriger/:id`) et 4 portes (Commencer ×2, Aujourd'hui ×2, Mes séances).
- **Jouer de la guitare** : 3 écrans pour la même chose (`/jouer`, `/jouer/exo/:id`, `/seance`), plus la fiche `/exo/:id`.
- **Modèles de séance** : Bibliothèque › Modèles, lien dans Aujourd'hui, renvoi dans le plan marathon.
- **Bilan du dimanche** : Aujourd'hui et Semaine.
- **Bibliothèque** : un sélecteur à 3 vues sous un écran déjà dans Moi.
- **Progrès** : sélecteur de période + 10 onglets + sélecteur d'exo.

## 3. Règles

1. **3 touchers pour arriver à l'écran où l'on agit**, depuis n'importe quel onglet (l'onglet compte). L'action elle-même (choisir un statut, enregistrer) vient en plus.
2. **Un seul niveau de sous-écran** sous un onglet. Pas de menu dans un menu.
3. **Une chose n'existe qu'à un endroit.** Les autres endroits n'ont qu'un raccourci vers elle.
4. **Pas plus de 4 choix** dans un sélecteur ; au-delà, une liste.
5. **Retour** : toujours à l'écran d'où l'on vient.

## 4. Les écrans après refonte

**4 onglets + Commencer.** 23 routes → 15.

| Onglet                 | Contient                                                                                                                                                             | Remplace                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Aujourd'hui**        | Guitare, Sport, check-in, relance. Démarrer en 1 toucher.                                                                                                            | idem, allégé (plus de liens de bas de page : « Autre séance » et « Corriger » vont dans Commencer) |
| **Plan**               | La semaine, ses jours qui s'ouvrent, le plan marathon (carte « Course » → `/plan/course`). Le bilan du dimanche en bas.                                              | Semaine, `/marathon`, le bloc « Objectif daté » de Moi, le lien Bilan d'Aujourd'hui                |
| **Progrès**            | Une page qui défile : Gains, Courbes (Guitare / Sport, 4 courbes chacune), Records, **Mes séances** et **Avant / après** en deux lignes.                             | 10 onglets, `/seances` en dehors, lien `/preuves`                                                  |
| **Moi**                | **7 lignes au plus** : Profil sportif et santé · Exercices · Morceaux · Modèles de séance · Strava · Sauvegarde et réglages (+ cycle et idées en tête).              | Bibliothèque (3 vues → 3 lignes), `/moi/reglages` fusionné avec la sauvegarde                      |
| **Commencer** (centre) | Guitare : Séance guidée, Jouer maintenant. Sport : séance prévue, choisir une séance, course. **Noter une séance faite** et **Corriger la dernière**, pour les deux. | feuille actuelle + liens d'Aujourd'hui                                                             |

**Routes gardées** : `/`, `/plan`, `/plan/course`, `/progres`, `/moi`, `/moi/profil`, `/moi/morceaux`, `/moi/exercices`, `/moi/modeles`, `/moi/reglages`, `/moi/strava`, `/seance`, `/jouer`, `/log` (un seul écran pour guitare, sport et correction), `/exo/:id`, `/course`, `/xp`.
**Anciennes adresses** (`/semaine`, `/marathon`, `/bibliotheque`, `/seances`, `/preuves`, `/strava`…) : redirigées, rien ne casse (favoris, rappels).

## 5. Touchers avant / après (d'après le code)

| Je veux…                                 | Avant                  | Après                                    |
| ---------------------------------------- | ---------------------- | ---------------------------------------- |
| Démarrer la séance guidée                | 1–2                    | 1–2                                      |
| Jouer maintenant                         | 2                      | 2                                        |
| Lancer ma séance de sport                | 1–2                    | 1–2                                      |
| Noter une séance déjà faite              | 2                      | 2                                        |
| Ouvrir un jour de la semaine             | 2                      | 2                                        |
| Marquer un jour indisponible             | 3                      | 3                                        |
| Voir le plan marathon                    | 2 (Moi) ou 2 (Semaine) | **1** (onglet Plan)                      |
| Changer mon objectif de course           | 3                      | 3                                        |
| Changer l'ordre d'un modèle de séance    | **5–6**                | **3 + flèches** (Moi › Modèles › séance) |
| Changer le statut d'un morceau           | **5**                  | **4** (Moi › Morceaux › ligne › statut)  |
| Voir la courbe d'un exo                  | 3+ (onglet hors écran) | **2**                                    |
| Retrouver et corriger une vieille séance | 3                      | **3** (Progrès › Mes séances › séance)   |
| Importer un fichier Strava               | 3                      | **3**                                    |
| Sauvegarder / restaurer                  | 3                      | **3**                                    |
| Changer le thème                         | 3                      | **3**                                    |
| Faire le bilan du dimanche               | 2                      | **2**                                    |
| Écouter l'avant / après                  | 2                      | **2**                                    |

Les deux lignes en gras avec « statut » et « modèle » sont les seules à dépasser 3 si l'on compte l'action ; elles arrivent à l'écran voulu en 3.

## 6. Lots

| Lot    | Contenu                                                                                                | Risque                     |
| ------ | ------------------------------------------------------------------------------------------------------ | -------------------------- |
| **14** | Navigation : onglet Plan (Semaine + marathon), Commencer complet, redirections des anciennes adresses. | Moyen : habitudes          |
| **15** | Moi à plat (7 lignes), Bibliothèque éclatée en 3 lignes, Réglages + Sauvegarde fusionnés.              | Faible                     |
| **16** | Progrès sur une page, Mes séances et Avant / après dedans, un seul écran de saisie `/log`.             | Moyen : le plus gros écran |

Chaque lot : branche, tests, essai, validation, puis « Push ». Aucune migration de données (les adresses changent, le stockage non).
