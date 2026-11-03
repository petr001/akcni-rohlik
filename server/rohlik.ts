// Tenký klient neoficiálního REST API webu rohlik.cz (reverse engineering, viz README).
const BASE = 'https://www.rohlik.cz'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export class Session {
  private cookies = new Map<string, string>()

  private active = 0
  private waiting: (() => void)[] = []

  /** Max 4 souběžné požadavky + opakování při 429/výpadku spojení. */
  async req<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    while (this.active >= 4) await new Promise<void>((r) => this.waiting.push(r))
    this.active++
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await this.once<T>(path, init)
        } catch (e: any) {
          const retry = attempt < 4 && (e.status === 429 || e.status >= 500 || e.status === undefined)
          if (!retry) throw e
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
        }
      }
    } finally {
      this.active--
      this.waiting.shift()?.()
    }
  }

  private async once<T>(path: string, init: RequestInit): Promise<T> {
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    const res = await fetch(BASE + path, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': UA,
        Origin: BASE,
        Referer: BASE + '/',
        ...(cookie && { Cookie: cookie }),
        ...(init.headers as Record<string, string>),
      },
    })
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';')
      const i = kv.indexOf('=')
      this.cookies.set(kv.slice(0, i).trim(), kv.slice(i + 1))
    }
    const text = await res.text()
    if (!res.ok) {
      let msg = ''
      try { msg = JSON.parse(text)?.messages?.[0]?.content ?? '' } catch {}
      throw Object.assign(new Error(msg || `Rohlik ${res.status} ${path}`), { status: res.status, rohlik: true })
    }
    return (text ? JSON.parse(text) : {}) as T
  }
}

export const anon = new Session()

export interface Category {
  id: number
  name: string
  slug: string
}

export async function subcategoryIds(type: 'normal' | 'sales', id?: number): Promise<number[]> {
  const r = await anon.req(`/api/v1/categories/${type}${id ? `/${id}` : ''}/subcategories`)
  return r.categoryIds ?? []
}

export async function categoryNames(ids: number[]): Promise<Category[]> {
  const out: Category[] = []
  for (let i = 0; i < ids.length; i += 20) {
    const q = ids.slice(i, i + 20).map((x) => `categories=${x}`).join('&')
    const r = await anon.req<any[]>(`/api/v1/categories?${q}&type=normal`)
    for (const c of r) out.push({ id: c.categoryId, name: c.name, slug: c.slug })
  }
  return out
}

/** ID všech produktů v akci v dané kategorii (bez id = celý Rohlík). */
export async function saleProductIds(categoryId?: number): Promise<number[]> {
  const ids: number[] = []
  for (let page = 0; page < 60; page++) {
    const r = await anon.req(
      `/api/v1/categories/sales${categoryId ? `/${categoryId}` : ''}/products?page=${page}&size=100&sort=recommended&filter=&excludeProductIds=`,
    )
    const got: number[] = r.productIds ?? []
    ids.push(...got)
    if (got.length < 100) break
  }
  return ids
}

export async function productCards(ids: number[]): Promise<any[]> {
  const out: any[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const q = ids.slice(i, i + 50).map((x) => `products=${x}`).join('&')
    const r = await anon.req<any[]>(`/api/v1/products/card?${q}&categoryType=sales`)
    out.push(...r)
  }
  return out
}
