import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { profile } from '../../domain/marathon/fixtures'
import { generatePlan } from '../../domain/marathon/plan'
import type { MarathonProfile } from '../../domain/marathon/profile'
import { EMPTY_PROFILE } from '../../domain/model'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { TodayPage } from '../today/TodayPage'
import { WeekPage } from '../week/WeekPage'
import { beep } from '../log-sport/beep'
import { MarathonForm } from './MarathonForm'
import { MarathonPage } from './MarathonPage'
import { fromForm, toForm } from './profileForm'
import { RunPage } from './RunPage'
import { loadRun, saveRun } from './runSession'

vi.mock('../log-sport/beep')

const TODAY = '2026-10-20' // mardi, 2e jour du plan
const base = profile({ startedOn: '2026-10-19' })

function Probe() {
  const loc = useLocation()
  return (
    <p>
      at {loc.pathname} {JSON.stringify(loc.state)}
    </p>
  )
}

const render = (
  ui: React.ReactElement,
  path: string,
  route: RenderWithDataOptions['route'],
  m: MarathonProfile | undefined,
  opts: RenderWithDataOptions = {},
) =>
  renderWithData(
    <Routes>
      <Route path={path} element={ui} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today: TODAY, route, v1: m ? { profile: { ...EMPTY_PROFILE, marathon: m } } : undefined, ...opts },
  )

afterEach(() => {
  saveRun(null)
  vi.useRealTimers()
})

