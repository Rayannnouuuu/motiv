import { useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { longDate } from '../../domain/date'
import type { Proof } from '../../domain/model'
import { audioSubjects, comparePair, nextDue, proofsOf } from '../../domain/proofs'
import { Button } from '../../ui/Button'
import { Screen } from '../../ui/Screen'
import { useRun } from '../settings/useRun'
import { shrinkPhoto } from './media'
import { ProofList, ProofPair } from './ProofPair'
import { canRecord, MAX_RECORD_SEC, useRecorder } from './useRecorder'

const newProof = (p: Pick<Proof, 'discipline' | 'kind' | 'day' | 'mime'> & Partial<Proof>): Proof => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  ...p,
})

function Section({ title, tone, children }: { title: string; tone: 'guitar' | 'sport'; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4.5 shadow-card" aria-label={title}>
      <h2 className="t-headline flex items-center gap-2">
        <Icon name={tone === 'guitar' ? 'mic' : 'camera'} className={tone === 'guitar' ? 'text-guitar' : 'text-sport'} />
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Morceaux du répertoire et exos joués : ce à quoi un enregistrement se rattache. */
function useAudioOptions(): { id: string; label: string }[] {
  const { data, v1 } = useAppData()
  const songs = v1.songs.filter((s) => s.status !== 'to_learn').map((s) => ({ id: `song:${s.id}`, label: s.title }))
  const seen = new Set<string>()
  const exercises = [...data.guitarSessions]
    .sort((a, b) => b.day.localeCompare(a.day))
    .flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : [])))
    .filter((id) => !seen.has(id) && seen.add(id) && getExercise(id))
    .map((id) => ({ id: `exercise:${id}`, label: getExercise(id)!.title }))
  return [...songs, ...exercises]
}

function AudioSection() {
  const { v1, today } = useAppData()
  const { saveProof, deleteProof } = useActions()
  const { busy, error, run } = useRun()
  const [params] = useSearchParams()
  const proofs = v1.profile.proofs ?? []
  const options = useAudioOptions()
  const recorded = audioSubjects(proofs).filter((s) => options.some((o) => o.id === s))
  const ordered = [...recorded, ...options.map((o) => o.id).filter((id) => !recorded.includes(id))]
  const [picked, setPicked] = useState(params.get('sujet'))
  const subject = picked && ordered.includes(picked) ? picked : (ordered[0] ?? '')
  const rec = useRecorder((bytes, mime, sec) => {
    const [kind, id] = subject.split(':')
    void run(() =>
      saveProof(
        newProof({ discipline: 'guitar', kind: 'audio', day: today, mime, durationSec: sec, ...(kind === 'song' ? { songId: id } : { exerciseId: id }) }),
        bytes,
      ),
    )
  })
  const pair = comparePair(proofs, subject)
  const due = nextDue(proofs, subject)

  return (
    <Section title="À écouter" tone="guitar">
      {options.length === 0 ? (
        <p className="t-subhead text-muted">Ajoute un morceau au répertoire ou joue un exo : tu pourras t'enregistrer dessus.</p>
      ) : (
        <>
          <label className="t-subhead flex items-center justify-between gap-3">
            <span className="text-muted">Morceau ou exo</span>
            <select
              aria-label="Morceau ou exo"
              value={subject}
              disabled={rec.recording}
              onChange={(e) => setPicked(e.target.value)}
              className="tap t-callout min-h-11 max-w-[65%] min-w-0 appearance-none truncate bg-transparent text-right font-semibold text-guitar"
            >
              {ordered.map((id) => (
                <option key={id} value={id}>
                  {options.find((o) => o.id === id)!.label}
                </option>
              ))}
            </select>
          </label>
          {pair.now ? (
            <ProofPair then={pair.then} now={pair.now} days={pair.days} />
          ) : (
            <p className="t-subhead text-muted">Enregistre-toi aujourd'hui : dans 30 jours, tu compareras.</p>
          )}
          {pair.now && !pair.then && due && <p className="t-footnote text-muted">Prochaine prise conseillée le {longDate(due)}.</p>}
          {!canRecord() ? (
            <p className="t-footnote text-muted">L'enregistrement n'est pas disponible sur ce navigateur.</p>
          ) : rec.recording ? (
            <Button tone="guitar" onClick={rec.stop}>
              <Icon name="stop" />
              Arrêter · {Math.floor(rec.sec / 60)}:{String(rec.sec % 60).padStart(2, '0')}
            </Button>
          ) : (
            <Button tone="guitar" disabled={busy || !subject} onClick={() => void rec.start()}>
              <Icon name="mic" />
              Enregistrer
            </Button>
          )}
          {rec.recording && <p className="t-footnote text-muted">Arrêt automatique à {MAX_RECORD_SEC / 60} minutes.</p>}
          {(rec.error ?? error) && (
            <p role="alert" className="t-footnote text-danger">
              {rec.error ?? error}
            </p>
          )}
          <ProofList proofs={proofsOf(proofs, subject)} onDelete={(id) => void run(() => deleteProof(id))} />
        </>
      )}
    </Section>
  )
}

function PhotoSection() {
  const { v1, today } = useAppData()
  const { saveProof, deleteProof } = useActions()
  const { busy, error, run } = useRun()
  const input = useRef<HTMLInputElement>(null)
  const proofs = v1.profile.proofs ?? []
  const pair = comparePair(proofs, 'photo')
  const due = nextDue(proofs, 'photo')
  return (
    <Section title="À voir" tone="sport">
      {pair.now ? (
        <ProofPair then={pair.then} now={pair.now} days={pair.days} />
      ) : (
        <p className="t-subhead text-muted">Une photo aujourd'hui, même cadre et même lumière dans 30 jours : tu verras la différence.</p>
      )}
      {pair.now && !pair.then && due && <p className="t-footnote text-muted">Prochaine photo conseillée le {longDate(due)}.</p>}
      <Button tone="sport" disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="camera" />
        Prendre une photo
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Photo de progression"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file)
            void run(async () => {
              const { bytes, mime } = await shrinkPhoto(file)
              await saveProof(newProof({ discipline: 'sport', kind: 'photo', day: today, mime }), bytes)
            })
        }}
      />
      {error && (
        <p role="alert" className="t-footnote text-danger">
          {error}
        </p>
      )}
      <ProofList proofs={proofsOf(proofs, 'photo')} onDelete={(id) => void run(() => deleteProof(id))} />
      <p className="t-footnote text-muted">Photos et enregistrements restent sur ce téléphone.</p>
    </Section>
  )
}

/** Preuves (lot 5) : entendre et voir son progrès sur un mois, sur un seul écran. */
export function ProofsPage() {
  return (
    <Screen title="Avant / après" overline="Il y a 30 jours / aujourd'hui">
      <div className="flex flex-col gap-6">
        <AudioSection />
        <PhotoSection />
      </div>
    </Screen>
  )
}
