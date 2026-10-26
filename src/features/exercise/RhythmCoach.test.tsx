import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Listener } from './listen'
import { RhythmCoach } from './RhythmCoach'

const fake = (ready: Promise<void> = Promise.resolve()): Listener => ({ ready, onOnset: null, stop: vi.fn() })
const play = (l: Listener, every: number, n = 9) =>
  act(() => {
    for (let i = 0; i < n; i++) l.onOnset!(1 + i * every)
  })

describe('Vérifier mon rythme', () => {
  test('dans le temps : tempo joué, statut, stabilité, régularité', async () => {
    const l = fake()
    render(<RhythmCoach bpm={100} listener={l} onEnd={() => {}} />)
    expect(await screen.findByRole('status')).toHaveTextContent('Joue, j’écoute…')
    play(l, 0.6)
    expect(screen.getByRole('status')).toHaveTextContent('Dans le temps')
    expect(screen.getByLabelText('100 bpm joués')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Stabilité 4 sur 4' })).toBeInTheDocument()
    expect(screen.getByText('100 %')).toBeInTheDocument()
  })

  test('trop vite : « Tu presses » ; la régularité baisse', async () => {
    const l = fake()
    render(<RhythmCoach bpm={100} listener={l} onEnd={() => {}} />)
    await screen.findByText('Joue, j’écoute…')
    play(l, 0.6)
    play(l, 60 / 115)
    expect(screen.getByRole('status')).toHaveTextContent('Tu presses')
    expect(screen.queryByText('100 %')).not.toBeInTheDocument()
  })

  test('micro refusé : message ; « Terminer » referme', async () => {
    const onEnd = vi.fn()
    render(<RhythmCoach bpm={100} listener={fake(Promise.reject(new Error('non')))} onEnd={onEnd} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Autorise le micro')
    await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(onEnd).toHaveBeenCalled()
  })
})
