import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { renderWithData } from '../../test/renderWithData'
import { StravaPage } from './StravaPage'

const CSV = [
  'Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance',
  '1,"Oct 12, 2026, 7:00:00 AM",Footing,Run,3300,10',
  '2,"Oct 13, 2026, 7:00:00 AM",Vélo,Ride,1800,12',
  '3,"Oct 14, 2026, 7:00:00 AM",Fractionné,Run,1800,6',
].join('\n')
const file = (text: string, name: string) => new File([text], name, { type: 'text/plain' })

describe('StravaPage', () => {
  test('aperçu puis ajout : les courses seulement, les autres activités comptées', async () => {
    const { actions } = renderWithData(<StravaPage />)
    await userEvent.upload(screen.getByLabelText('Fichier Strava'), file(CSV, 'activities.csv'))
    expect(await screen.findByText('2 courses à ajouter · 1 autre activité ignorée')).toBeInTheDocument()
    expect(screen.getByText('12 oct. · 10 km · 5:30 /km')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter 2 courses' }))
    expect(actions.importRuns).toHaveBeenCalledWith([expect.objectContaining({ externalId: 'strava:1' }), expect.objectContaining({ externalId: 'strava:3' })])
    expect(await screen.findByRole('status')).toHaveTextContent('2 sorties ajoutées')
  })

  test('fichier qui n’est pas un export : message, rien d’ajouté', async () => {
    const { actions } = renderWithData(<StravaPage />)
    await userEvent.upload(screen.getByLabelText('Fichier Strava'), file('nom,prénom\na,b', 'contacts.csv'))
    expect(await screen.findByRole('alert')).toHaveTextContent("Ce fichier n'est pas un export Strava")
    expect(actions.importRuns).not.toHaveBeenCalled()
  })
})
