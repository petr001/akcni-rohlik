import { useCallback, useEffect, useMemo, useState } from 'react'
import { subgroups, topDeal, type Cart, type Deals, type Group, type Product } from './types'
import { GroupCard } from './GroupCard'
import { Folder } from './Folder'
import { LoginForm } from './LoginForm'
import { Fold } from './Fold'
import { CartIcon } from './CartIcon'
import { Preview } from './Preview'
import { categoryIcon, kc } from './format'

type View = 'rohlik' | 'abc' | 'flat'
const KEY = 'fast-rohlik:open'
const readOpen = (): number | null => {
  try {
    localStorage.removeItem('fast-rohlik:collapsed') // starý klíč ze sbalitelných sekcí
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return typeof v === 'number' ? v : null
  } catch {
    return null
  }
}
const cmp = (a: string, b: string) => a.localeCompare(b, 'cs')
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export default function App() {
  const [deals, setDeals] = useState<Deals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  const [addedId, setAddedId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [openSection, setOpenSection] = useState<number | null>(readOpen) // accordion: nejvýš jedna otevřená
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

  // Po načtení akcí na pozadí přednačti obrázky reprezentantů, ať se při otevření sekce neobjevují až za chvíli.
  useEffect(() => {
    if (!deals || loading) return
    const urls = deals.groups.map((g) => (g.products.length ? topDeal(g).image : '')).filter(Boolean)
    let i = 0
    const t = setInterval(() => {
      for (const u of urls.slice(i, i + 6)) new Image().src = u
      i += 6
      if (i >= urls.length) clearInterval(t)
    }, 250)
    return () => clearInterval(t)
  }, [deals, loading])

  // Aktivní chip držíme viditelný jen vodorovně v liště (stránka se kvůli tomu nescrolluje).
  useEffect(() => {
    if (openSection === null) return
    document.querySelectorAll<HTMLElement>(`nav[aria-label="Kategorie"] [data-chip="${openSection}"]`).forEach((chip) => {
      const nav = chip.parentElement as HTMLElement
      if (!nav.offsetParent) return
      const left = chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2
      nav.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  }, [openSection, deals])

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
      setAddedId(p.id)
      setTimeout(() => setAddedId((x) => (x === p.id ? null : x)), 1300)
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
    const sorted = list // pořadí „v regálu“ určuje server (topOrder, order)
    if (view === 'flat') return [{ id: 0, name: '', groups: sorted }]
    const by = new Map<number, { id: number; name: string; order: number; groups: Group[] }>()
    for (const g of sorted) {
      const sec = by.get(g.topId) ?? { id: g.topId, name: g.topName, order: g.topOrder, groups: [] }
      sec.groups.push(g)
      by.set(g.topId, sec)
    }
    return [...by.values()].sort((a, b) => (view === 'abc' ? cmp(a.name, b.name) : a.order - b.order))
  }, [deals, query, view])
  const searching = query.trim() !== ''
  const changeOpen = (id: number | null) => {
    setOpenSection(id)
    try {
      if (id === null) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, JSON.stringify(id))
    } catch {}
  }
  /** Skok z chipu v liště kategorií: po skončení přechodu výšky plynule doscrolluje na sekci (jediné místo, kde se scrolluje). */
  const scrollWhenDone = (id: number) => {
    const body = document.getElementById(`cat-${id}-body`)
    let done = false
    const go = () => {
      if (done) return
      done = true
      body?.removeEventListener('transitionend', onEnd)
      document.getElementById(`cat-${id}`)?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    }
    const onEnd = (e: TransitionEvent) => e.target === body && e.propertyName === 'grid-template-rows' && go()
    body?.addEventListener('transitionend', onEnd)
    setTimeout(go, 800) // pojistka
  }
  const toggle = (id: number) => {
    changeOpen(openSection === id ? null : id) // otevření sekce stránku neposouvá
  }
  const jump = (id: number) => {
    changeOpen(id)
    scrollWhenDone(id)
  }
  const groupCount = sections.reduce((n, s) => n + s.groups.length, 0)

  const openGroup: Group | undefined = deals?.groups.find((g) => g.id === open)
  const closeFolder = useCallback(() => setOpen(null), [])

  const sel = 'h-9 min-w-[8.5rem] flex-1 rounded-full md:min-w-0 border border-line bg-surface px-3 text-sm font-medium shadow-card'
  const chips =
    view !== 'flat' && sections.length > 1 ? (
      <nav className="chips-scroll relative -mx-3 flex flex-nowrap gap-1 overflow-x-auto px-3 py-0.5" aria-label="Kategorie">
        {sections.map((sec) => (
          <a
            key={sec.id}
            href={`#cat-${sec.id}`}
            onClick={(e) => { e.preventDefault(); jump(sec.id) }}
            aria-current={sec.id === openSection ? 'true' : undefined}
            data-chip={sec.id}
            title={sec.name}
            aria-label={sec.name}
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md border bg-surface px-2 py-0.5 text-xs font-medium transition hover:border-accent hover:text-accent active:scale-95 max-md:min-h-8 max-md:px-2.5 ${sec.id === openSection ? 'border-accent text-accent' : 'border-line'}`}
          >
            {categoryIcon(sec.name) ? <span aria-hidden className="text-4xl leading-none">{categoryIcon(sec.name)}</span> : sec.name}
          </a>
        ))}
      </nav>
    ) : null
  const btn = 'rounded-full bg-surface-2 px-3.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50'

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-32 pt-3">
      <header className="app-header sticky top-0 z-30 -mx-4 mb-4 border-b border-line px-4 py-2">
        <div className="flex flex-wrap items-center gap-2 py-2.5 md:flex-nowrap">
          <h1 className="flex shrink-0 items-center gap-1.5 text-xl font-black tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-base text-accent-ink">⚡</span>
            <span className="hidden lg:inline">Fast Rohlík</span>
          </h1>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Hledat…"
            aria-label="Hledat druh nebo produkt"
            className="h-9 min-w-[7rem] flex-1 rounded-full border border-line bg-surface px-3.5 text-sm shadow-card transition-[width] placeholder:text-muted md:min-w-0 md:w-44 md:flex-none md:focus:w-72"
          />
          {me ? (
            <button onClick={logout} className={`${btn} ml-auto h-9 shrink-0 md:order-last`} title={me}>Odhlásit</button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="ml-auto h-9 shrink-0 rounded-full bg-accent px-4 text-sm font-bold text-accent-ink transition active:scale-95 md:order-last">Přihlásit</button>
          )}
          <select value={view} onChange={(e) => setView(e.target.value as View)} className={`${sel} md:flex-initial`} aria-label="Seskupení">
            <option value="rohlik">Kategorie · pořadí Rohlíku</option>
            <option value="abc">Kategorie · abecedně</option>
            <option value="flat">Bez seskupení</option>
          </select>
          <button onClick={() => load(true)} disabled={loading} className={`${btn} h-9 shrink-0 max-md:w-9 max-md:px-0`} aria-label="Obnovit akce">
            <span className={loading ? 'spin inline-block' : 'inline-block'}>↻</span>
            <span className="max-md:sr-only"> {loading ? 'Načítám' : 'Obnovit'}</span>
          </button>
        </div>
        {chips && <div className="mt-2 hidden lg:block">{chips}</div>}
      </header>
      {chips && <div className="mb-4 lg:hidden">{chips}</div>}

      {error && <p className="rounded-2xl bg-sale/15 p-3 text-sale">Chyba: {error}</p>}
      {progress && (
        <p className="mb-3 flex items-center gap-2 text-sm text-warn">
          <span className="spin h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" /> {progress}
        </p>
      )}
      {!deals && !error && <Skeleton />}
      {deals && (
        <>
          <p className="mb-4 text-sm text-muted">
            <b className="text-ink">{deals.total}</b> produktů v akci ve <b className="text-ink">{groupCount}</b> druzích
            {deals.fetchedAt && ` · stav z ${new Date(deals.fetchedAt).toLocaleString('cs-CZ')}`}
          </p>
          {sections.map((sec) => {
            // Při hledání jsou otevřené všechny sekce s výsledky (uložený stav se nemění); v „Bez seskupení“ vždy.
            const open = searching || !sec.name || openSection === sec.id
            return (
              <section key={sec.id} id={`cat-${sec.id}`} className="mb-5 scroll-mt-28 md:scroll-mt-40">
                {sec.name && (
                  <h2 className="mb-3 border-b border-line">
                    <button
                      onClick={() => toggle(sec.id)}
                      aria-expanded={open}
                      aria-controls={`cat-${sec.id}-body`}
                      disabled={searching}
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors duration-150 hover:bg-header active:bg-header focus-visible:bg-header focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span
                        aria-hidden
                        className={`grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-[10px] text-muted transition duration-300 group-hover:bg-accent-soft group-hover:text-accent ${open ? 'rotate-90' : ''}`}
                      >
                        ▶
                      </span>
                      <span className="text-xl font-extrabold tracking-tight">{categoryIcon(sec.name) && <span aria-hidden className="mr-1.5">{categoryIcon(sec.name)}</span>}{sec.name}</span>
                      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">{sec.groups.length} druhů</span>
                    </button>
                  </h2>
                )}
                {sec.name && (
                  <Fold open={!open} id={`cat-${sec.id}-preview`}>
                    <Preview
                      groups={sec.groups}
                      onOpenSection={() => toggle(sec.id)}
                      onOpenGroup={(g, rect) => { setOrigin(rect); setOpen(g.id) }}
                    />
                  </Fold>
                )}
                <Fold open={open} id={`cat-${sec.id}-body`}>
                  <div className="px-2 pb-5 pt-2">
                    {subgroups(sec.groups).map((sub, si, all) => (
                      <div key={`${sub.subId}-${si}`} className={si ? 'mt-4' : ''}>
                        {all.length > 1 && sub.title && (
                          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{sub.title}</h3>
                        )}
                        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] sm:gap-4">
                          {sub.groups.map((g) => (
                            <GroupCard key={g.id} group={g} onOpen={(rect) => { setOrigin(rect); setOpen(g.id) }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Fold>
              </section>
            )
          })}
        </>
      )}

      {showLogin && <LoginForm onDone={loggedIn} onClose={() => { setShowLogin(false); setPending(null) }} />}
      {openGroup && (
        <Folder group={openGroup} origin={origin} quantities={cart?.quantities ?? {}} busyId={busyId} addedId={addedId} onAdd={add} onClose={closeFolder} />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-bg shadow-pop">
          <span key={cart?.count} className={`whitespace-nowrap font-semibold ${cart ? 'bump' : ''}`}>
            <CartIcon className="mr-1.5 inline h-5 w-5 align-[-4px]" /> {cart ? `${cart.count} ks · ${kc(cart.totalPrice)}` : me ? '…' : 'nepřihlášen'}
          </span>
          {cartError && <span className="truncate text-sm text-sale">{cartError}</span>}
          <a
            href="https://www.rohlik.cz/"
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-ink transition active:scale-95"
          >
            Dokončit na Rohlíku →
          </a>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div aria-label="Načítám" className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="rounded-3xl bg-surface p-2.5 shadow-card">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="skeleton mt-3 h-3 w-1/3 rounded" />
          <div className="skeleton mt-2 h-5 w-4/5 rounded" />
          <div className="skeleton mt-3 h-5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}
