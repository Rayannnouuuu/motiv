import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../design/icons'
import { TONE, type Tone } from '../design/tone'
import type { Domain } from '../domain/types'

/**
 * Carte héros (REFONTE §7) : la seule chose importante de l'écran, dans la couleur de son univers. Surtitre avec
 * l'icône de l'univers, un repère à droite (J-82), le titre en grand, puis le contenu.
 */
export function Hero({
  tone,
  icon,
  overline,
  aside,
  titleId,
  title,
  subtitle,
  children,
}: {
  tone: Tone
  /** Icône du surtitre : celle de l'univers par défaut. */
  icon?: IconName
  overline: ReactNode
  aside?: ReactNode
  titleId: string
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}) {
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4.5 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${TONE.tint[tone]}`}>
          <Icon name={icon ?? (tone === 'accent' ? 'check' : tone)} />
        </span>
        <span className={`t-overline flex-1 ${TONE.text[tone]}`}>{overline}</span>
        {aside && <span className="t-title2 tabular-nums">{aside}</span>}
      </div>
      <div>
        <h2 id={titleId} className="t-title1">
          {title}
        </h2>
        {subtitle && <p className="t-subhead mt-1 text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export interface Step {
  title: string
  detail?: string
  /** Repère à droite (durée, niveau). */
  meta?: string
  to?: string
  state?: object
  done?: boolean
  /** Bloc de la séance (« Course », « Muscu · Push ») : un intertitre quand il change. */
  group?: string
}

/** Les étapes d'une séance, numérotées, dans un bloc posé dans la carte ; une étape peut ouvrir sa fiche. */
export function StepList({ tone, steps, label }: { tone: Domain; steps: Step[]; label: string }) {
  return (
    <ol aria-label={label} className="rows overflow-hidden rounded-lg bg-inset">
      {steps.map((s, i) => {
        const body = (
          <>
            <span
              aria-hidden
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[0.75rem] font-bold ${s.done ? `${TONE.solid[tone]} border-transparent` : `border-current ${TONE.text[tone]}`}`}
            >
              {s.done ? <Icon name="check" size="1.1em" /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`t-subhead truncate font-semibold ${s.done ? 'text-muted' : ''}`}>{s.title}</span>
              {s.detail && <span className="t-footnote truncate text-muted tabular-nums">{s.detail}</span>}
            </span>
            {s.meta && <span className="t-footnote shrink-0 font-semibold text-muted tabular-nums">{s.meta}</span>}
          </>
        )
        const row = 'flex min-h-12 items-center gap-3 px-3 py-1.5'
        const header = s.group && s.group !== steps[i - 1]?.group
        return (
          <li key={`${i}-${s.title}`}>
            {header && <p className={`t-overline px-3 pt-2.5 pb-0.5 ${TONE.text[tone]}`}>{s.group}</p>}
            {s.to ? (
              <Link to={s.to} state={s.state} className={`tap-row ${row}`}>
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
