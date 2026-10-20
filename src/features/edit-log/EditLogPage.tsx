import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { dailyPlan } from '../../domain/dailyPlan'
import { lastLog, type LastLog } from '../../domain/lastLog'
import type { Domain, GuitarItem, GuitarSession, Rating, Song, SportSession, SportSet } from '../../domain/types'
import type { XpResult } from '../../domain/xp'
import { Button } from '../../ui/Button'
import { ModalBar } from '../../ui/ModalBar'
import { RatingPicker } from '../../ui/RatingPicker'
import { WeightInput } from '../../ui/WeightInput'
import { StepContent, type Entry } from '../log-guitar/StepContent'

const input = 'rounded-sm bg-fill px-2 py-1.5 tabular-nums outline-none'
const MAX_DURATION = 600

const longDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** Champs communs : date, durée, notes, dans la couleur de la discipline du log. */
function Common({ domain, day, duration, flow, desire, today, onDay, onDuration, onFlow, onDesire }: {
  domain: Domain
  day: string
  duration: string
  flow: Rating
  desire: Rating
  today: string
  onDay: (d: string) => void
  onDuration: (d: string) => void
  onFlow: (r: Rating) => void
  onDesire: (r: Rating) => void
}) {
  return (
    <>
      <div className="rows overflow-hidden rounded-md bg-surface">
        <label className="flex min-h-11 items-center justify-between gap-2 px-4 py-1.5">
          <span className="t-body">Date</span>
          <input type="date" value={day} max={today} onChange={(e) => onDay(e.target.value || day)} className={`t-body bg-transparent text-right outline-none ${TONE.text[domain]}`} />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-2 px-4 py-1.5">
          <span className="t-body">Durée (min)</span>
          <input type="number" inputMode="numeric" min={1} max={MAX_DURATION} value={duration} onChange={(e) => onDuration(e.target.value)} className={`${input} t-body w-24 text-right`} />
        </label>
      </div>
      <RatingPicker tone={domain} label="Temps oublié" value={flow} onChange={onFlow} />
      <RatingPicker tone={domain} label="Envie d'y retourner" value={desire} onChange={onDesire} />
    </>
  )
}

const validDuration = (s: string) => {
  const n = Number(s)
  return Number.isInteger(n) && n > 0 && n <= MAX_DURATION ? n : null
}

function toEntry(it: GuitarItem): Entry {
  return it.kind === 'song'
    ? { kind: 'song', songId: it.songId, mastered: it.markedMastered }
    : { kind: 'exercise', exerciseId: it.exerciseId, bpm: it.maxBpm === null ? '' : String(it.maxBpm) }
}

function toItem(e: Entry): GuitarItem {
  if (e.kind === 'song') return { kind: 'song', songId: e.songId, markedMastered: e.mastered }
  const bpm = Number(e.bpm)
  return { kind: 'exercise', exerciseId: e.exerciseId, maxBpm: e.bpm !== '' && Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm) : null }
}

/** Renumérote les séries de chaque exo à partir de 1, dans l'ordre. */
function renumber(sets: SportSet[]): SportSet[] {
  const count = new Map<string, number>()
  return sets.map((s) => {
    const n = (count.get(s.programExerciseId) ?? 0) + 1
    count.set(s.programExerciseId, n)
    return { ...s, setIndex: n }
  })
}

function useSave() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<XpResult | null>, domain: 'guitar' | 'sport', logId: string) {
    setSaving(true)
    setError(null)
    try {
      const result = await fn()
      // edited : une correction ne refête pas la série ni la semaine.
      if (result) navigate('/xp', { replace: true, state: { result, domain, logId, edited: true } })
      else navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }
  return { saving, error, run }
}

function DeleteButton({ domain, onDelete, disabled }: { domain: Domain; onDelete: () => void; disabled: boolean }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming)
    return (
      <Button variant="ghost" tone="danger" disabled={disabled} onClick={() => setConfirming(true)}>
        Supprimer ce log
      </Button>
    )
  return (
    <div className="animate-rise flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <p className="t-subhead text-center">Supprimer ce log ? Son XP sera retirée.</p>
      <div className="flex gap-2">
        <Button variant="ghost" tone={domain} onClick={() => setConfirming(false)}>
          Annuler
        </Button>
        <Button tone="danger" className="flex-1" disabled={disabled} onClick={onDelete}>
          Supprimer
        </Button>
      </div>
    </div>
  )
}

