import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { addDays } from '../../domain/date'
import { plateauKey, plateaus, plateauTitle, suggestions } from '../../domain/plateau'
import { hiddenUntil, hideUntil } from './later'

/** Plateau (lot 5) : une carte, trois pistes pour relancer. « Plus tard » la cache une semaine. */
export function PlateauCard() {
  const { data, today } = useAppData()
  const [, refresh] = useState(0)
  const p = plateaus(data, today).find((x) => (hiddenUntil(`plateau:${plateauKey(x)}`) ?? '') <= today)
  if (!p) return null
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4.5 shadow-card" aria-labelledby="plateau-title">
      <p className={`t-overline flex items-center gap-1.5 ${TONE.text[p.domain]}`}>
        <Icon name={p.domain} />
        On relance
      </p>
      <h2 id="plateau-title" className="t-headline -mt-1">
        {plateauTitle(p)}
      </h2>
      <p className="t-subhead -mt-2 text-muted">Normal sur la durée. Trois pistes, choisis-en une :</p>
      <ul className="flex flex-col gap-2">
        {suggestions(p, data, today).map((s) => (
          <li key={s.label} className="t-subhead flex gap-2">
            <span className={TONE.text[p.domain]}>•</span>
            {s.to ? (
              <Link to={s.to} className="hit tap underline decoration-line underline-offset-4">
                {s.label}
              </Link>
            ) : (
              <span>{s.label}</span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="hit tap t-subhead self-start py-1 text-muted"
        onClick={() => {
          hideUntil(`plateau:${plateauKey(p)}`, addDays(today, 7))
          refresh((n) => n + 1)
        }}
      >
        Plus tard
      </button>
    </section>
  )
}
