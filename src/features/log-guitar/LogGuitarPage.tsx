import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { normTitle } from '../../content/songCatalog'
import { useActions, useAppData } from '../../data/AppDataContext'
import { dailyPlan } from '../../domain/dailyPlan'
import { addDays } from '../../domain/date'
import { bestBpm } from '../../domain/records'
import { guitarToday } from '../../domain/streak'
import type { GuitarItem, Rating, Song } from '../../domain/types'
import { Button } from '../../ui/Button'
import { ModalBar } from '../../ui/ModalBar'
import { StepBar } from '../../ui/StepBar'
import { loadPractice, runningPracticeMinutes, savePractice } from '../practice/practiceSession'
import { StepContent, type Entry } from './StepContent'
import { PRESETS, parseDuration, type DurationChoice } from './duration'
import { StepDuration } from './StepDuration'
import { StepRatings } from './StepRatings'
import { noteOf } from '../../domain/note'

/** État de navigation accepté (accueil, chrono, fiche exo et son métronome). */
interface NavState {
  durationMin?: unknown
  exerciseId?: unknown
  /** Morceau à jouer (onglet Morceaux, accueil) : ajouté au log, créé s'il n'est pas encore dans ta liste. */
  songTitle?: unknown
  bpm?: unknown
  entries?: unknown
  step?: unknown
  day?: unknown
  practiceId?: unknown
}

/**
 * Durée reçue ; sans indication (rappel push, ouvert sans état) les minutes qui manquent aujourd'hui.
 * `null` explicite (« Logger sans durée ») ou chrono en cours : rien de présélectionné, à choisir à la main.
 */
function initialDuration(min: unknown, remainingMin: number): { choice: DurationChoice; other: string } {
  const n = typeof min === 'number' && min > 0 ? min : min === undefined ? remainingMin : 0
  if (n <= 0) return { choice: null, other: '' }
  return (PRESETS as readonly number[]).includes(n) ? { choice: n as DurationChoice, other: '' } : { choice: 'other', other: String(n) }
}

/** Entrées pré-remplies (chrono) : seulement les exos connus et les morceaux de ta liste, sans doublon. */
function validEntries(list: unknown[], songs: Song[]): Entry[] {
  const out: Entry[] = []
  const seen = new Set<string>()
  for (const v of list) {
    if (!v || typeof v !== 'object') continue
    const e = v as Record<string, unknown>
    if (e.kind === 'exercise' && typeof e.exerciseId === 'string' && getExercise(e.exerciseId) && !seen.has(`ex:${e.exerciseId}`)) {
      seen.add(`ex:${e.exerciseId}`)
      out.push({ kind: 'exercise', exerciseId: e.exerciseId, bpm: typeof e.bpm === 'string' ? e.bpm : '', ...(e.clean === true ? { clean: true } : {}) })
    } else if (e.kind === 'song' && typeof e.songId === 'string' && songs.some((s) => s.id === e.songId) && !seen.has(`song:${e.songId}`)) {
      seen.add(`song:${e.songId}`)
      out.push({ kind: 'song', songId: e.songId, mastered: e.mastered === true })
    }
  }
  return out
}

function toItem(e: Entry): GuitarItem {
  if (e.kind === 'song') return { kind: 'song', songId: e.songId, markedMastered: e.mastered }
  const bpm = Number(e.bpm)
  const maxBpm = e.bpm !== '' && Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm) : null
  // « Propre » sans tempo ne veut rien dire : ignoré.
  return maxBpm !== null && e.clean
    ? { kind: 'exercise', exerciseId: e.exerciseId, maxBpm, clean: true }
    : { kind: 'exercise', exerciseId: e.exerciseId, maxBpm }
}