function EditGuitar({ session }: { session: GuitarSession }) {
  const { data, today } = useAppData()
  const actions = useActions()
  const { saving, error, run } = useSave()
  const [day, setDay] = useState(session.day)
  const [duration, setDuration] = useState(String(session.durationMin))
  const [flow, setFlow] = useState(session.flowRating)
  const [desire, setDesire] = useState(session.desireRating)
  const [entries, setEntries] = useState<Entry[]>(() => session.items.map(toEntry))
  const [newSongs, setNewSongs] = useState<Song[]>([])

  // Les morceaux passés en « maîtrisé » par ce log restent modifiables ici.
  const masteredHere = new Set(session.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : [])))
  const songs = [
    ...data.songs.map((s) => (masteredHere.has(s.id) && s.masteredOn === session.day ? { ...s, status: 'learning' as const, masteredOn: null } : s)),
    ...newSongs,
  ]
  const min = validDuration(duration)

  const save = () =>
    run(async () => {
      const items = entries.map(toItem)
      const used = new Set(items.flatMap((it) => (it.kind === 'song' ? [it.songId] : [])))
      // Morceau décoché : il redevient « en cours ».
      for (const id of masteredHere) {
        const still = items.some((it) => it.kind === 'song' && it.songId === id && it.markedMastered)
        const song = data.songs.find((s) => s.id === id)
        if (!still && song?.status === 'mastered' && song.masteredOn === session.day)
          await actions.saveSong({ ...song, status: 'learning', masteredOn: null })
      }
      return actions.saveGuitarSession({
        id: session.id,
        day,
        durationMin: min!,
        items,
        newSongs: newSongs.filter((s) => used.has(s.id)),
        flowRating: flow,
        desireRating: desire,
      })
    }, 'guitar', session.id)

  return (
    <>
      <Common domain="guitar" day={day} duration={duration} flow={flow} desire={desire} today={today} onDay={setDay} onDuration={setDuration} onFlow={setFlow} onDesire={setDesire} />
      <StepContent
        entries={entries}
        songs={songs}
        sessions={data.guitarSessions.filter((s) => s.id !== session.id)}
        planned={dailyPlan(data, today).map((e) => e.id)}
        challenges={data.challenges.filter((c) => c.domain === 'guitar' && c.status === 'active')}
        onEntries={setEntries}
        onCreateSong={(title) => {
          const song: Song = { id: crypto.randomUUID(), title, status: 'learning', masteredOn: null }
          setNewSongs([...newSongs, song])
          setEntries([...entries, { kind: 'song', songId: song.id, mastered: false }])
        }}
      />
      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      <Button tone="guitar" disabled={min === null || saving} onClick={save}>
        Enregistrer la correction
      </Button>
      <DeleteButton
        domain="guitar"
        disabled={saving}
        onDelete={() =>
          run(async () => {
            // Les morceaux passés en « maîtrisé » par ce log redeviennent « en cours ».
            for (const id of masteredHere) {
              const song = data.songs.find((s) => s.id === id)
              if (song?.status === 'mastered' && song.masteredOn === session.day) await actions.saveSong({ ...song, status: 'learning', masteredOn: null })
            }
            await actions.deleteLog('guitar', session.id)
            return null
          }, 'guitar', session.id)
        }
      />
    </>
  )
}

