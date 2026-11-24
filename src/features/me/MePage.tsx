import { inSpace, useSpace } from '../../app/space'
import { useState } from 'react'
import { Icon } from '../../design/icons'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { LevelSheet } from '../levels/LevelSheet'
import { useLevels } from '../levels/useLevels'
import { CycleHero } from './CycleHero'
import { Ideas } from './Ideas'

/**
 * Moi : le long terme (REFONTE §7). Le niveau en pastille, le cycle de 6 semaines et ses objectifs phares,
 * puis les outils : bibliothèque, profil sportif, sauvegarde et réglages.
 */
export function MePage() {
  const { space } = useSpace()
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

        <Ideas />

        <Group header="Outils" labelledBy="tools-title">
          {inSpace(space, 'sport') && (
            <Row icon={<Icon name="me" className="text-muted" />} title="Profil sportif et santé" subtitle="Taille, poids, niveau, douleurs" to="/moi/profil" />
          )}
          <Row
            icon={<Icon name="library" className="text-muted" />}
            title="Exercices"
            subtitle={space === 'guitar' ? 'Guitare' : space === 'sport' ? 'Sport' : 'Guitare et sport'}
            to="/moi/exercices"
          />
          {inSpace(space, 'guitar') && <Row icon={<Icon name="song" className="text-muted" />} title="Morceaux" subtitle="Ton répertoire" to="/moi/morceaux" />}
          {inSpace(space, 'sport') && (
            <Row icon={<Icon name="muscu" className="text-muted" />} title="Modèles de séance" subtitle="Ordre, séries, reps" to="/moi/modeles" />
          )}
          {inSpace(space, 'sport') && (
            <Row
              icon={<Icon name="sport" className="text-muted" />}
              title="Courses Strava"
              subtitle="Importer tes sorties depuis un fichier"
              to="/moi/strava"
            />
          )}
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
