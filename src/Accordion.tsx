import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export const DURATION = 460
const EASE = 'cubic-bezier(.4,0,.2,1)'
type Phase = 'closed' | 'open' | 'opening' | 'closing'

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Jedna animace výšky mezi náhledem a plným výpisem (WAAPI, výška px) + crossfade obsahu v jednom
 * kontejneru. Žádné dvě souběžné animace, žádné měření při každém renderu: výška se změří jednou
 * na začátku přechodu. Po skončení se kontejner vrátí na `height: auto`.
 * V klidu je v DOM jen to, co je vidět (sbalená sekce = jen náhled), takže se nerenderují stovky karet.
 */
export function Accordion({ open, id, preview, children }: { open: boolean; id: string; preview: ReactNode; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const root = useRef<HTMLDivElement>(null)
  const pv = useRef<HTMLDivElement>(null)
  const full = useRef<HTMLDivElement>(null)
  const anims = useRef<Animation[]>([])
  const fromH = useRef(0)
  const first = useRef(true)

  // 1) změna `open`: zapamatuj aktuální výšku (i uprostřed animace) a přepni fázi
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    fromH.current = root.current!.getBoundingClientRect().height
    anims.current.forEach((a) => a.cancel())
    anims.current = []
    setPhase(open ? 'opening' : 'closing')
  }, [open])

  // 2) obě varianty jsou už namontované (absolutně položené) → změř a spusť animaci
  useLayoutEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') return
    const opening = phase === 'opening'
    const hp = pv.current?.offsetHeight ?? 0
    const hf = full.current?.offsetHeight ?? 0
    const el = root.current!
    const dur = reducedMotion() ? 1 : DURATION
    const opt = (extra: KeyframeAnimationOptions = {}): KeyframeAnimationOptions => ({ duration: dur, easing: EASE, fill: 'forwards', ...extra })
    const a = [
      el.animate({ height: [`${fromH.current}px`, `${opening ? hf : hp}px`] }, opt()),
      pv.current?.animate({ opacity: opening ? [1, 0] : [0, 1] }, opt({ duration: dur * 0.7, delay: opening ? 0 : dur * 0.3 })),
      full.current?.animate({ opacity: opening ? [0, 1] : [1, 0] }, opt({ duration: dur * 0.7, delay: opening ? dur * 0.3 : 0 })),
    ].filter(Boolean) as Animation[]
    anims.current = a
    a[0].finished
      .then(() => {
        setPhase(opening ? 'open' : 'closed')
      })
      .catch(() => {}) // zrušeno novým přepnutím
  }, [phase])

  // 3) po přepnutí na konečnou fázi zruš `forwards` animace (ve stejném commitu, bez záblesku)
  useLayoutEffect(() => {
    if (phase === 'open' || phase === 'closed') {
      anims.current.forEach((a) => a.cancel())
      anims.current = []
    }
  }, [phase])

  const animating = phase === 'opening' || phase === 'closing'
  const layer = animating ? 'absolute inset-x-0 top-0' : ''
  return (
    <div
      ref={root}
      id={id}
      className="relative"
      style={{ overflow: animating ? 'hidden' : undefined, willChange: animating ? 'height' : undefined, overflowAnchor: 'none' }}
    >
      {phase !== 'open' && (
        <div ref={pv} className={layer} aria-hidden={phase !== 'closed'} inert={phase !== 'closed'}>
          {preview}
        </div>
      )}
      {phase !== 'closed' && (
        <div ref={full} className={layer} inert={phase !== 'open'}>
          {children}
        </div>
      )}
    </div>
  )
}
