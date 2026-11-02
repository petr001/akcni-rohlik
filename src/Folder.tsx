import { useEffect } from 'react'
import type { Group, Product } from './types'
import { ProductCard } from './ProductCard'

interface Props {
  group: Group
  quantities: Record<string, number>
  busyId: number | null
  onAdd: (p: Product) => void
  onClose: () => void
}

/** „Složka“ jako na iPhonu: overlay s rozmazaným pozadím a všemi produkty druhu. */
export function Folder({ group, quantities, busyId, onAdd, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fade fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 backdrop-blur-md" onClick={onClose}>
      <div
        className="pop flex max-h-[88vh] w-full max-w-5xl flex-col rounded-3xl bg-stone-100/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <div>
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-sm text-stone-500">
              {group.parent && `${group.parent} · `}
              {group.products.length} v akci
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-stone-200 px-3 py-1 text-lg" aria-label="Zavřít">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 pt-2 sm:grid-cols-3 lg:grid-cols-4">
          {group.products.map((p) => (
            <ProductCard key={p.id} p={p} inCart={quantities[p.id] ?? 0} busy={busyId === p.id} onAdd={onAdd} />
          ))}
        </div>
      </div>
    </div>
  )
}
