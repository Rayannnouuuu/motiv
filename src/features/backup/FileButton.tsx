import { useRef } from 'react'
import { Button } from '../../ui/Button'

/**
 * Choisir un fichier dans Fichiers. Pas de filtre de type : iOS grise parfois les .json.
 */
export function FileButton({ onFile, children, variant = 'secondary' }: { onFile: (f: File) => void; children: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button variant={variant} className="w-full" onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        aria-label={children}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
    </>
  )
}
