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
  parent: string
  products: Product[]
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
