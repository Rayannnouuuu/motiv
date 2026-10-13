import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { canReloadAgain, RELOADED_AT_KEY, setupUpdates, shouldReloadNow, type RegisterOptions } from './updates'

describe('shouldReloadNow', () => {
  const at = (pathname: string, dialogOpen = false) => shouldReloadNow({ pathname, dialogOpen })

  test('log guitare : saisie non sauvegardée, on attend', () => {
    expect(at('/motiv/log/guitare')).toBe(false)
  })

  test('correction d’un log (avec ou sans id) : on attend', () => {
    expect(at('/motiv/log/corriger')).toBe(false)
    expect(at('/motiv/log/corriger/abc')).toBe(false)
  })

  test('écran XP : on attend', () => {
    expect(at('/motiv/xp')).toBe(false)
  })

  test('une feuille ou une boîte de dialogue ouverte : on attend', () => {
    expect(at('/motiv/', true)).toBe(false)
    expect(at('/motiv/reglages', true)).toBe(false)
  })

  test('ailleurs : on recharge ; séance sport et fiche exo (état en mémoire) : on attend', () => {
    expect(at('/motiv/')).toBe(true)
    expect(at('/motiv/progres')).toBe(true)
    expect(at('/motiv/reglages')).toBe(true)
    expect(at('/motiv/log/sport')).toBe(false) // formulaire de fin de séance en mémoire
    expect(at('/motiv/exo/abc')).toBe(false) // métronome en marche
    expect(at('/motiv/xperience')).toBe(true)
  })
})

describe('canReloadAgain', () => {
  const now = 1_800_000_000_000

  test('jamais rechargé : oui', () => {
    expect(canReloadAgain(null, now)).toBe(true)
  })

  test('rechargé il y a moins de 60 s : non', () => {
    expect(canReloadAgain(now - 1_000, now)).toBe(false)
    expect(canReloadAgain(now - 59_999, now)).toBe(false)
  })

  test('rechargé il y a 60 s ou plus : oui', () => {
    expect(canReloadAgain(now - 60_000, now)).toBe(true)
    expect(canReloadAgain(now - 3_600_000, now)).toBe(true)
  })

  test('horloge reculée : on ne bloque pas', () => {
    expect(canReloadAgain(now + 10_000, now)).toBe(true)
  })
})

describe('setupUpdates', () => {
  let visibility: DocumentVisibilityState = 'visible'
  const setVisibility = (v: DocumentVisibilityState) => {
    visibility = v
    document.dispatchEvent(new Event('visibilitychange'))
  }

  function start() {
    let opts: RegisterOptions = {}
    const reload = vi.fn()
    setupUpdates((o) => {
      opts = o
    }, reload)
    return { opts, reload }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true })
    window.history.replaceState(null, '', '/motiv/')
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    delete (document as { visibilityState?: unknown }).visibilityState
    window.history.replaceState(null, '', '/')
    sessionStorage.clear()
  })

  test('enregistre le service worker tout de suite', () => {
    const { opts } = start()
    expect(opts.immediate).toBe(true)
    expect(opts.onNeedReload).toBeTypeOf('function')
    expect(opts.onRegisteredSW).toBeTypeOf('function')
  })

  test('nouvelle version : recharge tout de suite et note l’heure', () => {
    const { opts, reload } = start()
    opts.onNeedReload!()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(RELOADED_AT_KEY)).toBe(String(Date.now()))
  })

  test('saisie en cours : attend, réessaie toutes les 2 s, puis recharge une seule fois', () => {
    window.history.replaceState(null, '', '/motiv/log/guitare')
    const { opts, reload } = start()
    opts.onNeedReload!()
    opts.onNeedReload!()
    vi.advanceTimersByTime(10_000)
    expect(reload).not.toHaveBeenCalled()
    window.history.replaceState(null, '', '/motiv/')
    vi.advanceTimersByTime(2_000)
    expect(reload).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10_000)
    setVisibility('visible')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  test('feuille ouverte : recharge au retour dans l’appli une fois fermée', () => {
    document.body.innerHTML = '<div role="dialog"></div>'
    const { opts, reload } = start()
    opts.onNeedReload!()
    expect(reload).not.toHaveBeenCalled()
    document.body.innerHTML = ''
    setVisibility('hidden')
    expect(reload).not.toHaveBeenCalled()
    setVisibility('visible')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  test('rechargé il y a moins de 60 s : attend la fin du délai', () => {
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now() - 50_000))
    const { opts, reload } = start()
    opts.onNeedReload!()
    vi.advanceTimersByTime(8_000)
    expect(reload).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  test('cherche une mise à jour toutes les heures et au retour (au plus une fois par 30 min)', () => {
    const { opts } = start()
    const update = vi.fn(async () => {})
    opts.onRegisteredSW!('/motiv/sw.js', { update } as unknown as ServiceWorkerRegistration)

    setVisibility('visible')
    expect(update).not.toHaveBeenCalled()

    vi.advanceTimersByTime(30 * 60_000)
    setVisibility('hidden')
    setVisibility('visible')
    expect(update).toHaveBeenCalledTimes(1)
    setVisibility('visible')
    expect(update).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30 * 60_000)
    expect(update).toHaveBeenCalledTimes(2)
  })

  test('pas d’enregistrement : rien à vérifier', () => {
    const { opts } = start()
    expect(() => opts.onRegisteredSW!('/motiv/sw.js', undefined)).not.toThrow()
  })
})
