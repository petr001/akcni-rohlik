export interface Product {
  id: number
  name: string
  brand: string | null
  image: string
  amount: string
  unit: string
  salePrice: number
  originalPrice: number
  discount: number
  unitPrice: number
  validTill: string | null
  badge: string | null
  maxAmount: number
}
export interface Group {
  id: number
  name: string
  parent: string // název podskupiny (nadřazená kategorie Rohlíku)
  subId: number
  order: number
  products: Product[]
  topId: number
  topName: string
  topOrder: number
}
export interface Deals {
  fetchedAt: string | null
  total: number
  groups: Group[]
  pending: number[]
}
export interface Cart {
  totalPrice: number
  count: number
  quantities: Record<string, number>
}

/** Produkt s největší slevou – reprezentant druhu na kartě (produkty ve skupině jsou řazené logicky, ne podle slevy). */
export const topDeal = (g: Group): Product => g.products.reduce((a, b) => (b.discount > a.discount ? b : a))

/** Souvislé úseky karet se stejnou podskupinou (server je řadí tak, že podskupiny jsou u sebe). */
export function subgroups(groups: Group[]): { subId: number; title: string; groups: Group[] }[] {
  const out: { subId: number; title: string; groups: Group[] }[] = []
  for (const g of groups) {
    const last = out[out.length - 1]
    if (last && last.subId === g.subId) last.groups.push(g)
    else out.push({ subId: g.subId, title: g.parent, groups: [g] })
  }
  return out
}
