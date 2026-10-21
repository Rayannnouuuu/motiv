# Lot 5 — Preuves et anti-stagnation

_21 oct. 2026. Point de départ : REFONTE §6. Critère : « je vois et j'entends mon progrès sur un mois, en un seul écran »._

**État : validé et en ligne sur `/motiv/` (« Push tout », 21 oct.).**

## Ce qui change

- **Avant / après** (`/preuves`, lien en haut de Progrès) : un seul écran, deux cartes.
  - **À écouter** : choisis un morceau du répertoire ou un exo joué, « Enregistrer » au micro (5 min au plus), puis « Arrêter ». La carte met côte à côte l'enregistrement d'il y a au moins 30 jours (le plus proche de cette date) et le dernier. Avec un seul, elle conseille la date du suivant.
  - **À voir** : « Prendre une photo » (appareil photo du téléphone), même comparaison. Photo réduite à 1 280 px pour ne pas remplir le téléphone.
  - « Tout voir » liste tout, et chaque preuve se supprime (deux touchers).
- **Plateau** (Aujourd'hui) : pas de record depuis 4 séances sur un exo, ou l'envie en baisse 3 séances de suite. Une carte « On relance » propose trois pistes : changer de variante (un exo de la même famille, avec le lien), alléger une semaine (le tempo ou la charge à viser), travailler une autre sous-compétence (la moins travaillée du mois). Jamais d'arrêter. « Plus tard » la cache une semaine.
- **Parking à idées** (Moi › Idées) : une ligne, « Garder », c'est noté. Au bilan de cycle, chaque idée en attente se lance ou se laisse.
- **Observations croisées** (Progrès), après 4 semaines de données seulement, toujours avec le nombre de séances derrière : durée de la guitare les jours de sport, envie de rejouer les jours de sport, notion du temps le matin ou le soir, durée après une bonne nuit. Un écart trop petit (moins de 5 min ou 0,5 point) ou moins de 3 séances de chaque côté : rien n'est affiché.
- **Check-in du matin** (Aujourd'hui, avant midi) : sommeil puis énergie, enregistré au 2e tap. « Passer » pour aujourd'hui, « Ne plus proposer », et un interrupteur dans Réglages › Rituels.

## Stockage

- **Base en version 2** : une seule table ajoutée, `media`, qui garde les octets des fichiers audio et photo (pas de Blob : Safari les garde mal dans IndexedDB). Les autres tables ne bougent pas.
- Les fiches des preuves, les idées et les check-ins sont des champs facultatifs du profil : le format des données reste 1, les anciennes sauvegardes s'importent comme avant.
- **Sauvegarde** : « Exporter mes données » comme avant (sans les fichiers) ; « Exporter avec photos et audio » ajoute les fichiers au JSON. L'import les remet. Une preuve importée sans son fichier affiche « Fichier absent de ce téléphone ».
- Montée v1 → v2 testée sur une base de test et sur une copie de tes vraies données (identique, rien perdu).
- Photos et audio restent sur le téléphone : rien dans le dépôt.

## Décisions (option la plus simple)

- « Envie en baisse 3 séances de suite » : 3 baisses d'affilée (chaque séance notée plus bas que la précédente).
- Un exo laissé de côté plus de 3 semaines n'est pas signalé en plateau.
- Le check-in n'apparaît que le jour même, avant midi (heure de Paris).
- « Plus tard » et « Passer » sont retenus sur ce téléphone seulement.

## Corrigé au passage

- Réglages affichait la section Sauvegarde deux fois (depuis le lot 3b).
- Progrès › « Gagné en … » restait vide quand tout l'historique tenait dans la période : il part maintenant de la première valeur de la période.

## Captures

390 px, sombre et clair, dans `docs/lots/lot5/` (données de démo fabriquées, micro factice, rien de personnel) : Aujourd'hui (check-in, plateau), Progrès (observations, lien Avant / après), Avant / après vide puis avec comparaison, Moi (idées), Réglages (Rituels, export avec médias).

## Vérif

664 tests verts, oxlint et Prettier propres, build OK. Enregistrement réel vérifié dans Chromium avec un micro factice (fichier relu, 2,5 s).
