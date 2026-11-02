import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Plynulá výška; děti se odmontují po dokončení sbalení (kvůli výkonu u tisíců karet). */
export function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (open) {
      setMounted(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(r)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 360)
    return () => clearTimeout(t)
  }, [open])

  return (
    <div id={id} className="fold" data-open={shown}>
      <div>{mounted && children}</div>
    </div>
  )
}
