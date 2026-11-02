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
  parent: string
  products: Product[]
  topId: number // hlavní kategorie Rohlíku
  topName: string
  topOrder: number // pořadí hlavní kategorie na Rohlíku
}

type PartGroup = Omit<Group, 'topId' | 'topName' | 'topOrder'>

/** Akce jedné hlavní kategorie – stahuje se zvlášť, aby se vešlo do limitu funkce (~10 s). */
export interface Part {
  topId: number
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

const TTL = 60 * 60 * 1000

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const q = [...items]
  await Promise.all(Array.from({ length: n }, async () => { for (let x; (x = q.shift()) !== undefined; ) await fn(x) }))
}

export async function topCategories(): Promise<number[]> {
  const cached = await cache.get<{ ids: number[]; at: number }>('top')
  if (cached && Date.now() - cached.at < 24 * TTL) return cached.ids
  const ids = await subcategoryIds('sales')
  await cache.set('top', { ids, at: Date.now() })
  return ids
}

/** Stáhne a zacachuje akce jedné hlavní kategorie. */
export async function buildPart(topId: number): Promise<Part> {
  // Produkt patří do nejhlubšího uzlu (úroveň 2: kategorie → podkategorie → druh), kde je v akci.
  const owner = new Map<number, { cat: number; parentCat: number | null }>()
  const catIds = new Set<number>()
  const parentOf = new Map<number, number | null>()

  async function walk(id: number, parent: number | null, level: number) {
    const all = await saleProductIds(id)
    if (!all.length) return
    catIds.add(id)
    parentOf.set(id, parent)
    if (level < 2) {
      const subs = await subcategoryIds('normal', id)
      await pool(subs, 4, (s) => walk(s, id, level + 1))
    }
    for (const pid of all) if (!owner.has(pid)) owner.set(pid, { cat: id, parentCat: parent })
  }
  await walk(topId, null, 0)

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
      g = {
        id: o.cat,
        name: names.get(o.cat) ?? String(o.cat),
        parent: o.parentCat === null ? '' : (names.get(parentOf.get(o.cat)!) ?? ''),
        products: [],
      }
      groups.set(o.cat, g)
    }
    g.products.push(product)
  }
  const list = [...groups.values()].filter((g) => g.products.length)
  const part: Part = { topId, topName: names.get(topId) ?? '', fetchedAt: new Date().toISOString(), groups: list }
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
    if (part) parts.push(part)
    if (force || !part || part.topName === undefined || Date.now() - Date.parse(part.fetchedAt) > TTL) pending.push(t)
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
  const groups = [...byId.values()]
  for (const g of groups) g.products.sort((a, b) => b.discount - a.discount)
  groups.sort((a, b) => b.products.length - a.products.length)
  const times = parts.map((p) => p.fetchedAt).sort()
  return { fetchedAt: times[0] ?? null, total: seen.size, groups, pending }
}
