import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cart, Deals, Group, Product } from './types'
import { GroupCard } from './GroupCard'
import { Folder } from './Folder'
import { LoginForm } from './LoginForm'
import { kc } from './format'

type Sort = 'count' | 'discount' | 'cheapest' | 'name'
type View = 'rohlik' | 'abc' | 'flat'
const cmp = (a: string, b: string) => a.localeCompare(b, 'cs')
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
  const [view, setView] = useState<View>('rohlik')
  const [loading, setLoading] = useState(false)

  const [me, setMe] = useState<string | null>(null) // e-mail přihlášeného
  const [showLogin, setShowLogin] = useState(false)
  const [pending, setPending] = useState<Product | null>(null) // produkt čekající na přihlášení
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

  const loadCart = useCallback(async () => {
    const r = await fetch('/api/cart')
    const j = await r.json()
    if (r.status === 401) {
      setMe(null)
      setCart(null)
      return
    }
    if (!r.ok) throw new Error(j.error)
    setCart(j)
  }, [])

  useEffect(() => {
    load()
    fetch('/api/me')
      .then((r) => r.json())
      .then((j) => {
        if (j.loggedIn) {
          setMe(j.email)
          return loadCart()
        }
      })
      .catch((e) => setCartError(e.message))
  }, [load, loadCart])

  const add = (p: Product) => {
    if (me) return send(p)
    setPending(p)
    setShowLogin(true)
  }

  const send = async (p: Product) => {
    setBusyId(p.id)
    setCartError(null)
    try {
      const r = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, quantity: 1 }),
      })
      const j = await r.json()
      if (r.status === 401) {
        setMe(null)
        setPending(p)
        setShowLogin(true)
        return
      }
      if (!r.ok) throw new Error(j.error)
      setCart(j)
    } catch (e) {
      setCartError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const loggedIn = (email: string) => {
    setMe(email)
    setShowLogin(false)
    if (pending) send(pending)
    else loadCart().catch((e) => setCartError(e.message))
    setPending(null)
  }
  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    setMe(null)
    setCart(null)
  }

  const sections = useMemo(() => {
    if (!deals) return []
    const q = norm(query.trim())
    let list = deals.groups
    if (q) list = list.filter((g) => norm(g.name + ' ' + g.parent + ' ' + g.topName).includes(q) || g.products.some((p) => norm(p.name).includes(q)))
    const inner: Record<Sort, (a: Group, b: Group) => number> = {
      count: (a, b) => b.products.length - a.products.length,
      discount: (a, b) => b.products[0].discount - a.products[0].discount,
      cheapest: (a, b) => Math.min(...a.products.map((p) => p.salePrice)) - Math.min(...b.products.map((p) => p.salePrice)),
      name: (a, b) => cmp(a.name, b.name),
    }
    const sorted = [...list].sort(inner[sort])
    if (view === 'flat') return [{ id: 0, name: '', groups: sorted }]
    const by = new Map<number, { id: number; name: string; order: number; groups: Group[] }>()
    for (const g of sorted) {
      const sec = by.get(g.topId) ?? { id: g.topId, name: g.topName, order: g.topOrder, groups: [] }
      sec.groups.push(g)
      by.set(g.topId, sec)
    }
    return [...by.values()].sort((a, b) => (view === 'abc' ? cmp(a.name, b.name) : a.order - b.order))
  }, [deals, query, sort, view])
  const groupCount = sections.reduce((n, s) => n + s.groups.length, 0)

  const openGroup: Group | undefined = deals?.groups.find((g) => g.id === open)
  const closeFolder = useCallback(() => setOpen(null), [])

  return (
    <div className="mx-auto max-w-7xl px-3 pb-28 pt-4">
      <header className="md:sticky top-0 z-30 -mx-3 mb-4 flex flex-wrap items-center gap-3 bg-stone-100/90 px-3 py-2 backdrop-blur">
        <h1 className="text-xl font-extrabold">⚡ Fast Rohlík</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hledat druh nebo produkt…"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2"
        />
        <select value={view} onChange={(e) => setView(e.target.value as View)} className="rounded-full border border-stone-300 bg-white px-3 py-2" aria-label="Seskupení">
          <option value="rohlik">Kategorie (pořadí Rohlíku)</option>
          <option value="abc">Kategorie (abecedně)</option>
          <option value="flat">Bez seskupení</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-stone-300 bg-white px-3 py-2" aria-label="Řazení druhů">
          <option value="count">Nejvíc produktů</option>
          <option value="discount">Největší sleva</option>
          <option value="cheapest">Nejlevnější</option>
          <option value="name">Abecedně</option>
        </select>
        <button onClick={() => load(true)} disabled={loading} className="rounded-full bg-stone-200 px-3 py-2 text-sm disabled:opacity-50">
          {loading ? 'Načítám…' : '↻ Obnovit'}
        </button>
        {me ? (
          <button onClick={logout} className="rounded-full bg-stone-200 px-3 py-2 text-sm" title={me}>Odhlásit</button>
        ) : (
          <button onClick={() => setShowLogin(true)} className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Přihlásit</button>
        )}
        {view !== 'flat' && sections.length > 1 && (
          <nav className="flex w-full flex-wrap gap-2">
            {sections.map((sec) => (
              <a key={sec.id} href={`#cat-${sec.id}`} className="rounded-full bg-white px-3 py-1 text-sm shadow-sm hover:bg-stone-200">
                {sec.name}
              </a>
            ))}
          </nav>
        )}
      </header>

      {error && <p className="rounded-xl bg-red-100 p-3 text-red-800">Chyba: {error}</p>}
      {progress && <p className="mb-3 text-sm text-amber-700">{progress}</p>}
      {!deals && !error && <p className="py-20 text-center text-stone-500">Načítám…</p>}
      {deals && (
        <>
          <p className="mb-3 text-sm text-stone-500">
            {deals.total} produktů v akci ve {groupCount} druzích · {deals.fetchedAt && `stav z ${new Date(deals.fetchedAt).toLocaleString('cs-CZ')}`}
          </p>
          {sections.map((sec) => (
            <section key={sec.id} id={`cat-${sec.id}`} className="mb-8 scroll-mt-4 md:scroll-mt-48">
              {sec.name && (
                <h2 className="mb-3 text-lg font-bold">
                  {sec.name} <span className="text-sm font-normal text-stone-400">{sec.groups.length} druhů</span>
                </h2>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {sec.groups.map((g) => (
                  <GroupCard key={g.id} group={g} onOpen={() => setOpen(g.id)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {showLogin && <LoginForm onDone={loggedIn} onClose={() => { setShowLogin(false); setPending(null) }} />}
      {openGroup && <Folder group={openGroup} quantities={cart?.quantities ?? {}} busyId={busyId} onAdd={add} onClose={closeFolder} />}

      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
        <div className="flex max-w-full items-center gap-3 rounded-full bg-stone-900 px-5 py-3 text-white shadow-xl">
          <span>🛒 {cart ? `${cart.count} ks · ${kc(cart.totalPrice)}` : me ? '…' : 'nepřihlášen'}</span>
          {cartError && <span className="truncate text-sm text-amber-300">{cartError}</span>}
          <a href="https://www.rohlik.cz/" target="_blank" rel="noreferrer" className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold">
            Dokončit na Rohlíku →
          </a>
        </div>
      </div>
    </div>
  )
}
