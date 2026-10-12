import type { ReactNode } from 'react'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export interface WeekDay {
  day: string
  /** 0 = rien, entre 0 et 1 = partiel, 1 = fait. */
  fill: number
  content?: ReactNode
  label: string
}

/** Les 7 jours de la semaine en pastilles rondes ; aujourd'hui est cerclé. */
export function WeekStrip({ days, today, color, label }: { days: WeekDay[]; today: string; color: 'guitar' | 'sport'; label: string }) {
  const solid = color === 'guitar' ? 'bg-guitar' : 'bg-sport'
  const ring = color === 'guitar' ? 'ring-guitar' : 'ring-sport'
  const tint = color === 'guitar' ? 'bg-guitar/20' : 'bg-sport/20'
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={label}>
      {days.map((d, i) => {
        const isToday = d.day === today
        return (
          <li key={d.day} className="flex flex-col items-center gap-1.5" aria-label={`${DAY_LETTERS[i]} : ${d.label}`.replace(/ : $/, '')}>
            <span className={`t-caption font-semibold ${isToday ? 'text-ink' : 'text-muted'}`}>{DAY_LETTERS[i]}</span>
            <span
              className={`flex aspect-square w-full max-w-9 items-center justify-center rounded-full text-[0.6875rem] font-semibold tabular-nums ${
                d.fill >= 1 ? `${solid} text-white` : d.fill > 0 ? `${tint} text-ink` : 'bg-fill'
              } ${isToday ? `ring-2 ring-offset-2 ring-offset-surface ${ring}` : ''}`}
            >
              {d.content}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
