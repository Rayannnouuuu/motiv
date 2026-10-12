import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useParisDay } from './useParisDay'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('à minuit, le jour passe au suivant', () => {
  vi.setSystemTime(new Date('2026-10-12T21:59:30Z')) // 23:59:30 à Paris
  const { result } = renderHook(() => useParisDay())
  expect(result.current).toBe('2026-10-12')
  act(() => vi.advanceTimersByTime(29_000))
  expect(result.current).toBe('2026-10-12')
  act(() => vi.advanceTimersByTime(2_000))
  expect(result.current).toBe('2026-10-13')
})

test('le minuteur est réarmé : le jour suivant passe aussi', () => {
  vi.setSystemTime(new Date('2026-10-12T21:59:30Z'))
  const { result } = renderHook(() => useParisDay())
  act(() => vi.advanceTimersByTime(31_000))
  expect(result.current).toBe('2026-10-13')
  act(() => vi.advanceTimersByTime(86_400_000))
  expect(result.current).toBe('2026-10-14')
})

test('retour au premier plan : nouveau jour sans attendre le minuteur', () => {
  vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
  const { result } = renderHook(() => useParisDay())
  expect(result.current).toBe('2026-10-12')
  // L'appli est restée en mémoire toute la nuit : l'heure a avancé sans que le minuteur tourne.
  vi.setSystemTime(new Date('2026-10-13T06:00:00Z'))
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current).toBe('2026-10-13')
})

test('pageshow et focus revérifient aussi le jour', () => {
  vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
  const { result } = renderHook(() => useParisDay())
  vi.setSystemTime(new Date('2026-10-13T06:00:00Z'))
  act(() => {
    window.dispatchEvent(new Event('pageshow'))
  })
  expect(result.current).toBe('2026-10-13')
  vi.setSystemTime(new Date('2026-10-14T06:00:00Z'))
  act(() => {
    window.dispatchEvent(new Event('focus'))
  })
  expect(result.current).toBe('2026-10-14')
})

test('page cachée : pas de vérification', () => {
  vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
  const { result } = renderHook(() => useParisDay())
  vi.setSystemTime(new Date('2026-10-13T06:00:00Z'))
  const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current).toBe('2026-10-12')
  spy.mockRestore()
})

test('démontage : minuteur et écouteurs retirés', () => {
  vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
  const removeDoc = vi.spyOn(document, 'removeEventListener')
  const removeWin = vi.spyOn(window, 'removeEventListener')
  const { unmount } = renderHook(() => useParisDay())
  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  expect(removeDoc).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  expect(removeWin).toHaveBeenCalledWith('pageshow', expect.any(Function))
  expect(removeWin).toHaveBeenCalledWith('focus', expect.any(Function))
  removeDoc.mockRestore()
  removeWin.mockRestore()
})
