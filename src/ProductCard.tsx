import type { Product } from './types'
import { kc, pct, till } from './format'
import { Img } from './Img'
import { CartControls } from './CartControls'

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
        <CartControls p={p} inCart={inCart} added={added} onAdd={onAdd} onRemove={onRemove} />
      </div>
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">{p.name}</div>
      <div className="text-xs text-muted">{p.amount}</div>
      <div className="mt-auto pt-2">
        <div className="whitespace-nowrap text-lg font-extrabold leading-tight text-sale">{kc(p.salePrice)}</div>
        <div className="whitespace-nowrap text-xs text-muted">
          <s>{kc(p.originalPrice)}</s> {till(p.validTill)}
        </div>
      </div>
    </div>
  )
}
