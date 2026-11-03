import type { Product } from './types'
import { CartIcon } from './CartIcon'

interface Props {
  p: Product
  inCart: number
  added: boolean
  onAdd: (p: Product) => void
  onRemove: (p: Product) => void
}

/** „−“ (jen když je produkt v košíku) a „+“, položené přes obrázek vpravo dole – rodič musí být `relative`. */
export function CartControls({ p, inCart, added, onAdd, onRemove }: Props) {
  return (
    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
      {inCart > 0 && (
        <button
          onClick={() => onRemove(p)}
          aria-label={`Ubrat ${p.name} z košíku`}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg font-bold shadow-md ring-1 ring-line transition active:scale-90"
        >
          −
        </button>
      )}
      <button
        onClick={() => onAdd(p)}
        aria-label={`Přidat ${p.name} do košíku`}
        className={`relative flex h-10 w-16 items-center justify-center rounded-full text-sm font-bold transition duration-200 active:scale-90 ${
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
  )
}
