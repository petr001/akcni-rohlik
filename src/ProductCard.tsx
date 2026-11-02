import type { Product } from './types'
import { kc, pct, till } from './format'
import { Img } from './Img'

interface Props {
  p: Product
  inCart: number
  busy: boolean
  added: boolean
  onAdd: (p: Product) => void
}

export function ProductCard({ p, inCart, busy, added, onAdd }: Props) {
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
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div>
          <div className="text-lg font-extrabold leading-tight text-sale">{kc(p.salePrice)}</div>
          <div className="text-xs text-muted">
            <s>{kc(p.originalPrice)}</s> {till(p.validTill)}
          </div>
        </div>
        <button
          onClick={() => onAdd(p)}
          disabled={busy}
          aria-label={`Přidat ${p.name} do košíku`}
          className={`relative flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition duration-200 active:scale-90 ${
            added ? 'bg-accent-soft text-accent' : 'bg-accent text-accent-ink hover:brightness-110'
          }`}
        >
          {busy ? (
            <span className="spin h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
          ) : added ? (
            <span className="check">✓</span>
          ) : (
            <>🛒&nbsp;+</>
          )}
          {inCart > 0 && !busy && (
            <span key={inCart} className="bump absolute -right-1.5 -top-1.5 rounded-full bg-ink px-1.5 text-[11px] font-bold text-bg">
              {inCart}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