function EditSport({ session }: { session: SportSession }) {
  const { data, today } = useAppData()
  const actions = useActions()
  const { saving, error, run } = useSave()
  const [day, setDay] = useState(session.day)
  const [duration, setDuration] = useState(String(session.durationMin))
  const [flow, setFlow] = useState(session.flowRating)
  const [desire, setDesire] = useState(session.desireRating)
  const [sets, setSets] = useState<SportSet[]>(session.sets)
  const min = validDuration(duration)

  const names = new Map(data.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
  const program = data.programs.find((p) => p.id === session.programId)
  const groups = [...new Set(sets.map((s) => s.programExerciseId))]
  const update = (i: number, patch: Partial<SportSet>) => setSets(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const valid = sets.every((s) => Number.isFinite(s.weightKg) && s.weightKg >= 0 && Number.isInteger(s.reps) && s.reps >= 1)

  return (
    <>
      <p className="t-subhead -mt-2 text-muted">Séance {program?.name ?? 'inconnue'}</p>
      <Common domain="sport" day={day} duration={duration} flow={flow} desire={desire} today={today} onDay={setDay} onDuration={setDuration} onFlow={setFlow} onDesire={setDesire} />
      {groups.length === 0 && <p className="t-subhead text-muted">Aucune série enregistrée.</p>}
      {groups.map((pe) => {
        const name = names.get(pe) ?? 'Exo inconnu'
        return (
          <section key={pe} className="flex flex-col">
            <h2 className="t-footnote px-4 pb-1.5 text-muted uppercase">{name}</h2>
            <div className="rows overflow-hidden rounded-md bg-surface">
            {sets.map((s, i) =>
              s.programExerciseId !== pe ? null : (
                <div key={i} className="flex min-h-11 items-center gap-2 px-4 py-1.5">
                  <span className="t-body w-16 text-muted">Série {s.setIndex}</span>
                  <WeightInput
                    aria-label={`Charge · ${name} · série ${s.setIndex}`}
                    value={s.weightKg}
                    onChange={(kg) => update(i, { weightKg: kg })}
                    className={`${input} t-body ml-auto min-h-11 w-20 text-right`}
                  />
                  <span className="t-subhead text-muted">kg ×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label={`Reps · ${name} · série ${s.setIndex}`}
                    value={s.reps}
                    onChange={(e) => update(i, { reps: Number(e.target.value) })}
                    className={`${input} t-body min-h-11 w-14 text-right`}
                  />
                  <button
                    type="button"
                    aria-label={`Retirer ${name} série ${s.setIndex}`}
                    className="hit tap py-1 pl-1"
                    onClick={() => setSets(renumber(sets.filter((_, j) => j !== i)))}
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                      <circle cx="11" cy="11" r="10" className="fill-danger" />
                      <path d="M6.5 11h9" className="stroke-on-danger" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ),
            )}
            </div>
          </section>
        )
      })}
      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      <Button
        tone="sport"
        disabled={min === null || !valid || saving}
        onClick={() =>
          run(
            () =>
              actions.saveSportSession({
                id: session.id,
                day,
                programId: session.programId,
                durationMin: min!,
                sets,
                flowRating: flow,
                desireRating: desire,
              }),
            'sport',
            session.id,
          )
        }
      >
        Enregistrer la correction
      </Button>
      <DeleteButton
        domain="sport"
        disabled={saving}
        onDelete={() =>
          run(async () => {
            await actions.deleteLog('sport', session.id)
            return null
          }, 'sport', session.id)
        }
      />
    </>
  )
}

/** Corriger (ou supprimer) le dernier log enregistré. */
export function EditLogPage() {
  const { loading } = useAppData()
  const { id } = useParams()
  // La cible est figée au montage : on attend les données (ouverture directe de l'URL, relance de l'appli).
  if (loading) return <p className="t-subhead pt-16 text-center text-muted">Chargement…</p>
  return <EditLog key={id} id={id} />
}

function EditLog({ id }: { id: string | undefined }) {
  const { data } = useAppData()
  const navigate = useNavigate()
  // Figé à l'ouverture : la cible ne change pas pendant qu'on la modifie.
  const [target] = useState<LastLog | null>(() => {
    if (!id) return lastLog(data)
    const guitar = data.guitarSessions.find((s) => s.id === id)
    if (guitar) return { kind: 'guitar', session: guitar }
    const sport = data.sportSessions.find((s) => s.id === id)
    return sport ? { kind: 'sport', session: sport } : null
  })

  if (!target)
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <p>Aucun log à corriger.</p>
        <Link to="/" className="hit tap t-body self-center text-accent">
          Retour
        </Link>
      </div>
    )

  const what =
    target.kind === 'guitar'
      ? `Guitare · ${target.session.items
          .flatMap((it) => (it.kind === 'exercise' ? [getExercise(it.exerciseId)?.title ?? 'Exo inconnu'] : []))
          .slice(0, 2)
          .join(', ') || 'session'}`
      : 'Sport'

  return (
    <div className="flex flex-col gap-5 pb-4">
      <ModalBar tone={target.kind} onCancel={() => navigate(-1)} cancelAria="Fermer" />
      <h1 className="t-title1 -mt-2">{id ? 'Corriger ce log' : 'Corriger le dernier log'}</h1>
      <p className="t-subhead -mt-3 text-muted">
        <Icon name={target.kind} className={`mr-1 ${TONE.text[target.kind]}`} />
        {what} · {longDate(target.session.day)} · {target.session.xp} XP
      </p>
      {target.kind === 'guitar' ? <EditGuitar session={target.session} /> : <EditSport session={target.session} />}
    </div>
  )
}
