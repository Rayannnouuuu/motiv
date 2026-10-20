/** Morceaux proposés (titre, artiste, difficulté estimée 1-10, accordage). Pas de tablatures. */
export interface CatalogSong {
  title: string
  artist: string
  difficulty: number
  tuning: string
}

const s = (title: string, artist: string, difficulty: number, tuning = 'Standard'): CatalogSong => ({ title, artist, difficulty, tuning })

export const SONG_CATALOG: CatalogSong[] = [
  // Repris de l'ancien site
  s('Smoke on the Water', 'Deep Purple', 2),
  s('Iron Man', 'Black Sabbath', 2),
  s('Paranoid', 'Black Sabbath', 2),
  s('Du Hast', 'Rammstein', 2),
  s('Breaking the Law', 'Judas Priest', 3),
  s('Enter Sandman', 'Metallica', 3),
  s('Down With the Sickness', 'Disturbed', 3),
  s('Seek and Destroy', 'Metallica', 4),
  s('Symphony of Destruction', 'Megadeth', 4),
  s('Crazy Train', 'Ozzy Osbourne', 5),
  s('Chop Suey!', 'System of a Down', 5),
  s('The Trooper', 'Iron Maiden', 5),
  s('Walk', 'Pantera', 5, 'Drop D'),
  s('Still Counting', 'Volbeat', 5),
  s('Master of Puppets', 'Metallica', 6, 'Mi♭'),
  s('Battery', 'Metallica', 7, 'Mi♭'),
  s('Nightmare', 'Avenged Sevenfold', 8),
  s('Raining Blood', 'Slayer', 8),
  s("Tears Don't Fall", 'Bullet For My Valentine', 8, 'Mi♭'),
  s('Pull Harder on the Strings of Your Martyr', 'Trivium', 8, 'Mi♭'),
  // Autres classiques
  s('Seven Nation Army', 'The White Stripes', 1),
  s('Smells Like Teen Spirit', 'Nirvana', 2),
  s('War Pigs', 'Black Sabbath', 3),
  s('Highway to Hell', 'AC/DC', 3),
  s('Whole Lotta Love', 'Led Zeppelin', 3),
  s('Killing in the Name', 'Rage Against the Machine', 3, 'Drop D'),
  s('Last Resort', 'Papa Roach', 3),
  s('Back in Black', 'AC/DC', 4),
  s('Ace of Spades', 'Motörhead', 4),
  s('Sad But True', 'Metallica', 4, 'Ré standard'),
  s('Wherever I May Roam', 'Metallica', 4),
  s('Bulls on Parade', 'Rage Against the Machine', 4, 'Drop D'),
  s('Duality', 'Slipknot', 4, 'Drop B'),
  s('Psychosocial', 'Slipknot', 5, 'Drop B'),
  s('Toxicity', 'System of a Down', 5, 'Drop C'),
  s('Run to the Hills', 'Iron Maiden', 6),
  s('Fade to Black', 'Metallica', 6),
  s('The Number of the Beast', 'Iron Maiden', 6),
  s('Thunderstruck', 'AC/DC', 6),
  s("Sweet Child O' Mine", "Guns N' Roses", 6, 'Mi♭'),
  s('One', 'Metallica', 7),
  s('Aces High', 'Iron Maiden', 7),
  s('Cowboys from Hell', 'Pantera', 7),
  s('Painkiller', 'Judas Priest', 8),
  s('Holy Wars... The Punishment Due', 'Megadeth', 9),
]

export const normTitle = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const byTitle = new Map(SONG_CATALOG.map((c) => [normTitle(c.title), c]))

/** Fiche catalogue d'un morceau d'après son titre (insensible à la casse et à la ponctuation). */
export function catalogSong(title: string): CatalogSong | undefined {
  return byTitle.get(normTitle(title))
}
