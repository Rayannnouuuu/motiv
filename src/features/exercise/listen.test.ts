import { afterEach, describe, expect, test, vi } from 'vitest'
import { micError, startListening } from './listen'

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'audioSession')
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('écoute du micro', () => {
  test('iPhone : passe en « play-and-record » avant de demander le micro, revient à « playback » à l’arrêt', async () => {
    const session = { type: 'playback' }
    let typeAtRequest = ''
    Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          typeAtRequest = session.type
          throw new DOMException('non', 'NotAllowedError')
        }),
      },
    })
    vi.stubGlobal(
      'AudioContext',
      class {
        resume = async () => {}
        close = async () => {}
      },
    )
    const l = startListening()
    await expect(l.ready).rejects.toThrow()
    expect(typeAtRequest).toBe('play-and-record')
    l.stop()
    expect(session.type).toBe('playback')
  })

  test('messages : refusé, absent, occupé, autre', () => {
    expect(micError(new DOMException('', 'NotAllowedError'))).toMatch(/^Le micro est bloqué pour MOTIV/)
    expect(micError(new DOMException('', 'NotFoundError'))).toBe('Aucun micro trouvé sur cet appareil.')
    expect(micError(new DOMException('', 'NotReadableError'))).toMatch(/déjà utilisé/)
    expect(micError(new TypeError('x'))).toBe('Le micro ne démarre pas (TypeError). Le métronome marche quand même.')
  })
})
