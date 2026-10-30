import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { Stepper } from './Stepper'

afterEach(() => vi.useRealTimers())

test('un toucher fait un pas', async () => {
  const onPlus = vi.fn()
  render(
    <Stepper label="Charge" tone="sport" onMinus={() => {}} onPlus={onPlus}>
      60
    </Stepper>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Charge +' }))
  expect(onPlus).toHaveBeenCalledTimes(1)
})

test("l'appui long répète, sans pas de plus au relâchement", () => {
  vi.useFakeTimers()
  const onPlus = vi.fn()
  render(
    <Stepper label="Charge" tone="sport" onMinus={() => {}} onPlus={onPlus}>
      60
    </Stepper>,
  )
  const plus = screen.getByRole('button', { name: 'Charge +' })
  fireEvent.pointerDown(plus)
  act(() => void vi.advanceTimersByTime(450 + 110 * 3))
  expect(onPlus).toHaveBeenCalledTimes(4)
  fireEvent.pointerUp(plus)
  fireEvent.click(plus)
  act(() => void vi.advanceTimersByTime(1000))
  expect(onPlus).toHaveBeenCalledTimes(4)
})
