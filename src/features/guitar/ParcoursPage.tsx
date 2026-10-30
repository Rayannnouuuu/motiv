import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getChord, type Skill } from '../../content/guitar'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { EMPTY_PROGRESS, recordAttempt, sessionsNeeded, type GuitarProgress } from '../../domain/guitar/engine'
import { blockSummaries, currentStep, knownUpTo, openStep, syncPath, trackDone, trackSteps } from '../../domain/guitar/tracks'
import { Button } from '../../ui/Button'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { Gauge } from '../../ui/Gauge'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Sheet } from '../../ui/Sheet'
import { useRun } from '../settings/useRun'
import { Measure, type RawAttempt } from './Measure'

const Diagrams = ({ skill }: { skill: Skill }) => {
  const chords = (skill.chordIds ?? []).flatMap((id) => getChord(id) ?? [])
  if (chords.length === 0) return null
  return (
    <div className={`-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 ${chords.length <= 2 ? 'justify-center' : ''}`} aria-label="Accords de l’étape">
      {chords.map((c) => (
        <ChordDiagram key={c.id} chord={c} size={chords.length > 2 ? 'sm' : 'md'} />
      ))}
    </div>
  )
}

/** « Fait un jour, encore N à faire » pour une étape qui demande plusieurs jours. */
function Needed({ skill, progress }: { skill: Skill; progress: GuitarProgress }) {
  const need = sessionsNeeded(skill.validation)
  if (need < 2) return null
  const days = new Set((progress.skills[skill.id]?.attempts ?? []).filter((a) => a.passed).map((a) => a.day)).size
  return (
    <p className="t-subhead text-muted">
      Réussi sur {days} jour{days > 1 ? 's' : ''} sur {need} : le test se refait un autre jour pour compter.
    </p>
  )
}

/**
 * Parcours des accords (lot 18) : les 46 accords un par un, leur transition, une boucle par bloc.
 * L'étape en cours est en haut avec sa mesure ; les suivantes sont verrouillées jusqu'à ce qu'elle soit validée.
 */
export function ParcoursPage() {
  const { v1, today } = useAppData()
  const { saveGuitarState } = useActions()
  const { busy, error, run } = useRun()
  const g = v1.profile.guitar
  const [prog, setProg] = useState<GuitarProgress>(g?.progress ?? EMPTY_PROGRESS)
  const [peek, setPeek] = useState<string | null>(null)
  const [justDone, setJustDone] = useState<string | null>(null)
  const steps = trackSteps(prog)
  const current = currentStep(prog)
  const done = trackDone(prog)
  const save = (next: GuitarProgress) => run(() => saveGuitarState({ ...g, progress: next })).then(() => setProg(next))

  const onAttempt = (a: RawAttempt) => {
    if (!current) return
    const started = openStep(prog, current.id, today)
    const next = syncPath(recordAttempt(started, current.id, a), today)
    if (next.skills[current.id]?.status === 'validated') setJustDone(current.name)
    else setJustDone(null)
    void save(next)
  }
  const peeked = steps.find((s) => s.skill.id === peek)

  const back = (
    <Link to="/" className="hit tap t-body flex items-center text-guitar">
      <Icon name="chevron" size="1.4em" className="rotate-180" />
      Aujourd’hui
    </Link>
  )

  return (
    <Screen title="Accords" overline="Parcours guitare" leading={back}>
      <div className="flex flex-col gap-6 pb-4">
        <section className="flex flex-col gap-2" aria-label="Avancement">
          <p className="t-footnote flex justify-between gap-2">
            <span className="text-muted">Étapes faites</span>
            <span className="font-semibold tabular-nums">
              {done} / {steps.length}
            </span>
          </p>
          <Gauge value={done} max={steps.length} color="guitar" label="Étapes du parcours des accords" className="h-1.5" />
        </section>

        {error && (
          <p role="alert" className="t-subhead text-danger">
            {error}
          </p>
        )}

        {justDone && (
          <p role="status" className="t-callout rounded-xl bg-guitar/12 px-4 py-3 font-semibold text-guitar">
            Validé : {justDone}
          </p>
        )}

        {current ? (
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-5 py-4.5 shadow-card" aria-labelledby="current-title">
            <div>
              <p className="t-overline text-guitar">
                {current.block} · étape {done + 1}
              </p>
              <h2 id="current-title" className="t-title2">
                {current.name}
              </h2>
            </div>
            <Diagrams skill={current} />
            <p className="t-subhead text-muted">{current.why}</p>
            <p className="t-body">{current.howTo}</p>
            {current.tips.length > 0 && (
              <ul className="t-subhead flex list-disc flex-col gap-1 pl-5 text-muted">
                {current.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            <Needed skill={current} progress={prog} />
            <Measure key={current.id} skill={current} own={prog.skills[current.id]} day={today} onAttempt={onAttempt} />
            <Button variant="ghost" tone="guitar" disabled={busy} onClick={() => setPeek(current.id)}>
              Je le sais déjà
            </Button>
          </section>
        ) : (
          <p className="t-callout rounded-xl bg-guitar/12 px-4 py-3 font-semibold text-guitar">Parcours des accords terminé : les 46 accords sont validés.</p>
        )}

        {blockSummaries(prog).map((b) => (
          <Group key={b.id} header={`${b.name} · ${b.done} / ${b.total}`} labelledBy={`block-${b.id}`}>
            {steps
              .filter((s) => s.skill.block === b.name)
              .map(({ skill, state }) => (
                <Row
                  key={skill.id}
                  title={skill.name}
                  aria-label={`${skill.name} · ${state === 'done' ? 'fait' : state === 'current' ? 'en cours' : 'verrouillé'}`}
                  detail={state === 'done' ? '✓' : state === 'current' ? 'en cours' : 'à venir'}
                  onClick={() => setPeek(skill.id)}
                />
              ))}
          </Group>
        ))}
      </div>

      {peeked && (
        <Sheet label={peeked.skill.name} onClose={() => setPeek(null)} title={() => <h2 className="t-headline truncate text-center">{peeked.skill.name}</h2>}>
          {(close) => (
            <div className="flex flex-col gap-4">
              <Diagrams skill={peeked.skill} />
              <p className="t-body">{peeked.skill.howTo}</p>
              {peeked.state === 'done' ? (
                <p className="t-subhead text-muted">Étape validée.</p>
              ) : (
                <Button
                  tone="guitar"
                  disabled={busy}
                  onClick={() => {
                    void save(knownUpTo(prog, peeked.skill.id, today))
                    close()
                  }}
                >
                  Je le sais déjà, jusqu’ici
                </Button>
              )}
              {peeked.state !== 'done' && (
                <p className="t-footnote text-muted">Valide cette étape et toutes celles d’avant. Un entretien est prévu dans 3 jours pour vérifier.</p>
              )}
            </div>
          )}
        </Sheet>
      )}
    </Screen>
  )
}
