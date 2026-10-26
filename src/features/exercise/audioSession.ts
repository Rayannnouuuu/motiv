/**
 * Mode audio d'iPhone (API absente de lib.dom). « playback » fait sonner le métronome malgré l'interrupteur
 * silencieux, mais coupe le micro ; « play-and-record » joue et écoute à la fois.
 */
export function setAudioSession(type: 'playback' | 'play-and-record' | 'auto') {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = type
  } catch {
    // non disponible
  }
}
