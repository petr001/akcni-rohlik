import { useCallback, useEffect, useState } from 'react'
import type { Group, Product } from './types'
import { ProductCard } from './ProductCard'

interface Props {
  group: Group
  origin: DOMRect | null
  quantities: Record<string, number>
  addedId: number | null
  onAdd: (p: Product) => void
  onRemove: (p: Product) => void
  onClose: () => void
}

/** „Složka“ jako na iPhonu: roste z místa karty, pozadí se rozmaže. */
export function Folder({ group, origin, quantities, addedId, onAdd, onRemove, onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const close = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 260)
  }, [onClose])

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [close])

  const dx = origin ? origin.left + origin.width / 2 - innerWidth / 2 : 0
  const dy = origin ? origin.top + origin.height / 2 - innerHeight / 2 : 24

  return (
    <div
      className={`${closing ? 'fade-out' : 'fade'} fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3 backdrop-blur-md`}
      onClick={close}
    >
      <div
        role="dialog"
        aria-label={group.name}
        style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as React.CSSProperties}
        className={`${closing ? 'folder-out' : 'folder-in'} flex max-h-[88vh] w-full max-w-[1280px] flex-col rounded-[2rem] bg-bg shadow-pop ring-1 ring-line`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{group.name}</h2>
            <p className="text-sm text-muted">
              {group.parent && `${group.parent} · `}
              {group.products.length} v akci
            </p>
          </div>
          <button onClick={close} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-lg transition active:scale-90" aria-label="Zavřít">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 overflow-y-auto overscroll-contain p-4 pt-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
          {group.products.map((p) => (
            <ProductCard key={p.id} p={p} inCart={quantities[p.id] ?? 0} added={addedId === p.id} onAdd={onAdd} onRemove={onRemove} />
          ))}
        </div>
      </div>
    </div>
  )
}
