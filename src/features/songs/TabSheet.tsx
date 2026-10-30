import { useState } from 'react'
import type { Song } from '../../domain/model'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'

/** Une tablature que tu as collée est limitée en taille : le stockage de l'appareil n'est pas un coffre sans fond. */
export const TAB_MAX = 20000

const FIELD =
  'resize-none rounded-md border border-line bg-surface px-4 py-3 font-mono text-[0.8125rem] leading-6 whitespace-pre outline-none placeholder:text-muted'

/**
 * Ta tablature d'un morceau. L'appli n'en fournit aucune : tu colles la tienne (relevé personnel, fichier texte,
 * site que tu as le droit d'utiliser). Elle reste sur l'appareil et part dans la sauvegarde.
 */
export function TabSheet({ song, onSave, onClose }: { song: Song; onSave: (tab: string) => void; onClose: () => void }) {
  const [text, setText] = useState(song.tab ?? '')
  const [editing, setEditing] = useState(!song.tab)
  const [confirmErase, setConfirmErase] = useState(false)

  return (
    <Sheet label={`Tablature · ${song.title}`} onClose={onClose} title={() => <h2 className="t-headline truncate text-center">Tablature · {song.title}</h2>}>
      {(close) =>
        editing ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="t-subhead text-muted">Colle ou tape ta tablature (police à chasse fixe, les colonnes restent alignées).</span>
              <textarea
                aria-label="Tablature"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={TAB_MAX}
                rows={12}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                placeholder={'e|-----------|\nB|-----------|\nG|-----------|\nD|-----------|\nA|-----------|\nE|-----------|'}
                className={`${FIELD} overflow-x-auto`}
              />
            </label>
            <Button
              tone="guitar"
              onClick={() => {
                onSave(text)
                close()
              }}
            >
              Enregistrer
            </Button>
            {song.tab && (
              <Button
                variant="secondary"
                onClick={() => {
                  setText(song.tab ?? '')
                  setEditing(false)
                }}
              >
                Annuler
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <pre aria-label="Ta tablature" className="overflow-x-auto rounded-md bg-inset px-4 py-3 font-mono text-[0.9375rem] leading-7 whitespace-pre">
              {song.tab}
            </pre>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Modifier
            </Button>
            {confirmErase ? (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setConfirmErase(false)}>
                  Non, la garder
                </Button>
                <Button
                  tone="danger"
                  onClick={() => {
                    onSave('')
                    close()
                  }}
                >
                  Effacer
                </Button>
              </div>
            ) : (
              <button type="button" className="hit tap t-subhead min-h-11 self-center text-danger" onClick={() => setConfirmErase(true)}>
                Effacer ma tablature
              </button>
            )}
          </div>
        )
      }
    </Sheet>
  )
}
