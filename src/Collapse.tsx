import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Plynulá výška (grid 0fr↔1fr). Děti se odmontují až po dokončení sbalení (výkon u tisíců karet),
 * sbalený obsah je `visibility: hidden`, takže nejde fokusovat.
 */
export function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      void ref.current?.offsetHeight // vynutí vykreslení výchozího (sbaleného) stavu před spuštěním přechodu
      setClosing(false)
      setShown(true)
      return
    }
    setShown(false)
    setClosing(true)
    const t = setTimeout(() => setClosing(false), 520)
    return () => clearTimeout(t)
  }, [open])

  return (
    <div ref={ref} id={id} className="fold" data-open={shown}>
      <div>{(open || closing) && children}</div>
    </div>
  )
}
