import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cart, Deals, Group, Product } from './types'
import { GroupCard } from './GroupCard'
import { Folder } from './Folder'
import { kc } from './format'

type Sort = 'count' | 'discount' | 'name'
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export default function App() {
  const [deals, setDeals] = useState<Deals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('count')
  const [loading, setLoading] = useState(false)

  const [progress, setProgress] = useState<string | null>(null)

  /** Akce se stahují po hlavních kategoriích (každá je samostatný krátký požadavek). */
  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const get = async (q = '') => {
        const r = await fetch(`/api/deals${q}`)
        const j = await r.json()
        if (!r.ok) throw new Error(j.error)
        return j as Deals
      }
      let d = await get(refresh ? '?refresh=1' : '')
      setDeals(d)
      const todo = d.pending
      for (let i = 0; i < todo.length; i++) {
        setProgress(`Stahuji akce z Rohlíku… ${i + 1}/${todo.length}`)
        const r = await fetch(`/api/deals/part/${todo[i]}`, { method: 'POST' })
        if (!r.ok) throw new Error((await r.json()).error)
        d = await get()
        setDeals(d)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProgress(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    fetch('/api/cart')
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error)
        setCart(j)
      })
      .catch((e) => setCartError(e.message))
  }, [load])

  const add = async (p: Product) => {
    setBusyId(p.id)
    setCartError(null)
    try {
      const r = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, quantity: 1 }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setCart(j)
    } catch (e) {
      setCartError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const groups = useMemo(() => {
    if (!deals) return []
    const q = norm(query.trim())
    let list = deals.groups
    if (q) list = list.filter((g) => norm(g.name + ' ' + g.parent).includes(q) || g.products.some((p) => norm(p.name).includes(q)))
    const s = [...list]
    if (sort === 'discount') s.sort((a, b) => b.products[0].discount - a.products[0].discount)
    if (sort === 'name') s.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    return s
  }, [deals, query, sort])

  const openGroup: Group | undefined = deals?.groups.find((g) => g.id === open)
  const closeFolder = useCallback(() => setOpen(null), [])

  return (
    <div className="mx-auto max-w-7xl px-3 pb-28 pt-4">
      <header className="sticky top-0 z-30 -mx-3 mb-4 flex flex-wrap items-center gap-3 bg-stone-100/90 px-3 py-2 backdrop-blur">
        <h1 className="text-xl font-extrabold">⚡ Fast Rohlík</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hledat druh nebo produkt…"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-stone-300 bg-white px-3 py-2">
          <option value="count">Podle počtu</option>
          <option value="discount">Podle slevy</option>
          <option value="name">Abecedně</option>
        </select>
        <button onClick={() => load(true)} disabled={loading} className="rounded-full bg-stone-200 px-3 py-2 text-sm disabled:opacity-50">
          {loading ? 'Načítám…' : '↻ Obnovit'}
        </button>
      </header>

      {error && <p className="rounded-xl bg-red-100 p-3 text-red-800">Chyba: {error}</p>}
      {progress && <p className="mb-3 text-sm text-amber-700">{progress}</p>}
      {!deals && !error && <p className="py-20 text-center text-stone-500">Načítám…</p>}
      {deals && (
        <>
          <p className="mb-3 text-sm text-stone-500">
            {deals.total} produktů v akci ve {groups.length} druzích · {deals.fetchedAt && `stav z ${new Date(deals.fetchedAt).toLocaleString('cs-CZ')}`}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onOpen={() => setOpen(g.id)} />
            ))}
          </div>
        </>
      )}

      {openGroup && <Folder group={openGroup} quantities={cart?.quantities ?? {}} busyId={busyId} onAdd={add} onClose={closeFolder} />}

      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
        <div className="flex max-w-full items-center gap-3 rounded-full bg-stone-900 px-5 py-3 text-white shadow-xl">
          <span>🛒 {cart ? `${cart.count} ks · ${kc(cart.totalPrice)}` : '—'}</span>
          {cartError && <span className="truncate text-sm text-amber-300">{cartError}</span>}
          <a href="https://www.rohlik.cz/" target="_blank" rel="noreferrer" className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold">
            Dokončit na Rohlíku →
          </a>
        </div>
      </div>
    </div>
  )
}
