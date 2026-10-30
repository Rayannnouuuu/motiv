# Lot 17 — Tes tablatures

_30 oct. 2026. Demande : une bibliothèque de tabs, notamment « Iron Man » (Black Sabbath) et « Vava Inouva » (Idir)._

**État : sur l'essai `/motiv/essai/`, en attente de validation. Pas sur `/motiv/`.** La branche part de `refonte/lot-16` : l'essai montre aussi la première moitié du lot 16 (Progrès sur une page).

## Ce qui change

- **Chaque morceau a une feuille « Tablature »** : « Ajouter ma tablature » (puis « Ma tablature ») dans la feuille du morceau. Tu colles ou tapes ta tab ; elle s'affiche en police à chasse fixe, colonnes alignées, défilement à droite. Modifier, ou effacer avec confirmation.
- **L'appli ne fournit aucune tablature** : « Iron Man » et « Vava Inouva » sont des œuvres protégées, et une transcription complète en est une reproduction. Tu apportes la tienne (relevé personnel, fichier texte, site dont tu as le droit d'utiliser le contenu).
- **« Vava Inouva » (Idir) est ajouté** au catalogue de morceaux proposés. « Iron Man » y était déjà.

## Stockage

Champ facultatif `tab` sur le morceau : **pas de migration**, pas de nouvelle version de base. Il reste sur l'appareil, part dans l'export JSON complet et revient à l'import. Maximum 20 000 caractères par morceau. Rien n'entre dans le dépôt (règle « rien de personnel dans Git »). La règle du modèle « jamais de tablature ni de paroles » devient « jamais de paroles ; ta tablature seulement, sur l'appareil ».

## Pas fait

- Métronome et tablature sur le même écran (aujourd'hui : « Jouer ce morceau » ouvre le chrono).
- Import d'un fichier de tablature (Guitar Pro, etc.) : tu colles du texte.
- Fiche rédigée par moi (accordage, structure, conseils) et exercices rattachés : à voir si tu les veux.
