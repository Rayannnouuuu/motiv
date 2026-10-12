import { useEffect } from 'react'
import { useAppData } from '../../data/AppDataContext'
import { allLevels, GLOBAL_XP_PER_LEVEL, XP_PER_LEVEL, type DomainLevel } from '../../domain/levels'
import { ProgressRing } from '../../ui/ProgressRing'

function DomainRow({ icon, label, lvl, color }: { icon: string; label: string; lvl: DomainLevel; color: 'guitar' | 'sport' }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
      <ProgressRing value={lvl.xpInLevel} max={lvl.perLevel} size={52} stroke={6} color={color}>
        <span className="text-sm font-bold tabular-nums">{lvl.level}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {icon} {label} · niveau {lvl.level}
        </p>
        <p className="text-sm text-muted tabular-nums">
          {lvl.xpInLevel} / {lvl.perLevel} XP
        </p>
        {lvl.blocked && <p className="text-sm font-semibold text-accent">Défi requis pour passer au niveau {lvl.level + 1}</p>}
        {lvl.reserve > 0 && <p className="text-xs text-muted">+{lvl.reserve} XP en réserve</p>}
      </div>
    </div>
  )
}

/** Détail des niveaux, en feuille par-dessus l'écran. */
export function LevelSheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppData()
  const levels = allLevels(data)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Progression"
        className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Progression</h2>
          <button type="button" aria-label="Fermer" className="text-xl text-muted" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 py-2">
          <ProgressRing value={levels.global.xpInLevel} max={levels.global.perLevel} size={128} stroke={12}>
            <span className="flex flex-col items-center leading-none">
              <span className="text-xs text-muted">Niveau</span>
              <span className="text-4xl font-bold tabular-nums">{levels.global.level}</span>
            </span>
          </ProgressRing>
          <p className="text-sm text-muted tabular-nums">
            {levels.global.xpInLevel} / {levels.global.perLevel} XP · encore {levels.global.perLevel - levels.global.xpInLevel} XP
          </p>
        </div>

        <DomainRow icon="🎸" label="Guitare" lvl={levels.guitar} color="guitar" />
        <DomainRow icon="🏋️" label="Sport" lvl={levels.sport} color="sport" />

        <p className="text-xs text-muted">
          Guitare : {XP_PER_LEVEL.guitar} XP par niveau · Sport : {XP_PER_LEVEL.sport} · Global : {GLOBAL_XP_PER_LEVEL} (XP des deux réunies, hors réserve).
          Chaque niveau guitare ou sport demande de réussir un défi.
        </p>
      </div>
    </div>
  )
}
