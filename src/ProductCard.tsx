import type { Product } from './types'
import { kc, pct, till } from './format'

interface Props {
  p: Product
  inCart: number
  busy: boolean
  onAdd: (p: Product) => void
}

export function ProductCard({ p, inCart, busy, onAdd }: Props) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-3 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-50">
        <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain" />
        <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          {pct(p.discount)}
        </span>
      </div>
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight">{p.name}</div>
      <div className="text-xs text-stone-500">{p.amount}</div>
      <div className="mt-auto flex items-end justify-between pt-2">
        <div>
          <div className="text-lg font-bold text-red-600">{kc(p.salePrice)}</div>
          <div className="text-xs text-stone-400">
            <s>{kc(p.originalPrice)}</s> {till(p.validTill)}
          </div>
        </div>
        <button
          onClick={() => onAdd(p)}
          disabled={busy}
          className="relative whitespace-nowrap rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
          aria-label={`Přidat ${p.name} do košíku`}
        >
          + Košík
          {inCart > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-stone-900 px-1.5 text-xs">{inCart}</span>
          )}
        </button>
      </div>
    </div>
  )
}
