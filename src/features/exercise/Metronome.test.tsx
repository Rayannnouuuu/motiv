import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getExercise } from '../../content/exercises'
import { icon } from '../../test/icon'
import { Metronome, type AudioContextLike } from './Metronome'

const QUARTERS = getExercise('scales-1')!.pattern
const EIGHTHS = getExercise('rhythm-9')!.pattern

/** Faux AudioContext : horloge réglable à la main, oscillateurs et gains espionnés. */
function fakeAudio() {
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(async () => {}),
    suspend: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    createOscillator: vi.fn(() => ({ frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() })),
  }
  const oscillators = () => ctx.createOscillator.mock.results.map((r) => r.value)
  const freqs = () => oscillators().map((o) => o.frequency.value)
  /** Fait avancer ensemble l'horloge audio et les timers, par pas de 25 ms. */
  const play = async (ms: number) => {
    for (let t = 0; t < ms; t += 25) {
      ctx.currentTime += 0.025
      await act(() => vi.advanceTimersByTimeAsync(25))
    }
  }
  return { ctx, oscillators, freqs, play, create: () => ctx as unknown as AudioContextLike }
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

const setup = () => userEvent.setup()
const tempo = () => screen.getByText('bpm').previousElementSibling

test('lancer programme des oscillateurs, le premier à 1600 Hz, dans le geste', async () => {
  const audio = fakeAudio()
  const onPlayed = vi.fn()
  const user = setup()
  render(<Metronome pattern={EIGHTHS} best={120} startBpm={112} targetBpm={160} challengeBpm={null} onPlayed={onPlayed} createContext={audio.create} />)
  expect(audio.ctx.createOscillator).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  expect(audio.freqs()).toEqual([1600])
  expect(audio.oscillators()[0].start).toHaveBeenCalledWith(0.05)
  expect(audio.oscillators()[0].stop).toHaveBeenCalledWith(expect.closeTo(0.1))
  expect(audio.ctx.createGain).toHaveBeenCalledTimes(1)
  expect(onPlayed).toHaveBeenCalledWith(120)
  expect(screen.getByRole('button', { name: 'Arrêter le métronome' })).toBeInTheDocument()

  // 120 bpm en croches : un clic tous les 0,25 s, accent sur le 1, temps, subdivisions.
  await audio.play(1000)
  expect(audio.freqs()).toEqual([1600, 700, 1000, 700, 1000])
})

test('« Tempo + » fait passer de 46 à 48, « Tempo − » redescend', async () => {
  const user = setup()
  render(<Metronome pattern={QUARTERS} best={null} startBpm={46} targetBpm={66} challengeBpm={null} createContext={fakeAudio().create} />)
  expect(tempo()).toHaveTextContent('46')
  await user.click(screen.getByRole('button', { name: 'Tempo +' }))
  expect(tempo()).toHaveTextContent('48')
  await user.click(screen.getByRole('button', { name: 'Tempo −' }))
  await user.click(screen.getByRole('button', { name: 'Tempo −' }))
  expect(tempo()).toHaveTextContent('44')
})

