import { useEffect, useState } from 'react'
import { useDb } from '../../data/AppDataContext'

/** Adresse lisible d'un fichier de preuve : undefined pendant la lecture, null s'il n'est pas sur ce téléphone. */
export function useMediaUrl(id: string, mime: string): string | null | undefined {
  const db = useDb()
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let made: string | null = null
    let live = true
    void db.media.get(id).then((row) => {
      if (!live) return
      made = row ? URL.createObjectURL(new Blob([row.bytes], { type: mime })) : null
      setUrl(made)
    })
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [db, id, mime])
  return url
}

const MAX_SIDE = 1280

/** Photo réduite (1280 px, JPEG) pour ne pas remplir le téléphone ; si le navigateur ne sait pas, le fichier tel quel. */
export async function shrinkPhoto(file: File): Promise<{ bytes: ArrayBuffer; mime: string }> {
  try {
    const img = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!blob) throw new Error('toBlob')
    return { bytes: await blob.arrayBuffer(), mime: 'image/jpeg' }
  } catch {
    return { bytes: await file.arrayBuffer(), mime: file.type || 'image/jpeg' }
  }
}
