import type { Product } from './types'
import { kc, pct, till } from './format'
import { Img } from './Img'
import { CartIcon } from './CartIcon'

interface Props {
  p: Product
  inCart: number
  added: boolean
  onAdd: (p: Product) => void
  onRemove: (p: Product) => void
}

export function ProductCard({ p, inCart, added, onAdd, onRemove }: Props) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-2.5 shadow-card">
      <div className="relative">
        <Img src={p.image} className="aspect-square rounded-xl" />
        <span className="absolute left-2 top-2 rounded-full bg-sale px-2 py-0.5 text-xs font-extrabold text-sale-ink shadow">
          {pct(p.discount)}
        </span>
      </div>
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">{p.name}</div>
      <div className="text-xs text-muted">{p.amount}</div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-2">
        <div>
          <div className="whitespace-nowrap text-lg font-extrabold leading-tight text-sale">{kc(p.salePrice)}</div>
          <div className="whitespace-nowrap text-xs text-muted">
            <s>{kc(p.originalPrice)}</s> {till(p.validTill)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {inCart > 0 && (
            <button
              onClick={() => onRemove(p)}
              aria-label={`Ubrat ${p.name} z košíku`}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-lg font-bold transition active:scale-90"
            >
              −
            </button>
          )}
          <button
            onClick={() => onAdd(p)}
            aria-label={`Přidat ${p.name} do košíku`}
            className={`relative flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition duration-200 active:scale-90 ${
              added ? 'bg-accent-soft text-accent ring-2 ring-accent' : 'bg-accent text-accent-ink shadow-md hover:brightness-110'
            }`}
          >
            {added ? (
              <span className="check">✓</span>
            ) : (
              <span className="flex items-center gap-1"><CartIcon className="h-5 w-5" />+</span>
            )}
            {inCart > 0 && (
              <span key={inCart} className="bump absolute -right-1.5 -top-1.5 rounded-full bg-ink px-1.5 text-[11px] font-extrabold text-bg ring-2 ring-surface">
                {inCart}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
