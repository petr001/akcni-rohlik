import { cache } from './cache.js'
import { categoryNames, productCards, saleProductIds, subcategoryIds } from './rohlik.js'

export interface Product {
  id: number
  name: string
  brand: string | null
  image: string
  amount: string
  unit: string
  salePrice: number
  originalPrice: number
  discount: number // 0..1
  unitPrice: number
  validTill: string | null
  badge: string | null
  maxAmount: number
}

export interface Group {
  id: number
  name: string
  parent: string // název podskupiny (nadřazená kategorie Rohlíku), '' = bez mezititulku
  subId: number // id podskupiny – karty se stejným subId jsou u sebe
  order: number // pořadí „v regálu“ (pořadí uzlů ve stromu kategorií Rohlíku) v rámci hlavní kategorie
  products: Product[] // seřazené logicky (název bez gramáže, jednotková cena), ne podle slevy
  topId: number // hlavní kategorie Rohlíku
  topName: string
  topOrder: number // pořadí hlavní kategorie na Rohlíku
}

type PartGroup = Omit<Group, 'topId' | 'topName' | 'topOrder'>

/** Verze formátu cache – stará cache bez pořadí/podskupin se stáhne znovu. */
const SCHEMA = 2
/** Druh s víc produkty než tohle se rozdělí o úroveň hlouběji (pokud mají podkategorie akce). */
const DEEPEN_OVER = 12
/** Zahloubení je „nice to have“: po tomto čase (ms od začátku stahování kategorie) se už nedělá, ať se vejdeme do limitu funkce. */
const DEEPEN_BUDGET = 4000

/** Akce jedné hlavní kategorie – stahuje se zvlášť, aby se vešlo do limitu funkce (~10 s). */
export interface Part {
  topId: number
  schema?: number
  topName?: string
  fetchedAt: string
  groups: PartGroup[]
}

export interface Deals {
  fetchedAt: string | null
  total: number
  groups: Group[]
  pending: number[] // hlavní kategorie, které je potřeba (znovu) stáhnout přes /api/deals/part/:id
}

const HOUR = 60 * 60 * 1000
const TTL = 6 * HOUR // akce se stahují nejvýš jednou za 6 h
const TOP_TTL = 24 * HOUR // seznam hlavních kategorií

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const q = [...items]
  await Promise.all(Array.from({ length: n }, async () => { for (let x; (x = q.shift()) !== undefined; ) await fn(x) }))
}

export async function topCategories(): Promise<number[]> {
  const cached = await cache.get<{ ids: number[]; at: number }>('top')
  if (cached && Date.now() - cached.at < TOP_TTL) return cached.ids
  const ids = await subcategoryIds('sales')
  await cache.set('top', { ids, at: Date.now() })
  return ids
}

