import type { ReactNode } from 'react'
import { Icon, type IconName } from '../design/icons'
import { TONE } from '../design/tone'
import type { Domain } from '../domain/types'
import { Gauge } from './Gauge'
import { RowChevron } from './List'

const UNIVERSE: Record<Domain, string> = { guitar: 'Guitare', sport: 'Sport' }

/** Tuile d'objectif : l'univers, le compte en grand (« 1 /5 séances »), la jauge, un repère dessous. */
export function GoalTile({ tone, done, goal, unit, children }: { tone: Domain; done: number; goal: number; unit: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 shadow-card">
      <p className="t-footnote flex items-center gap-1.5 font-semibold">
        <Icon name={tone} className={TONE.text[tone]} />
        {UNIVERSE[tone]}
      </p>
      <p className="t-title1 tabular-nums">
        {done}
        <span className="text-[0.64em] text-muted">
          {' '}
          /{goal} {unit}
        </span>
      </p>
      <Gauge value={done} max={goal} color={tone} label={`${UNIVERSE[tone]} : ${done} sur ${goal} ${unit}`} className="h-1" />
      {children && <div className="t-footnote text-muted">{children}</div>}
    </div>
  )
}

/** Ligne-carte d'une liste (Aussi aujourd'hui, outils) : icône teintée de l'univers, titre, détail, chevron. */
export function TileRow({ tone, icon, title, subtitle, onClick }: { tone: Domain; icon?: IconName; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-row flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left shadow-card"
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${TONE.tint[tone]}`}>
        <Icon name={icon ?? tone} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="t-subhead truncate font-semibold">{title}</span>
        {subtitle && <span className="t-footnote truncate text-muted">{subtitle}</span>}
      </span>
      <RowChevron />
    </button>
  )
}