describe('questionnaire', () => {
  test('profil ↔ champs : taille reprise d’un « tour de taille » de 183, la course qui change fait repartir le plan', () => {
    const f = toForm(undefined, TODAY, 183)
    expect(f).toMatchObject({ height: '183', day: '2027-04-11', days: [1, 3, 5, 6], longRunDay: 6, chrono: 'none' })
    expect(fromForm({ ...f, days: [1, 3] }, TODAY, undefined)).toEqual({ ok: false, errors: ['Choisis au moins 3 jours de course par semaine.'] })
    expect(fromForm({ ...f, day: '2026-10-01' }, TODAY, undefined)).toMatchObject({ ok: false, errors: ['La date de course doit être à venir.'] })
    const kept = fromForm(toForm(base, TODAY, null), '2026-11-02', base)
    expect(kept.ok && kept.profile.startedOn).toBe('2026-10-19')
    const moved = fromForm({ ...toForm(base, TODAY, null), day: '2027-05-02' }, '2026-11-02', base)
    expect(moved.ok && moved.profile.startedOn).toBe('2026-11-02')
  })

  test('remplir et voir le plan : profil enregistré, poids tapé → pesée du jour', async () => {
    const { actions } = render(<MarathonForm />, '/marathon/profil', '/marathon/profil', undefined)
    await userEvent.type(screen.getByLabelText('Nom de la course'), 'Marathon de Paris')
    await userEvent.type(screen.getByLabelText('Poids'), '78')
    await userEvent.type(screen.getByLabelText('Km par semaine'), '35')
    await userEvent.type(screen.getByLabelText('Plus longue sortie du mois'), '16')
    await userEvent.click(screen.getByRole('button', { name: '10 km' }))
    await userEvent.type(screen.getByLabelText('Chrono, minutes'), '48')
    await userEvent.click(screen.getByRole('button', { name: 'Voir mon plan' }))
    expect(actions.saveBodyMetric).toHaveBeenCalledWith(expect.objectContaining({ day: TODAY, weightKg: 78 }))
    expect(actions.saveMarathon).toHaveBeenCalledWith(
      expect.objectContaining({
        race: { name: 'Marathon de Paris', day: '2027-04-11', kind: 'marathon', goalSec: null },
        level: { weeklyKm: 35, longestKm: 16, years: 0, chrono: { distance: '10k', sec: 2880, day: TODAY } },
        startedOn: TODAY,
      }),
    )
    expect(await screen.findByText(/^at \/marathon/)).toBeInTheDocument()
  })

  test('erreurs : affichées en haut, rien d’enregistré', async () => {
    const { actions } = render(<MarathonForm />, '/marathon/profil', '/marathon/profil', undefined)
    await userEvent.click(screen.getByRole('button', { name: 'Mardi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Jeudi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Voir mon plan' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis au moins 3 jours de course par semaine.')
    expect(actions.saveMarathon).not.toHaveBeenCalled()
  })
})

describe('plan', () => {
  test('sans profil : le questionnaire est proposé', async () => {
    render(<MarathonPage />, '/marathon', '/marathon', undefined)
    await userEvent.click(screen.getByRole('button', { name: 'Remplir le questionnaire' }))
    expect(screen.getByText(/^at \/marathon\/profil/)).toBeInTheDocument()
  })

  test('faisable : compte à rebours, semaine en cours, séance du jour, allures, renfo', () => {
    render(<MarathonPage />, '/marathon', '/marathon', base, {
      data: { bodyMetrics: [{ id: 'w', day: '2026-10-01', weightKg: 75, waistCm: null, chestCm: null, armCm: null, thighCm: null }] },
    })
    expect(screen.getByText('J-173')).toBeInTheDocument()
    expect(screen.getByText(/^Semaine 1\/25 · Base/)).toBeInTheDocument()
    const week = screen.getByRole('region', { name: 'Cette semaine' })
    expect(within(week).getByText("Aujourd'hui")).toBeInTheDocument()
    expect(within(week).getByRole('button', { name: 'Commencer : Footing facile' })).toBeInTheDocument()
    expect(within(week).getByRole('button', { name: 'Commencer : renfo coureur' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Tes allures' })).getByText('Allure marathon')).toBeInTheDocument()
    expect(screen.getByText(/la musculation sert la course/)).toBeInTheDocument()
  })

  test('délai trop court : refus argumenté, puis « viser un semi » régénère le plan', async () => {
    const short = profile({
      startedOn: '2026-10-19',
      race: { name: 'M', day: '2026-12-27', kind: 'marathon', goalSec: null },
      level: { weeklyKm: 15, longestKm: 8 },
    })
    const { actions } = render(<MarathonPage />, '/marathon', '/marathon', short)
    expect(screen.getByRole('heading', { name: 'Pas de plan pour cette date' })).toBeInTheDocument()
    expect(screen.getByText('Il manque 10 semaines : je ne génère pas de plan risqué pour tenir cette date.')).toBeInTheDocument()
    expect(screen.getByText('Course-marche : 16 semaines au minimum, il en manque 6.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Viser un semi-marathon/ }))
    expect(actions.saveMarathon).toHaveBeenCalledWith({ ...short, race: { ...short.race, kind: 'half' }, startedOn: TODAY })
  })

  test('malade cette semaine', async () => {
    const { actions } = render(<MarathonPage />, '/marathon', '/marathon', base)
    await userEvent.click(screen.getByRole('switch', { name: 'Malade cette semaine' }))
    expect(actions.setSickWeek).toHaveBeenCalledWith('2026-10-19', true)
  })

  test('Aujourd’hui : la sortie du plan après la guitare, dans « Aussi aujourd’hui », lancée d’un toucher', async () => {
    render(<TodayPage />, '/', '/', base)
    expect(within(screen.getByRole('region', { name: /Technique et répertoire/ })).getByText('Prochaine séance · Guitare')).toBeInTheDocument()
    const also = screen.getByRole('region', { name: "Aussi aujourd'hui" })
    await userEvent.click(within(also).getByRole('button', { name: /^Sport · Footing facile/ }))
    expect(screen.getByText(`at /course {"day":"${TODAY}","kind":"easy"}`)).toBeInTheDocument()
  })

  test('Semaine : J-N, la phase, le prévu jour par jour ; la sortie du jour se lance d’un toucher', async () => {
    render(<WeekPage />, '/semaine', '/semaine', base)
    const hero = screen.getByRole('region', { name: /^Base · semaine 1 sur/ })
    expect(within(hero).getByText('J-173')).toBeInTheDocument()
    expect(within(hero).getByRole('img', { name: 'Phase en cours : Base' })).toBeInTheDocument()
    const today = screen.getByRole('listitem', { current: 'date' })
    await userEvent.click(within(today).getByRole('button', { name: /^Footing facile/ }))
    expect(screen.getByText(`at /course {"day":"${TODAY}","kind":"easy"}`)).toBeInTheDocument()
  })
})

describe('séance de course', () => {
  test('footing : allure cible, chrono, fin de sortie avec distance, durée et douleur', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { actions } = render(<RunPage />, '/course', { pathname: '/course', state: { day: TODAY, kind: 'easy' } }, base)
    expect(screen.getByRole('heading', { name: 'Footing facile' })).toBeInTheDocument()
    expect(screen.getByText(/\/km/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Démarrer' }))
    expect(loadRun()).toMatchObject({ day: TODAY, kind: 'easy' })
    act(() => vi.advanceTimersByTime(35 * 60_000))
    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    const planned = generatePlan(base, null, [], TODAY).weeks[0].runs.find((r) => r.day === TODAY)!.km
    expect(screen.getByLabelText('Distance en km')).toHaveValue(String(planned).replace('.', ','))
    expect(screen.getByLabelText('Durée, minutes')).toHaveValue('35')
    await user.click(screen.getAllByRole('radio', { name: '4' })[0])
    await user.click(screen.getAllByRole('radio', { name: '4' })[1])
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(actions.saveRun).toHaveBeenCalledWith(expect.objectContaining({ day: TODAY, km: planned, durationMin: 35, pain: 0, flowRating: 4, desireRating: 4 }))
    expect(loadRun()).toBeNull()
    expect(await screen.findByText(/^at \/xp/)).toBeInTheDocument()
  })

  test('course-marche : minuteur d’intervalles, un bip à chaque bloc', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    // Débutant : 26 semaines au minimum, course le 16 mai.
    const beginner = profile({
      startedOn: '2026-10-19',
      race: { name: 'M', day: '2027-05-16', kind: 'marathon', goalSec: null },
      level: { weeklyKm: 0, longestKm: 0, years: 0, chrono: null },
      constraints: { days: [1, 3, 5], longRunDay: 5, gym: false },
    })
    render(<RunPage />, '/course', { pathname: '/course', state: { day: TODAY, kind: 'walkRun' } }, beginner)
    await user.click(screen.getByRole('button', { name: 'Démarrer' }))
    expect(screen.getByText('Marche d’échauffement')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5 * 60_000 + 1000))
    expect(screen.getByText('Course')).toBeInTheDocument()
    expect(screen.getByText('Ensuite : Marche (1:00)')).toBeInTheDocument()
    expect(beep).toHaveBeenCalledTimes(1)
  })
})
