import { useEffect, useRef } from 'react'
import type { CartLine } from './cart'
import { bookmarkletHref } from './bookmarklet'
import { Img } from './Img'
import { kc } from './format'

interface Props {
  lines: CartLine[]
  total: number
  onQty: (id: number, qty: number) => void
  onClear: () => void
  onClose: () => void
}

/** Lokální košík: úprava množství + odkaz k přetažení do lišty záložek (bookmarklet, který košík vloží na rohlik.cz). */
export function CartModal({ lines, total, onQty, onClear, onClose }: Props) {
  const link = useRef<HTMLAnchorElement>(null)
  // React 19 blokuje javascript: URL v atributu href, proto ho nastavíme přímo na prvku.
  useEffect(() => {
    link.current?.setAttribute('href', bookmarkletHref(location.origin))
  }, [])
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
    <div className="fade fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label="Košík" onClick={(e) => e.stopPropagation()} className="pop-in flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-surface p-5 shadow-pop ring-1 ring-line">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-bold">Košík</h2>
          <button onClick={onClear} className="ml-auto text-sm font-semibold text-muted hover:text-sale">Vysypat</button>
          <button onClick={onClose} aria-label="Zavřít" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-lg leading-none">×</button>
        </div>

        <ul className="-mx-1 min-h-0 flex-1 divide-y divide-line overflow-y-auto px-1">
          {lines.map(({ p, qty }) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <Img src={p.image} className="h-12 w-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</div>
                <div className="text-xs text-muted">{p.amount} · {kc(p.salePrice)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => onQty(p.id, qty - 1)} aria-label={`Ubrat ${p.name}`} className="h-8 w-8 rounded-full bg-surface-2 font-bold active:scale-90">−</button>
                <span className="w-6 text-center text-sm font-bold">{qty}</span>
                <button onClick={() => onQty(p.id, qty + 1)} disabled={p.maxAmount > 0 && qty >= p.maxAmount} aria-label={`Přidat ${p.name}`} className="h-8 w-8 rounded-full bg-surface-2 font-bold active:scale-90 disabled:opacity-40">+</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Celkem v akci</span>
          <span className="text-lg font-extrabold">{kc(total)}</span>
        </div>

        <div className="mt-4 rounded-2xl bg-surface-2 p-3.5 text-sm">
          <p className="font-semibold">Jak to dostat do Rohlíku</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
            <li>
              Jednou přetáhni <a ref={link} onClick={(e) => e.preventDefault()} draggable className="inline-block cursor-grab rounded-full bg-accent px-3 py-0.5 font-bold text-accent-ink">⚡ Do košíku Rohlíku</a> do lišty záložek.
            </li>
            <li>Otevři <a href="https://www.rohlik.cz/" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">rohlik.cz</a> (přihlášený přes Facebook, jak jsi zvyklý) a klikni na tu záložku.</li>
            <li>Povol vyskakovací okno – košík se doplní sám.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
