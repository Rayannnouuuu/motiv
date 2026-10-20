import type { ReactNode } from 'react'
import { TONE } from '../design/tone'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export interface WeekDay {
  day: string
  /** 0 = rien, entre 0 et 1 = partiel, 1 = fait. */
  fill: number
  content?: ReactNode
  label: string
  /** Jour passé sans rien : coloré à part pour le distinguer des jours à venir. */
  missed?: boolean
}

/** Les 7 jours de la semaine en pastilles rondes ; aujourd'hui est cerclé. */
export function WeekStrip({ days, today, color, label }: { days: WeekDay[]; today: string; color: 'guitar' | 'sport'; label: string }) {
  const tint = color === 'guitar' ? 'bg-guitar/20' : 'bg-sport/20'
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={label}>
      {days.map((d, i) => {
        const isToday = d.day === today
        return (
          <li key={d.day} className="flex flex-col items-center gap-1.5" aria-label={`${DAY_LETTERS[i]} : ${d.label}`.replace(/ : $/, '')}>
            <span className={`t-caption font-semibold ${isToday ? 'text-ink' : 'text-muted'}`}>{DAY_LETTERS[i]}</span>
            <span
              className={`t-caption2 flex aspect-square w-full max-w-9 items-center justify-center rounded-full font-semibold tabular-nums ${
                d.fill >= 1 ? TONE.solid[color] : d.fill > 0 ? `${tint} text-ink` : d.missed ? 'bg-danger/15' : 'bg-fill'
              } ${isToday ? `ring-2 ring-offset-2 ring-offset-surface ${TONE.ring[color]}` : ''}`}
            >
              {d.content}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
