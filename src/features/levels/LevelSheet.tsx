import { useAppData } from '../../data/AppDataContext'
import { allLevels, GLOBAL_XP_PER_LEVEL, XP_PER_LEVEL, type DomainLevel } from '../../domain/levels'
import { ProgressRing } from '../../ui/ProgressRing'
import { Sheet } from '../../ui/Sheet'

function DomainRow({ icon, label, lvl, color }: { icon: string; label: string; lvl: DomainLevel; color: 'guitar' | 'sport' }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ProgressRing value={lvl.xpInLevel} max={lvl.perLevel} size={52} stroke={6} color={color}>
        <span className="text-sm font-bold tabular-nums">{lvl.level}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="t-headline">
          {icon} {label} · niveau {lvl.level}
        </p>
        <p className="t-subhead text-muted tabular-nums">
          {lvl.xpInLevel} / {lvl.perLevel} XP
        </p>
        {lvl.blocked && <p className="t-subhead font-semibold text-accent">Défi requis pour passer au niveau {lvl.level + 1}</p>}
        {lvl.reserve > 0 && <p className="t-footnote text-muted">+{lvl.reserve} XP en réserve</p>}
      </div>
    </div>
  )
}

/** Détail des niveaux, en feuille qu'on peut glisser vers le bas pour la fermer. */
export function LevelSheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppData()
  const levels = allLevels(data)

  return (
    <Sheet label="Progression" onClose={onClose} title={(close) => (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <span />
        <h2 className="t-headline">Progression</h2>
        <button type="button" aria-label="Fermer" className="tap justify-self-end rounded-full bg-fill p-1.5 text-muted" onClick={close}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    )}>
      {() => (
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col items-center gap-2">
            <ProgressRing value={levels.global.xpInLevel} max={levels.global.perLevel} size={136} stroke={13}>
              <span className="flex flex-col items-center leading-none">
                <span className="t-footnote text-muted">Niveau</span>
                <span className="t-large tabular-nums">{levels.global.level}</span>
              </span>
            </ProgressRing>
            <p className="t-subhead text-muted tabular-nums">
              {levels.global.xpInLevel} / {levels.global.perLevel} XP · encore {levels.global.perLevel - levels.global.xpInLevel} XP
            </p>
          </div>

          <div className="rows overflow-hidden rounded-[0.75rem] bg-surface">
            <DomainRow icon="🎸" label="Guitare" lvl={levels.guitar} color="guitar" />
            <DomainRow icon="🏋️" label="Sport" lvl={levels.sport} color="sport" />
          </div>

          <p className="t-footnote px-4 text-muted">
            Guitare : {XP_PER_LEVEL.guitar} XP par niveau · Sport : {XP_PER_LEVEL.sport} · Global : {GLOBAL_XP_PER_LEVEL} (XP des deux réunies, hors réserve).
            Chaque niveau guitare ou sport demande de réussir un défi.
          </p>
        </div>
      )}
    </Sheet>
  )
}