test('pastilles de raccourci : record, cible, défi', async () => {
  const user = setup()
  render(<Metronome pattern={QUARTERS} best={50} startBpm={46} targetBpm={66} challengeBpm={58} createContext={fakeAudio().create} />)
  expect(tempo()).toHaveTextContent('50')
  expect(screen.getByRole('button', { name: 'Record 50' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Cible 66' }))
  expect(tempo()).toHaveTextContent('66')
  expect(screen.getByRole('button', { name: 'Cible 66' })).toHaveAttribute('aria-pressed', 'true')
  const challenge = screen.getByRole('button', { name: 'Défi 58' })
  expect(icon(challenge, 'target')).toBeInTheDocument()
  await user.click(challenge)
  expect(tempo()).toHaveTextContent('58')
  expect(challenge).toHaveAttribute('aria-pressed', 'true')
})

test('sans record ni défi : seule la pastille cible', () => {
  render(<Metronome pattern={QUARTERS} best={null} startBpm={46} targetBpm={66} challengeBpm={null} createContext={fakeAudio().create} />)
  expect(screen.queryByRole('button', { name: /Record/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Défi/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cible 66' })).toBeInTheDocument()
})

test('arrêter : plus aucun nouvel oscillateur', async () => {
  const audio = fakeAudio()
  const user = setup()
  render(<Metronome pattern={QUARTERS} best={120} startBpm={112} targetBpm={160} challengeBpm={null} createContext={audio.create} />)
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await audio.play(1000)
  const count = audio.ctx.createOscillator.mock.calls.length
  expect(count).toBeGreaterThan(1)

  await user.click(screen.getByRole('button', { name: 'Arrêter le métronome' }))
  expect(audio.ctx.suspend).toHaveBeenCalled()
  await audio.play(2000)
  expect(audio.ctx.createOscillator).toHaveBeenCalledTimes(count)
  expect(screen.getByRole('button', { name: 'Lancer le métronome' })).toBeInTheDocument()

  // Relancer réveille le même contexte.
  audio.ctx.state = 'suspended'
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  expect(audio.ctx.resume).toHaveBeenCalled()
  expect(audio.ctx.createOscillator).toHaveBeenCalledTimes(count + 1)
})

test('démontage : l’interval est nettoyé et le contexte fermé', async () => {
  const audio = fakeAudio()
  const user = setup()
  const { unmount } = render(<Metronome pattern={QUARTERS} best={120} startBpm={112} targetBpm={160} challengeBpm={null} createContext={audio.create} />)
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await audio.play(300)
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  const count = audio.ctx.createOscillator.mock.calls.length

  unmount()
  expect(vi.getTimerCount()).toBe(0)
  expect(audio.ctx.close).toHaveBeenCalled()
  await audio.play(1000)
  expect(audio.ctx.createOscillator).toHaveBeenCalledTimes(count)
})

test('page en arrière-plan : le métronome s’arrête', async () => {
  const audio = fakeAudio()
  const user = setup()
  render(<Metronome pattern={QUARTERS} best={120} startBpm={112} targetBpm={160} challengeBpm={null} createContext={audio.create} />)
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  hidden.mockRestore()
  expect(screen.getByRole('button', { name: 'Lancer le métronome' })).toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
})

test('onPlayed : au lancement et à chaque changement de tempo pendant la lecture', async () => {
  const onPlayed = vi.fn()
  const user = setup()
  render(<Metronome pattern={QUARTERS} best={80} startBpm={70} targetBpm={100} challengeBpm={null} onPlayed={onPlayed} createContext={fakeAudio().create} />)
  await user.click(screen.getByRole('button', { name: 'Tempo +' }))
  expect(onPlayed).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await user.click(screen.getByRole('button', { name: 'Tempo +' }))
  await user.click(screen.getByRole('button', { name: 'Cible 100' }))
  expect(onPlayed.mock.calls).toEqual([[82], [84], [100]])
})

test('subdivision : croches par défaut, noires au choix, absente sur un motif en noires', async () => {
  const audio = fakeAudio()
  const user = setup()
  const { unmount } = render(<Metronome pattern={EIGHTHS} best={120} startBpm={112} targetBpm={160} challengeBpm={null} createContext={audio.create} />)
  expect(screen.getByRole('button', { name: 'Croches' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Noires' }))
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await audio.play(2000)
  // 120 bpm en noires : un clic par 0,5 s, plus de subdivision à 700 Hz.
  expect(audio.freqs()).toEqual([1600, 1000, 1000, 1000, 1600])
  unmount()

  render(<Metronome pattern={QUARTERS} best={null} startBpm={46} targetBpm={66} challengeBpm={null} createContext={fakeAudio().create} />)
  expect(screen.queryByRole('group', { name: 'Subdivision' })).not.toBeInTheDocument()
})

test('mode silencieux de l’iPhone : session audio « playback » pendant la lecture', async () => {
  const session = { type: 'auto' }
  Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true })
  try {
    const user = setup()
    render(<Metronome pattern={QUARTERS} best={null} startBpm={46} targetBpm={66} challengeBpm={null} createContext={fakeAudio().create} />)
    expect(screen.getByText('Le métronome sonne même en mode silencieux.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
    expect(session.type).toBe('playback')
    await user.click(screen.getByRole('button', { name: 'Arrêter le métronome' }))
    expect(session.type).toBe('auto')
  } finally {
    Reflect.deleteProperty(navigator, 'audioSession')
  }
})

test('les points de temps s’allument quand le clic sonne', async () => {
  const audio = fakeAudio()
  const user = setup()
  const { container } = render(<Metronome pattern={QUARTERS} best={60} startBpm={70} targetBpm={100} challengeBpm={null} createContext={audio.create} />)
  const dots = () =>
    [...container.querySelectorAll('[aria-hidden] > span')].map((d) =>
      d.className.includes('bg-fill-strong') ? '·' : d.className.includes('bg-ink') ? 'F' : 'G',
    )
  expect(dots()).toEqual(['·', '·', '·', '·'])
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await audio.play(100)
  expect(dots()).toEqual(['F', '·', '·', '·'])
  await audio.play(1000)
  expect(dots()).toEqual(['·', 'G', '·', '·'])
  await user.click(screen.getByRole('button', { name: 'Arrêter le métronome' }))
  expect(dots()).toEqual(['·', '·', '·', '·'])
})

test('navigateur sans audio web : le bouton ne plante pas', async () => {
  const user = setup()
  render(<Metronome pattern={QUARTERS} best={null} startBpm={46} targetBpm={66} challengeBpm={null} />)
  await user.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  expect(screen.getByRole('button', { name: 'Lancer le métronome' })).toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
})
