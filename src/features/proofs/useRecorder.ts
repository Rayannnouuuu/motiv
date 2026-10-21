import { useEffect, useRef, useState } from 'react'

/** 5 minutes au plus : un passage, pas une répétition entière. */
export const MAX_RECORD_SEC = 300

export const canRecord = () => typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia

const pickMime = () => ['audio/mp4', 'audio/webm', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

/** Enregistrement au micro : démarrer, arrêter, et le fichier arrive dans `onDone`. */
export function useRecorder(onDone: (bytes: ArrayBuffer, mime: string, sec: number) => void) {
  const [sec, setSec] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => () => rec.current?.stop(), [])
  useEffect(() => {
    if (sec === null) return
    if (sec >= MAX_RECORD_SEC) rec.current?.stop()
    const t = setTimeout(() => setSec((s) => (s === null ? null : s + 1)), 1000)
    return () => clearTimeout(t)
  }, [sec])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMime()
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      const began = Date.now()
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        rec.current = null
        setSec(null)
        const blob = new Blob(chunks, { type: r.mimeType || mime || 'audio/mp4' })
        void blob.arrayBuffer().then((bytes) => done.current(bytes, blob.type, Math.round((Date.now() - began) / 1000)))
      }
      r.start()
      rec.current = r
      setSec(0)
    } catch {
      setError('Micro refusé : autorise-le dans les réglages du téléphone (Safari › Micro), puis réessaie.')
    }
  }

  return { recording: sec !== null, sec: sec ?? 0, error, start, stop: () => rec.current?.stop() }
}
