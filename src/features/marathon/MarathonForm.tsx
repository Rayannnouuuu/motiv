import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { shortDate } from '../../domain/date'
import { CHRONO_LABELS, WEEKDAY_LABELS, type ChronoDistance, type RaceKind, type Weekday } from '../../domain/marathon/profile'
import { heightHint, latestWeight } from '../../domain/marathon/runs'
import { Button } from '../../ui/Button'
import { Group } from '../../ui/List'
import { ModalBar } from '../../ui/ModalBar'
import { Segmented } from '../../ui/Segmented'
import { Switch } from '../../ui/Switch'
import { fromForm, THRESHOLD_LABELS, toForm, type ProfileForm } from './profileForm'

const INPUT = 't-body min-h-11 w-24 rounded-sm bg-fill px-2 py-1.5 text-right tabular-nums outline-none'

/** Une ligne : libellé à gauche, champ à droite. */
function Field({ label, children, unit }: { label: string; children: ReactNode; unit?: string }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 px-4 py-1.5">
      <span className="t-body flex-1">{label}</span>
      {children}
      {unit && <span className="t-subhead w-8 text-muted">{unit}</span>}
    </label>
  )
}

/** Questionnaire de départ, modifiable à tout moment (lot 3). */
export function MarathonForm() {
  const { v1, today } = useAppData()
  const { saveMarathon, saveBodyMetric } = useActions()
  const navigate = useNavigate()
  const previous = v1.profile.marathon
  const weight = latestWeight(v1.measurements)
  const [f, setF] = useState<ProfileForm>(() => toForm(previous, today, heightHint(v1.measurements)))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setF((x) => ({ ...x, [k]: v }))
  const text = (k: keyof ProfileForm, label: string, unit?: string, mode: 'numeric' | 'decimal' = 'numeric') => (
    <Field label={label} unit={unit}>
      <input inputMode={mode} aria-label={label} value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} className={INPUT} />
    </Field>
  )

  async function save() {
    const r = fromForm(f, today, previous)
    if (!r.ok) {
      setErrors(r.errors)
      window.scrollTo?.({ top: 0 })
      return
    }
    setSaving(true)
    try {
      // Sans pesée, le poids tapé devient la pesée du jour : le poids suit ensuite tes pesées.
      if (r.weightKg !== null && !weight)
        await saveBodyMetric({ id: crypto.randomUUID(), day: today, weightKg: r.weightKg, waistCm: null, chestCm: null, armCm: null, thighCm: null })
      await saveMarathon(r.profile)
      navigate('/marathon', { replace: true })
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Enregistrement impossible'])
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-7">
      <ModalBar tone="sport" onCancel={() => navigate(-1)} title="Mon marathon" />
      <p className="t-subhead -mt-4 text-muted">Réponds à ce que tu sais : tout reste modifiable, et le plan se recalcule.</p>
      {errors.length > 0 && (
        <ul role="alert" className="t-subhead flex flex-col gap-1 rounded-md bg-danger/10 px-4 py-3 text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Group header="Course">
        <Field label="Nom">
          <input
            aria-label="Nom de la course"
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Marathon de…"
            className={`${INPUT} w-44 text-right`}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            aria-label="Date de la course"
            value={f.day}
            min={today}
            onChange={(e) => set('day', e.target.value)}
            className={`${INPUT} w-40`}
          />
        </Field>
        <div className="px-4 py-2">
          <Segmented<RaceKind>
            label="Distance"
            options={[
              { value: 'marathon', label: 'Marathon' },
              { value: 'half', label: 'Semi' },
            ]}
            value={f.kind}
            onChange={(v) => set('kind', v)}
          />
        </div>
        <div className="px-4 py-2">
          <Segmented<'finish' | 'time'>
            label="Objectif"
            options={[
              { value: 'finish', label: 'Finir' },
              { value: 'time', label: 'Un temps visé' },
            ]}
            value={f.goal}
            onChange={(v) => set('goal', v)}
          />
        </div>
        {f.goal === 'time' && (
          <div className="flex items-center justify-end gap-2 px-4 py-1.5">
            <input inputMode="numeric" aria-label="Heures" value={f.goalH} onChange={(e) => set('goalH', e.target.value)} className={`${INPUT} w-16`} />
            <span className="t-subhead text-muted">h</span>
            <input inputMode="numeric" aria-label="Minutes" value={f.goalMin} onChange={(e) => set('goalMin', e.target.value)} className={`${INPUT} w-16`} />
            <span className="t-subhead text-muted">min</span>
          </div>
        )}
        <Field label="Finir en course-marche">
          <Switch label="Finir en course-marche" checked={f.walkRun} onChange={(v) => set('walkRun', v)} />
        </Field>
      </Group>

      <Group
        header="Corps"
        footer={
          weight
            ? `Le poids suit tes pesées (dernière : ${weight.kg.toLocaleString('fr-FR')} kg, le ${shortDate(weight.day)}).`
            : 'Sans pesée, ce poids devient ta pesée du jour.'
        }
      >
        {text('height', 'Taille', 'cm')}
        {!weight && text('weight', 'Poids', 'kg', 'decimal')}
        {text('birthYear', 'Année de naissance')}
        <div className="px-4 py-2">
          <Segmented<'f' | 'm' | ''>
            label="Sexe"
            options={[
              { value: 'f', label: 'Femme' },
              { value: 'm', label: 'Homme' },
              { value: '', label: 'Non précisé' },
            ]}
            value={f.sex}
            onChange={(v) => set('sex', v)}
          />
        </div>
      </Group>

      <Group header="Niveau en course" footer="Sur les 4 dernières semaines. Un chrono récent donne tes allures ; sans chrono, elles se règlent au ressenti.">
        {text('weeklyKm', 'Km par semaine', 'km', 'decimal')}
        {text('longestKm', 'Plus longue sortie du mois', 'km', 'decimal')}
        {text('years', 'Années de pratique', 'ans', 'decimal')}
        <div className="px-4 py-2">
          <Segmented<ChronoDistance | 'none'>
            label="Chrono récent"
            options={[
              { value: 'none', label: 'Aucun' },
              ...(Object.entries(CHRONO_LABELS) as [ChronoDistance, string][]).map(([value, label]) => ({ value, label })),
            ]}
            value={f.chrono}
            onChange={(v) => set('chrono', v)}
          />
        </div>
        {f.chrono !== 'none' && (
          <>
            <div className="flex items-center justify-end gap-2 px-4 py-1.5">
              <input
                inputMode="numeric"
                aria-label="Chrono, minutes"
                value={f.chronoMin}
                onChange={(e) => set('chronoMin', e.target.value)}
                className={`${INPUT} w-16`}
              />
              <span className="t-subhead text-muted">min</span>
              <input
                inputMode="numeric"
                aria-label="Chrono, secondes"
                value={f.chronoSec}
                onChange={(e) => set('chronoSec', e.target.value)}
                className={`${INPUT} w-16`}
              />
              <span className="t-subhead text-muted">s</span>
            </div>
            <Field label="Couru le">
              <input
                type="date"
                aria-label="Date du chrono"
                value={f.chronoDay}
                max={today}
                onChange={(e) => set('chronoDay', e.target.value)}
                className={`${INPUT} w-40`}
              />
            </Field>
          </>
        )}
      </Group>

      <Group header="Contraintes" footer="3 jours au moins. La sortie longue va sur le jour choisi s'il est disponible.">
        <div className="flex justify-between gap-1 px-4 py-2.5" role="group" aria-label="Jours disponibles">
          {WEEKDAY_LABELS.map((label, d) => {
            const on = f.days.includes(d as Weekday)
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                aria-label={label}
                onClick={() => set('days', on ? f.days.filter((x) => x !== d) : [...f.days, d as Weekday])}
                className={`hit tap-scale t-subhead flex size-11 shrink-0 items-center justify-center rounded-full font-semibold ${on ? 'bg-sport text-on-sport' : 'bg-fill text-muted'}`}
              >
                {label[0]}
              </button>
            )
          })}
        </div>
        <Field label="Sortie longue le">
          <select
            aria-label="Jour de la sortie longue"
            value={f.longRunDay}
            onChange={(e) => set('longRunDay', Number(e.target.value) as Weekday)}
            className="t-body bg-transparent text-right text-sport outline-none"
          >
            {WEEKDAY_LABELS.map((label, d) => (
              <option key={label} value={d}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Accès à une salle">
          <Switch label="Accès à une salle" checked={f.gym} onChange={(v) => set('gym', v)} />
        </Field>
      </Group>

      <Group header="Santé" footer="Une douleur signalée rend la progression plus prudente.">
        <label className="flex flex-col gap-1.5 px-4 py-2.5">
          <span className="t-body">Douleurs ou blessures récentes</span>
          <textarea
            aria-label="Douleurs ou blessures récentes"
            value={f.pains}
            onChange={(e) => set('pains', e.target.value)}
            rows={2}
            placeholder="Rien à signaler"
            className="t-body resize-none rounded-sm bg-fill px-3 py-2 outline-none placeholder:text-muted"
          />
        </label>
        {text('hrMax', 'FC max (si connue)', 'bpm')}
        {text('hrRest', 'FC de repos (si connue)', 'bpm')}
      </Group>

      <details className="rounded-md bg-surface">
        <summary className="t-body cursor-pointer px-4 py-3 text-sport">Repères de faisabilité</summary>
        <div className="rows">
          {(Object.keys(THRESHOLD_LABELS) as (keyof typeof THRESHOLD_LABELS)[]).map((k) => (
            <Field key={k} label={THRESHOLD_LABELS[k]}>
              <input
                inputMode="decimal"
                aria-label={THRESHOLD_LABELS[k]}
                value={f.thresholds[k]}
                onChange={(e) => set('thresholds', { ...f.thresholds, [k]: e.target.value })}
                className={`${INPUT} w-16`}
              />
            </Field>
          ))}
        </div>
      </details>

      <Button tone="sport" disabled={saving} onClick={save}>
        Voir mon plan
      </Button>
    </div>
  )
}
