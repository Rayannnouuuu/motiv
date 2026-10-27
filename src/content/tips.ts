import type { ExerciseCategory as Category } from './exercises'

export type DifficultyBand = 'debutant' | 'intermediaire' | 'avance'

export function bandForDifficulty(difficulty: number): DifficultyBand {
  if (difficulty <= 3) return 'debutant'
  if (difficulty <= 7) return 'intermediaire'
  return 'avance'
}

// Familles ajoutées au lot G1 : conseils classiques, à relire (GUITARE.md §10).
const TIPS: Record<Category, Record<DifficultyBand, string[]>> = {
  chromatic: {
    debutant: [
      'Un doigt par case : index en case 1, majeur en 2, annulaire en 3, auriculaire en 4.',
      'Le doigt appuie juste derrière la frette, pas au milieu de la case : moins de force, plus de son.',
      'Laisse les doigts posés tant que tu peux : ils sont prêts pour la suite.',
    ],
    intermediaire: [
      'Aller-retour strict au médiator, même en changeant de corde.',
      'Garde les doigts près des cordes : moins ils montent, plus tu iras vite.',
      'Si une note frise, ralentis de 10 % plutôt que de forcer.',
    ],
    avance: [
      'Synchronise les deux mains : la note doit tomber pile avec le coup de médiator.',
      'Reste relâché : la vitesse vient de la détente, pas de la force.',
      'Accentue le premier coup de chaque groupe pour garder le repère du clic.',
    ],
  },
  strumming: {
    debutant: [
      'Le geste part du poignet, pas du coude : comme pour secouer de l’eau sur la main.',
      'La main bouge tout le temps, même quand elle ne touche pas les cordes.',
      'Change d’accord sur le dernier temps de la mesure : l’accord suivant arrive à l’heure.',
    ],
    intermediaire: [
      'Coups vers le bas sur le clic, vers le haut entre deux clics.',
      'Les coups vers le haut ne touchent souvent que les 3 ou 4 cordes aiguës : c’est normal.',
      'Si l’accord ne sonne pas, vérifie un doigt à la fois en arpège.',
    ],
    avance: [
      'Accentue certains coups : le groove vient des accents, pas de la vitesse.',
      'En doubles croches, des gestes plus petits et le poignet souple.',
      'Étouffe légèrement de la main gauche entre deux accords pour un son plus net.',
    ],
  },
  chords: {
    debutant: [
      'Joue chaque corde une à une : si une note est étouffée, un doigt touche une corde voisine.',
      'Le bout des doigts, bien arrondis, presque à la verticale.',
      'Le pouce derrière le manche, à peu près face au majeur.',
    ],
    intermediaire: [
      'Pose les doigts tous ensemble, pas un par un : c’est ce qui fait gagner du temps.',
      'Repère les doigts qui restent en place d’un accord à l’autre (doigts pivots).',
      'Pour le petit barré, roule légèrement l’index sur son côté.',
    ],
    avance: [
      'Barré : la pression vient du bras qui tire un peu vers toi, pas seulement du pouce.',
      'Relâche entre deux accords : serrer en continu fatigue et ralentit.',
      'Vise des changements sans trou : la dernière croche peut être jouée à vide pour gagner du temps.',
    ],
  },
  powerChords: {
    debutant: [
      'Deux doigts seulement : index sur la fondamentale, annulaire deux cases plus loin, une corde plus aiguë.',
      'Étouffe les autres cordes avec le dessous de l’index.',
      'Garde la même forme et déplace toute la main.',
    ],
    intermediaire: [
      'Relâche la pression en déplaçant la forme : tu évites les glissés parasites.',
      'Le palm mute se pose sur les cordes juste devant le chevalet, sans trop appuyer.',
      'Coups vers le bas pour un son rock plein ; aller-retour dès que ça va trop vite.',
    ],
    avance: [
      'Galop : la croche vers le bas, les deux doubles en bas-haut, ou tout vers le bas si tu tiens le tempo.',
      'Le bras droit reste détendu en doubles croches étouffées : c’est un sport d’endurance.',
      'Accentue les accords ouverts pour qu’ils ressortent des parties étouffées.',
    ],
  },
  picking: {
    debutant: [
      "Tiens le médiator avec juste assez de force pour qu'il ne tourne pas : trop serré, le son devient dur et le poignet se bloque.",
      "Le mouvement vient du poignet, pas du coude. Garde l'avant-bras presque immobile.",
      "Commence à un tempo où tu ne rates aucune note avant d'accélérer — la vitesse vient de la régularité, pas l'inverse.",
    ],
    intermediaire: [
      "Reste en aller-retour strict (alterné) même quand tu changes de corde : c'est ce qui permet de monter en vitesse proprement.",
      "Minimise l'amplitude du médiator à mesure que tu accélères — moins de mouvement, plus de précision.",
      'Travaille avec le métronome en doublant progressivement le tempo (ex. 80 → 84 → 88) plutôt que par grands sauts.',
    ],
    avance: [
      'À haute vitesse, le picking vient presque entièrement du poignet avec un minuscule mouvement des doigts en appui.',
      'Alterne des sessions à tempo cible et des sessions 20% plus lentes pour garder un son propre sous pression.',
      "Enregistre-toi : à vitesse élevée, l'oreille seule ne détecte pas toujours les irrégularités rythmiques.",
    ],
  },
  palmMuting: {
    debutant: [
      'Pose le tranchant de la paume juste devant le chevalet, pas dessus : trop en avant, le son devient trop étouffé.',
      'Garde une pression constante de la paume pendant que la main pickingue — ne la soulève pas entre les notes.',
      "Écoute la différence entre une note totalement étouffée et une note \"chug\" qui garde un peu d'attaque : c'est ce deuxième son qu'on cherche.",
    ],
    intermediaire: [
      'Varie la pression de la paume pour contraster les passages chuggés et les accents plus ouverts dans un même riff.',
      'Le palm mute doit rester net même en changeant de corde : la paume ne doit jamais perdre le contact avec le chevalet.',
      'Synchronise précisément la main gauche (étouffement des cordes non jouées) avec le palm mute pour éviter les bourdonnements.',
    ],
    avance: [
      'À tempo élevé, anticipe les relâches de palm mute une fraction de seconde avant la note ouverte pour garder un son net.',
      'Travaille les transitions rapides palm mute / notes ouvertes isolément avant de les intégrer au riff complet.',
      "Un bon chug metal vient autant de la main droite que du gain de l'ampli — ne compense pas une mauvaise technique avec plus de distorsion.",
    ],
  },
  rhythm: {
    debutant: [
      "Compte à voix haute (1-2-3-4) en jouant pour ancrer le riff dans le temps avant de t'appuyer uniquement sur le métronome.",
      "Les power chords se jouent avec l'index et l'annulaire (ou auriculaire) : garde les autres doigts détendus.",
      "Un riff lent et parfaitement en place vaut mieux qu'un riff rapide et bancal.",
    ],
    intermediaire: [
      "Travaille les changements d'accords en isolant juste la transition, en boucle, avant de rejouer le riff entier.",
      'Garde le bras de strumming en mouvement constant (haut-bas) même sur les silences, pour ne jamais perdre le tempo.',
      'Accentue légèrement le premier temps de chaque mesure pour que le riff "respire" rythmiquement.',
    ],
    avance: [
      "Sur les rythmiques syncopées, isole d'abord le contretemps seul avant de le remettre dans le riff complet.",
      "Varie l'intensité du palm mute selon les accents du riff pour donner du relief plutôt qu'un son uniforme.",
      "Joue le riff avec une boîte à rythme plutôt qu'un simple clic pour mieux sentir le groove à haute vitesse.",
    ],
  },
  scales: {
    debutant: [
      'Associe chaque note à son doigt (1 par case) et garde cette correspondance fixe pour construire ta mémoire musculaire.',
      'Joue la gamme lentement en montant ET en descendant — la descente est souvent plus difficile à garder régulière.',
      'Dis ou visualise le nom des notes pendant que tu joues : ça relie le geste à la théorie.',
    ],
    intermediaire: [
      "Entraîne-toi à démarrer la gamme sur différents degrés (pas seulement la tonique) pour mieux l'entendre partout sur le manche.",
      "Travaille la gamme en groupes de 3 ou 4 notes plutôt qu'en ligne continue pour préparer les futurs licks.",
      'Change le médiator de doigté (aller-retour vs économique) sur un même passage pour comparer la fluidité.',
    ],
    avance: [
      'Relie plusieurs positions de la gamme sur tout le manche pour sortir du "carré" d\'une seule position.',
      'Improvise de courtes phrases avec la gamme sur un backing track plutôt que de la jouer toujours de façon linéaire.',
      'Travaille la gamme avec des accents rythmiques irréguliers (ex. groupes de 3 sur une pulsation en 4) pour la rendre musicale.',
    ],
  },
  legato: {
    debutant: [
      'Pour un hammer-on propre, frappe la corde perpendiculairement avec le bout du doigt, juste derrière la frette.',
      "Le pull-off n'est pas qu'un relâchement : tire légèrement la corde vers le bas (ou le haut) en la libérant pour qu'elle sonne.",
      "Les notes en legato doivent sonner aussi fort que les notes pickées — n'hésite pas à appuyer plus fort au début.",
    ],
    intermediaire: [
      'Enchaîne hammer-on et pull-off sur la même paire de notes en boucle pour égaliser le volume des deux techniques.',
      "Garde les doigts qui n'articulent pas la note proches du manche, prêts à enchaîner, plutôt que de les lever haut.",
      "Travaille le legato sur une seule corde avant de l'étendre à des enchaînements sur plusieurs cordes.",
    ],
    avance: [
      'À haute vitesse, la régularité du legato dépend surtout de la main gauche : la main droite ne fait presque rien.',
      'Alterne des phrases en legato pur et des phrases mixtes (picking + legato) pour varier le phrasé.',
      'Surveille la justesse : le legato a tendance à "traîner" en hauteur si le doigt n\'appuie pas assez fort sur chaque note.',
    ],
  },
  bends: {
    debutant: [
      'Utilise plusieurs doigts en soutien (ex. annulaire soutenu par majeur et index) pour avoir la force nécessaire.',
      'Fais tourner le poignet, pas seulement les doigts, pour pousser ou tirer la corde avec contrôle.',
      'Vérifie la justesse du bend en comparant avec la note cible jouée normalement plus haut sur le manche.',
    ],
    intermediaire: [
      "Travaille le bend en deux temps : monte à la hauteur cible, tiens, puis relâche avec le même contrôle qu'à la montée.",
      'Un bend doit arriver pile sur le temps : synchronise le mouvement de poussée avec le métronome, pas juste la frappe initiale.',
      'Écoute des solos qui utilisent beaucoup le bend pour calibrer ton oreille sur la justesse exacte visée.',
    ],
    avance: [
      'Travaille les bends avec vibrato en gardant une amplitude de vibrato constante après avoir atteint la hauteur cible.',
      'Les bends composés (quart de ton, bend et relâche rapide) demandent un contrôle fin : ralentis-les avant de les intégrer au tempo.',
      "Garde l'oreille sur la justesse même dans un passage rapide : un bend juste à vitesse lente doit rester juste à vitesse réelle.",
    ],
  },
  arpeggios: {
    debutant: [
      "Visualise l'accord sous-jacent (majeur, mineur) avant de jouer l'arpège : ça aide à anticiper chaque changement de corde.",
      "Étouffe légèrement les cordes déjà jouées avec les doigts de la main gauche pour éviter qu'elles résonnent entre elles.",
      "Joue chaque note de l'arpège séparément et laisse-la sonner un instant avant d'enchaîner, pour bien l'entendre.",
    ],
    intermediaire: [
      "Travaille le passage d'une corde à l'autre isolément : c'est souvent là, pas dans les notes elles-mêmes, que ça accroche.",
      'Alterne arpèges montants et descendants dans le même exercice pour ne pas figer un seul sens de lecture.',
      "Associe chaque arpège à l'accord qu'il représente en le plaquant juste avant de le jouer en arpège.",
    ],
    avance: [
      "Enchaîne plusieurs arpèges liés à une progression d'accords pour entendre comment ils s'articulent musicalement.",
      "Travaille l'arpège avec des techniques mixtes (picking strict, puis tapping ou legato) pour varier les couleurs.",
      "Garde une dynamique homogène entre les cordes aiguës et graves : elles n'ont pas la même résistance ni le même volume naturel.",
    ],
  },
  sweep: {
    debutant: [
      'Commence extrêmement lentement, note par note, en laissant le médiator "tomber" d\'une corde à l\'autre dans un seul geste continu.',
      'La main gauche doit lever chaque doigt juste après avoir joué sa note, pour éviter que les cordes sonnent ensemble.',
      'Ne cherche pas la vitesse avant que chaque note individuelle soit nette et bien distincte.',
    ],
    intermediaire: [
      'Synchronise précisément main gauche et main droite : un sweep rapide mais mal synchronisé sonne flou, pas impressionnant.',
      'Travaille le sweep en deux temps (montée, puis descente) séparément avant de les enchaîner en boucle.',
      "Utilise un palm mute léger pour masquer les petites imperfections de synchronisation pendant l'apprentissage.",
    ],
    avance: [
      'À vitesse cible, le mouvement du médiator doit rester un geste fluide unique, jamais une série de coups séparés.',
      "Isole les changements de corde les plus rapides (souvent en haut de l'arpège) et boucle-les seuls à tempo réel.",
      'Enregistre-toi en gros plan sur la main gauche : les sweeps rapides révèlent vite les mouvements parasites à corriger.',
    ],
  },
}

export function tipsFor(category: Category, difficulty: number): string[] {
  return TIPS[category][bandForDifficulty(difficulty)]
}
