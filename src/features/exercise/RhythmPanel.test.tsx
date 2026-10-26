import { act, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { Listener } from './listen'
import { RhythmPanel } from './RhythmPanel'

const fake = (ready: Promise<void> = Promise.resolve()): Listener => ({ ready, onOnset: null, stop: vi.fn() })
const play = (l: Listener, every: number, from = 1, n = 9) =>
  act(() => {
    for (let i = 0; i < n; i++) l.onOnset!(from + i * every)
  })

describe('lecture du rythme', () => {
  test('dans le temps : tempo joué, statut, stabilité, régularité', async () => {
    const l = fake()
    render(<RhythmPanel bpm={100} listener={l} />)
    expect(await screen.findByRole('status')).toHaveTextContent('Joue, j’écoute…')
    play(l, 0.6)
    expect(screen.getByRole('status')).toHaveTextContent('Dans le temps')
    expect(screen.getByLabelText('100 bpm joués')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Stabilité 4 sur 4' })).toBeInTheDocument()
    expect(screen.getByText('100 %')).toBeInTheDocument()
  })

  test('trop vite : « Tu presses » ; la régularité baisse', async () => {
    const l = fake()
    render(<RhythmPanel bpm={100} listener={l} />)
    await screen.findByText('Joue, j’écoute…')
    play(l, 0.6)
    play(l, 60 / 115, 7)
    expect(screen.getByRole('status')).toHaveTextContent('Tu presses')
    expect(screen.queryByText('100 %')).not.toBeInTheDocument()
  })

  test('micro bloqué : message précis selon l’erreur', async () => {
    render(<RhythmPanel bpm={100} listener={fake(Promise.reject(new DOMException('non', 'NotAllowedError')))} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Le micro est bloqué pour MOTIV')
  })

  test('autre panne du micro : son nom, et le métronome continue', async () => {
    render(<RhythmPanel bpm={100} listener={fake(Promise.reject(new DOMException('x', 'AbortError')))} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Le micro ne démarre pas (AbortError). Le métronome marche quand même.')
  })

  test('navigateur sans micro : le dit, sans planter', () => {
    render(<RhythmPanel bpm={100} listener={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('Micro indisponible')
  })
})
