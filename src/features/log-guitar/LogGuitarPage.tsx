import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { useActions, useAppData } from '../../data/AppDataContext'
import { dailyPlan } from '../../domain/dailyPlan'
import { addDays } from '../../domain/date'
import { bestBpm } from '../../domain/records'
import type { GuitarItem, Rating, Song } from '../../domain/types'
import { Button } from '../../ui/Button'
import { StepBar } from '../../ui/StepBar'
import { StepContent, type Entry } from './StepContent'
import { PRESETS, parseDuration, type DurationChoice } from './duration'
import { StepDuration } from './StepDuration'
import { StepRatings } from './StepRatings'

function initialDuration(min: unknown): { choice: DurationChoice; other: string } {
  if (typeof min !== 'number' || min <= 0) return { choice: null, other: '' }
  return (PRESETS as readonly number[]).includes(min) ? { choice: min as DurationChoice, other: '' } : { choice: 'other', other: String(min) }
}

function toItem(e: Entry): GuitarItem {
  if (e.kind === 'song') return { kind: 'song', songId: e.songId, markedMastered: e.mastered }
  const bpm = Number(e.bpm)
  return { kind: 'exercise', exerciseId: e.exerciseId, maxBpm: e.bpm !== '' && Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm) : null }
}

export function LogGuitarPage() {
  const { data, today } = useAppData()
  const actions = useActions()
  const navigate = useNavigate()
  const nav = useLocation().state as { durationMin?: unknown; exerciseId?: unknown } | null
  const init = initialDuration(nav?.durationMin)

  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<DurationChoice>(init.choice)
  const [other, setOther] = useState(init.other)
  const [yesterday, setYesterday] = useState(false)
  const [entries, setEntries] = useState<Entry[]>(() => {
    // Ouvert depuis la fiche d'un exo : il est déjà dans la liste.
    if (typeof nav?.exerciseId !== 'string' || !getExercise(nav.exerciseId)) return []
    const best = bestBpm(data.guitarSessions, nav.exerciseId)
    return [{ kind: 'exercise', exerciseId: nav.exerciseId, bpm: best === null ? '' : String(best) }]
  })
  const [newSongs, setNewSongs] = useState<Song[]>([])
  const [flow, setFlow] = useState<Rating | null>(null)
  const [desire, setDesire] = useState<Rating | null>(null)
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
      const id = crypto.randomUUID()
      const result = await actions.saveGuitarSession({
        id,
        day: yesterday ? addDays(today, -1) : today,
        durationMin,
        items: entries.map(toItem),
        newSongs: newSongs.filter((s) => usedSongs.has(s.id)),
        flowRating: flow,
        desireRating: desire,
      })
      navigate('/xp', { replace: true, state: { result, domain: 'guitar', logId: id } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  const canNext = step === 0 ? durationMin !== null : true

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={step === 0 ? 'Fermer' : 'Retour'}
          className="text-xl text-muted"
          onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}
        >
          {step === 0 ? '✕' : '←'}
        </button>
        <div className="flex-1">
          <StepBar count={3} current={step} />
        </div>
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepDuration choice={choice} other={other} yesterday={yesterday} onChoice={setChoice} onOther={setOther} onYesterday={setYesterday} />
        )}
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
        {step === 2 && <StepRatings flow={flow} desire={desire} onFlow={setFlow} onDesire={setDesire} />}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {step < 2 ? (
        <Button disabled={!canNext} onClick={() => setStep(step + 1)}>
          Suivant
        </Button>
      ) : (
        <Button disabled={flow === null || desire === null || saving} onClick={save}>
          Enregistrer
        </Button>
      )}
    </div>
  )
}
