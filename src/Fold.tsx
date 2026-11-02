import type { ReactNode } from 'react'

/**
 * Sbalitelná oblast čistě v CSS: `grid-template-rows` 0fr↔1fr + opacity na vnitřním obalu.
 * Obsah zůstává stále namontovaný (žádný remount ani opětovné načítání obrázků), sbalený je
 * `visibility: hidden` + `inert`, takže nejde fokusovat.
 */
export function Fold({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div id={id} className="fold" data-open={open} inert={!open}>
      <div className="fold-in">{children}</div>
    </div>
  )
}
