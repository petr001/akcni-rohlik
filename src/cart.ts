import { useCallback, useEffect, useState } from 'react'
import type { Product } from './types'

export interface CartLine {
  p: Product
  qty: number
}

const KEY = 'fast-rohlik:cart'

const read = (): CartLine[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Košík žije jen v prohlížeči (localStorage); na rohlik.cz ho přenese bookmarklet. */
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(read)

  const update = useCallback((fn: (l: CartLine[]) => CartLine[]) => {
    setLines((cur) => {
      const next = fn(cur)
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Změna košíku v jiném okně/kartě appky.
  useEffect(() => {
    const h = (e: StorageEvent) => e.key === KEY && setLines(read())
    addEventListener('storage', h)
    return () => removeEventListener('storage', h)
  }, [])

  const cap = (p: Product, qty: number) => Math.max(0, p.maxAmount > 0 ? Math.min(qty, p.maxAmount) : qty)

  const add = useCallback(
    (p: Product, qty = 1) =>
      update((l) => {
        const cur = l.find((x) => x.p.id === p.id)
        // Cena a akce se mohou mezi načteními změnit → držíme čerstvější data produktu.
        return cur ? l.map((x) => (x === cur ? { p, qty: cap(p, x.qty + qty) } : x)) : [...l, { p, qty: cap(p, qty) }]
      }),
    [update],
  )
  const setQty = useCallback(
    (id: number, qty: number) => update((l) => l.flatMap((x) => (x.p.id !== id ? [x] : cap(x.p, qty) > 0 ? [{ ...x, qty: cap(x.p, qty) }] : []))),
    [update],
  )
  const clear = useCallback(() => update(() => []), [update])

  return {
    lines,
    add,
    setQty,
    clear,
    count: lines.reduce((a, x) => a + x.qty, 0),
    total: lines.reduce((a, x) => a + x.qty * x.p.salePrice, 0),
    quantities: Object.fromEntries(lines.map((x) => [x.p.id, x.qty])) as Record<string, number>,
  }
}
