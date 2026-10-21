import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../design/icons'
import { RACE_LABELS } from '../../domain/marathon/profile'
import { Group, Row, SectionHeader } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { TileRow } from '../../ui/Tile'
import { LevelSheet } from '../levels/LevelSheet'
import { useLevels } from '../levels/useLevels'
import { dayLabel } from '../marathon/format'
import { useMarathon } from '../marathon/useMarathon'
import { CycleHero } from './CycleHero'

/**
 * Moi : le long terme (REFONTE §7). Le niveau en pastille, le cycle de 6 semaines et ses objectifs phares,
 * l'objectif daté, puis les outils : bibliothèque, profil sportif, sauvegarde et réglages.
 */
export function MePage() {
  const navigate = useNavigate()
  const mk = useMarathon()
  const [showLevels, setShowLevels] = useState(false)
  const levels = useLevels()

  return (
    <Screen
      title="Moi"
      overline="Le long terme"
      pill={
        <button
          type="button"
          aria-label={`Niveau ${levels.global.level}, voir la progression`}
          className="hit tap-scale t-footnote inline-flex h-8 items-center rounded-full bg-surface-2 px-3 font-semibold"
          onClick={() => setShowLevels(true)}
        >
          Niveau {levels.global.level}
        </button>
      }
    >
      <div className="flex flex-col gap-6 pb-4">
        <CycleHero />

        <section aria-labelledby="race-title">
          <SectionHeader
            id="race-title"
            title="Objectif daté"
            action={
              mk && (
                <Link to="/marathon" className="hit tap">
                  Voir le plan
                </Link>
              )
            }
          />
          {mk ? (
            <Link to="/marathon" className="tap-row flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sport/12 text-sport">
                <Icon name="sport" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="t-subhead truncate font-semibold">
                  {RACE_LABELS[mk.m.race.kind]} · {mk.m.race.goalSec ? 'objectif chrono' : 'objectif finir'}
                </span>
                <span className="t-footnote truncate text-muted">
                  {dayLabel(mk.m.race.day)}
                  {mk.plan && ` · plan de ${mk.plan.weeks.length} semaines`}
                </span>
              </span>
              {mk.daysLeft >= 0 && <span className="t-title2 shrink-0 tabular-nums">J-{mk.daysLeft}</span>}
            </Link>
          ) : (
            <TileRow
              tone="sport"
              title="Préparer une course"
              subtitle="Marathon ou semi : un plan à rebours depuis la date"
              onClick={() => navigate('/marathon/profil')}
            />
          )}
        </section>

        <Group header="Outils" labelledBy="tools-title">
          <Row
            icon={<Icon name="library" className="text-muted" />}
            title="Bibliothèque"
            subtitle="Exercices, morceaux, modèles de séance"
            to="/bibliotheque"
          />
          <Row
            icon={<Icon name="me" className="text-muted" />}
            title="Profil sportif et santé"
            subtitle="Taille, poids, niveau, douleurs"
            to="/marathon/profil"
          />
          <Row
            icon={<Icon name="export" className="text-muted" />}
            title="Sauvegarde et réglages"
            subtitle="Export, import, thème, version"
            to="/moi/reglages"
          />
        </Group>
      </div>

      {showLevels && <LevelSheet onClose={() => setShowLevels(false)} />}
    </Screen>
  )
}