export function LogGuitarPage() {
  const { data, today } = useAppData()
  const actions = useActions()
  const navigate = useNavigate()
  const nav = useLocation().state as NavState | null
  // Un chrono tourne et ce log n'en vient pas (ex. « Logger cet exo ») : pas de minutes du jour présélectionnées,
  // elles seront comptées par le chrono.
  const [chronoElsewhere] = useState(() => typeof nav?.practiceId !== 'string' && runningPracticeMinutes() !== null)
  const remainingMin = chronoElsewhere ? 0 : guitarToday(data.guitarSessions, today).remainingMin
  const [init] = useState(() => initialDuration(nav?.durationMin, remainingMin))

  const [choice, setChoice] = useState<DurationChoice>(init.choice)
  const [other, setOther] = useState(init.other)
  // Depuis le chrono : directement aux notes, le contenu et la durée sont déjà remplis.
  const [step, setStep] = useState(() => (nav?.step === 2 && parseDuration(init.choice, init.other) !== null ? 2 : 0))
  // Séance commencée avant minuit : datée de la veille.
  const [yesterday, setYesterday] = useState(() => nav?.day === addDays(today, -1))
  // Jour de référence figé à l'ouverture : un log ouvert à 23:59 et enregistré à 00:01 reste sur le bon jour.
  const [openedOn] = useState(today)
  const [preSong] = useState<Song | null>(() => {
    if (typeof nav?.songTitle !== 'string' || nav.songTitle === '') return null
    const t = normTitle(nav.songTitle)
    return data.songs.find((s) => normTitle(s.title) === t) ?? { id: crypto.randomUUID(), title: nav.songTitle, status: 'learning', masteredOn: null }
  })
  const [entries, setEntries] = useState<Entry[]>(() => {
    if (Array.isArray(nav?.entries)) return validEntries(nav.entries, data.songs)
    if (preSong) return [{ kind: 'song', songId: preSong.id, mastered: false }]
    // Ouvert depuis la fiche d'un exo : il est déjà dans la liste, au tempo du métronome s'il est donné.
    if (typeof nav?.exerciseId !== 'string' || !getExercise(nav.exerciseId)) return []
    const bpm = typeof nav.bpm === 'number' && Number.isFinite(nav.bpm) && nav.bpm > 0 ? Math.round(nav.bpm) : bestBpm(data.guitarSessions, nav.exerciseId)
    return [{ kind: 'exercise', exerciseId: nav.exerciseId, bpm: bpm === null ? '' : String(bpm) }]
  })
  const [newSongs, setNewSongs] = useState<Song[]>(() => (preSong && !data.songs.includes(preSong) ? [preSong] : []))
  const [flow, setFlow] = useState<Rating | null>(null)
  const [desire, setDesire] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationMin = parseDuration(choice, other)

  function createSong(title: string) {
    const song: Song = { id: crypto.randomUUID(), title, status: 'learning', masteredOn: null }
    setNewSongs([...newSongs, song])
    setEntries([...entries, { kind: 'song', songId: song.id, mastered: false }])
  }

  async function save() {
    if (durationMin === null || flow === null || desire === null) return
    setSaving(true)
    setError(null)
    try {
      const usedSongs = new Set(entries.flatMap((e) => (e.kind === 'song' ? [e.songId] : [])))
      // Depuis le chrono, l'id de la séance : renvoyer le même log ne le duplique pas.
      const id = typeof nav?.practiceId === 'string' && nav.practiceId !== '' ? nav.practiceId : crypto.randomUUID()
      const day = yesterday ? addDays(openedOn, -1) : openedOn
      const result = await actions.saveGuitarSession({
        id,
        day,
        durationMin,
        items: entries.map(toItem),
        newSongs: newSongs.filter((s) => usedSongs.has(s.id)),
        flowRating: flow,
        desireRating: desire,
        ...noteOf(note),
      })
      // Le chrono de cette séance est terminé.
      if (loadPractice()?.id === id) savePractice(null)
      navigate('/xp', {
        replace: true,
        state: { result, domain: 'guitar', logId: id, ...(typeof nav?.practiceId === 'string' ? { momentDay: day } : {}) },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  const canNext = step === 0 ? durationMin !== null : true

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar
        tone="guitar"
        onCancel={() => (step === 0 ? navigate('/') : setStep(step - 1))}
        cancelLabel={step === 0 ? 'Annuler' : 'Retour'}
        back={step > 0}
        cancelAria={step === 0 ? 'Fermer' : 'Retour'}
        title={<StepBar count={3} current={step} tone="guitar" />}
      />

      <div key={step} className="animate-rise flex-1">
        {step === 0 && <StepDuration choice={choice} other={other} yesterday={yesterday} onChoice={setChoice} onOther={setOther} onYesterday={setYesterday} />}
        {step === 1 && (
          <StepContent
            entries={entries}
            songs={[...data.songs, ...newSongs]}
            sessions={data.guitarSessions}
            planned={dailyPlan(data, today).map((e) => e.id)}
            challenges={data.challenges.filter((c) => c.domain === 'guitar' && c.status === 'active')}
            onEntries={setEntries}
            onCreateSong={createSong}
          />
        )}
        {step === 2 && <StepRatings flow={flow} desire={desire} note={note} onFlow={setFlow} onDesire={setDesire} onNote={setNote} />}
      </div>

      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      {step < 2 ? (
        <Button tone="guitar" disabled={!canNext} onClick={() => setStep(step + 1)}>
          Suivant
        </Button>
      ) : (
        <Button tone="guitar" disabled={flow === null || desire === null || saving} onClick={save}>
          Enregistrer
        </Button>
      )}
    </div>
  )
}
