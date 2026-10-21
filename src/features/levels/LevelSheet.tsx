import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { GLOBAL_XP_PER_LEVEL, XP_CYCLE_GOAL, XP_PER_LEVEL, XP_WEEK_GOAL, type DomainLevel } from '../../domain/levels'
import { XP_DIFFICULTY_UP, XP_LONGEST_RUN, XP_SONG_MASTERED, XP_SPORT_RECORD, XP_TEMPO_RECORD } from '../../domain/xp'
import { useLevels } from './useLevels'
import type { Domain } from '../../domain/types'
import { ProgressRing } from '../../ui/ProgressRing'
import { Sheet } from '../../ui/Sheet'

function DomainRow({ domain, label, lvl }: { domain: Domain; label: string; lvl: DomainLevel }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ProgressRing value={lvl.xpInLevel} max={lvl.perLevel} size={52} stroke={6} color={domain}>
        <span className="t-subhead font-bold tabular-nums">{lvl.level}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="t-headline flex items-center gap-1.5">
          <Icon name={domain} className={TONE.text[domain]} />
          {label} · niveau {lvl.level}
        </p>
        <p className="t-subhead text-muted tabular-nums">
          {lvl.xpInLevel} / {lvl.perLevel} XP
        </p>
      </div>
    </div>
  )
}

/** Détail des niveaux, en feuille qu'on peut glisser vers le bas pour la fermer. */
export function LevelSheet({ onClose }: { onClose: () => void }) {
  const levels = useLevels()

  return (
    <Sheet
      label="Progression"
      onClose={onClose}
      title={(close) => (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <h2 className="t-headline">Progression</h2>
          <button type="button" aria-label="Fermer" className="hit tap justify-self-end rounded-full bg-fill p-1.5 text-muted" onClick={close}>
            <Icon name="close" size="1em" />
          </button>
        </div>
      )}
    >
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

          <div className="rows overflow-hidden rounded-md bg-surface">
            <DomainRow domain="guitar" label="Guitare" lvl={levels.guitar} />
            <DomainRow domain="sport" label="Sport" lvl={levels.sport} />
          </div>

          <p className="t-footnote px-4 text-muted">
            L'XP récompense ta progression, pas le temps passé : record de tempo +{XP_TEMPO_RECORD}, difficulté en hausse +{XP_DIFFICULTY_UP}, morceau maîtrisé
            +{XP_SONG_MASTERED}, record de muscu +{XP_SPORT_RECORD}, plus longue sortie +{XP_LONGEST_RUN}, objectif de la semaine tenu +{XP_WEEK_GOAL} par
            discipline, objectif de cycle atteint +{XP_CYCLE_GOAL}. L'XP déjà gagnée reste acquise. Guitare et sport : {XP_PER_LEVEL.guitar} XP par niveau ;
            global : {GLOBAL_XP_PER_LEVEL} (les deux réunies).
          </p>
        </div>
      )}
    </Sheet>
  )
}