/** Název bez gramáže/balení, ať jsou varianty téhož produktu u sebe. */
const normName = (n: string) =>
  n
    .toLowerCase()
    .replace(/\b(cca|ca)\b/g, '')
    .replace(/\d+(?:[.,]\d+)?\s*(?:[x×]\s*\d+(?:[.,]\d+)?\s*)?(?:kg|g|ml|cl|dl|l|ks|m|cm|mm|%)(?![a-zá-ž])/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Stáhne a zacachuje akce jedné hlavní kategorie. */
export async function buildPart(topId: number): Promise<Part> {
  // Produkt patří do nejhlubšího uzlu, kde je v akci: kategorie (0) → podkategorie (1) → druh (2),
  // druhy s víc než DEEPEN_OVER produkty se dělí ještě o úroveň níž (3).
  // Pořadí uzlů z API (= pořadí regálů) držíme v `path` (indexy předků), ne podle pořadí dokončení požadavků.
  const started = Date.now()
  const owner = new Map<number, { cat: number; level: number }>()
  const info = new Map<number, { parent: number | null; level: number; path: number[]; l1: number }>()

  async function walk(id: number, parent: number | null, level: number, path: number[]) {
    const all = await saleProductIds(id)
    if (!all.length) return
    const l1 = level <= 1 ? id : info.get(parent!)!.l1
    info.set(id, { parent, level, path, l1 })
    if (level < 2 || (level === 2 && all.length > DEEPEN_OVER && Date.now() - started < DEEPEN_BUDGET)) {
      const subs = await subcategoryIds('normal', id)
      await pool(subs.map((sid, i) => [sid, i] as const), 4, ([sid, i]) => walk(sid, id, level + 1, [...path, i]))
    }
    for (const pid of all) if (!owner.has(pid)) owner.set(pid, { cat: id, level })
  }
  await walk(topId, null, 0, [])
  const catIds = new Set(info.keys())

  const ids = [...owner.keys()]
  const cards = new Map<number, any>()
  const chunks: number[][] = []
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))
  await pool(chunks, 4, async (c) => {
    for (const card of await productCards(c)) cards.set(card.productId, card)
  })

  const names = new Map((await categoryNames([...catIds])).map((c) => [c.id, c.name]))
  const groups = new Map<number, PartGroup>()
  for (const [pid, o] of owner) {
    const c = cards.get(pid)
    if (!c || c.archived || !c.prices || c.stock?.availabilityStatus === 'UNAVAILABLE') continue
    const p = c.prices
    const original = p.originalPrice ?? 0
    const sale = p.salePrice ?? 0
    if (!sale || !original || original <= sale) continue // jen skutečné akce
    const product: Product = {
      id: pid,
      name: c.name,
      brand: c.brand ?? null,
      image: c.image?.path ?? '',
      amount: c.textualAmount ?? '',
      unit: c.unit ?? '',
      salePrice: sale,
      originalPrice: original,
      discount: 1 - sale / original,
      unitPrice: p.unitPrice ?? 0,
      validTill: p.saleValidTill ?? null,
      badge: p.saleText ?? null,
      maxAmount: c.stock?.maxAvailableAmount ?? 99,
    }
    let g = groups.get(o.cat)
    if (!g) {
      const i = info.get(o.cat)!
      const own = names.get(o.cat) ?? String(o.cat)
      g = {
        id: o.cat,
        name: i.level === 3 ? `${own} · ${names.get(i.parent!) ?? ''}` : own,
        parent: i.level === 0 ? '' : (names.get(i.l1) ?? ''),
        subId: i.l1,
        order: 0,
        products: [],
      }
      groups.set(o.cat, g)
    }
    g.products.push(product)
  }
  // pořadí „v regálu“: lexikograficky podle cesty ve stromu (předek před potomky)
  const cmpPath = (a: number[], b: number[]) => {
    for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) return a[k] - b[k]
    return a.length - b.length
  }
  const list = [...groups.values()].filter((g) => g.products.length)
  list.sort((a, b) => cmpPath(info.get(a.id)!.path, info.get(b.id)!.path))
  list.forEach((g, i) => {
    g.order = i
    g.products.sort((a, b) => normName(a.name).localeCompare(normName(b.name), 'cs') || a.unitPrice - b.unitPrice)
  })
  const part: Part = { topId, schema: SCHEMA, topName: names.get(topId) ?? '', fetchedAt: new Date().toISOString(), groups: list }
  await cache.set(`part-${topId}`, part)
  return part
}

/** Složí akce z cache; hlavní kategorie bez čerstvé cache vrátí v `pending`. */
export async function getDeals(force = false): Promise<Deals> {
  const tops = await topCategories()
  const parts: Part[] = []
  const pending: number[] = []
  for (const t of tops) {
    const part = await cache.get<Part>(`part-${t}`)
    if (part?.schema === SCHEMA) parts.push(part) // cache ve starém formátu (bez pořadí) se nepoužije
    if (force || part?.schema !== SCHEMA || Date.now() - Date.parse(part.fetchedAt) > TTL) pending.push(t)
  }
  // Produkt může být ve více hlavních kategoriích → první výskyt vyhrává.
  const seen = new Set<number>()
  const byId = new Map<number, Group>()
  for (const part of parts)
    for (const raw of part.groups) {
      const g: Group = { ...raw, topId: part.topId, topName: part.topName ?? '', topOrder: tops.indexOf(part.topId) }
      const products = g.products.filter((p) => !seen.has(p.id))
      products.forEach((p) => seen.add(p.id))
      if (!products.length) continue
      const cur = byId.get(g.id)
      if (cur) cur.products.push(...products)
      else byId.set(g.id, { ...g, products })
    }
  const groups = [...byId.values()].sort((a, b) => a.topOrder - b.topOrder || a.order - b.order)
  const times = parts.map((p) => p.fetchedAt).sort()
  return { fetchedAt: times[0] ?? null, total: seen.size, groups, pending }
}
