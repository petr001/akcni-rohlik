import { Hono, type Context } from 'hono'
import { buildPart, getDeals, topCategories } from './deals.js'
import { Session } from './rohlik.js'
import { clearSession, readSession, saveSession } from './session.js'

/**
 * Jediná Hono app: lokálně ji servíruje server/dev.ts, na Vercelu api/index.ts.
 * Žádný sdílený stav v paměti – session k Rohliku se vytváří při každém požadavku na košík.
 */
export const app = new Hono().basePath('/api')

// Místo pro pozdější ochranu appky: nastav APP_PASSWORD (HTTP Basic, libovolné uživatelské jméno)
// nebo použij Vercel Authentication. Bez APP_PASSWORD je appka otevřená (jen localhost).
app.use('*', async (c, next) => {
  const pw = process.env.APP_PASSWORD
  if (!pw) return next()
  const auth = c.req.header('authorization') ?? ''
  const given = auth.startsWith('Basic ') ? atob(auth.slice(6)).split(':').slice(1).join(':') : ''
  if (given !== pw) return c.json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Basic realm="Fast Rohlik"' })
  return next()
})

app.onError((e, c) => c.json({ error: e.message }, ((e as any).status ?? 502) as 502))

function requireLogin(c: Context) {
  const s = readSession(c)
  if (!s) throw Object.assign(new Error('Pro košík se přihlas.'), { status: 401 })
  return s
}

async function cartSummary(s: Session) {
  const r = await s.req('/services/frontend-service/v2/cart')
  const quantities: Record<string, number> = {}
  for (const [id, it] of Object.entries<any>(r.data?.items ?? {})) quantities[id] = it.quantity ?? 0
  return {
    totalPrice: r.data?.totalPrice ?? 0,
    count: Object.values(quantities).reduce((a, b) => a + b, 0),
    quantities,
  }
}

// Akce jsou na Rohlíku veřejné → bez přihlášení. Stahují se po hlavních kategoriích (limit funkce ~10 s).
app.get('/deals', async (c) => c.json(await getDeals(c.req.query('refresh') === '1')))
app.post('/deals/part/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!(await topCategories()).includes(id)) return c.json({ error: 'Neznámá kategorie' }, 404)
  const part = await buildPart(id)
  return c.json({ topId: id, groups: part.groups.length })
})

app.get('/me', (c) => {
  const s = readSession(c)
  return c.json({ loggedIn: !!s, email: s?.email ?? null })
})

app.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password)
    return c.json({ error: 'Vyplň e-mail a heslo.' }, 400)
  const s = new Session()
  try {
    await s.login(email.trim(), password)
  } catch (e: any) {
    // Heslo se nikam neloguje.
    if (e.status === 401 || e.status === 403 || e.status === 400)
      return c.json({ error: 'Rohlík přihlášení odmítl – zkontroluj e-mail a heslo (účet může vyžadovat i další ověření přímo na rohlik.cz).' }, 401)
    return c.json({ error: `Přihlášení k Rohlíku se nepovedlo: ${e.message}` }, 502)
  }
  saveSession(c, s, email.trim())
  return c.json({ loggedIn: true, email: email.trim() })
})

app.post('/logout', (c) => {
  clearSession(c)
  return c.json({ loggedIn: false })
})

app.get('/cart', async (c) => c.json(await cartSummary(requireLogin(c).session)))
app.post('/cart', async (c) => {
  const { session } = requireLogin(c)
  const { productId, quantity = 1 } = await c.req.json().catch(() => ({}))
  if (!Number.isInteger(productId)) return c.json({ error: 'productId' }, 400)
  await session.req('/services/frontend-service/v2/cart', {
    method: 'POST',
    body: JSON.stringify({ actionId: null, productId, quantity, recipeId: null, source: 'true:Shopping Lists' }),
  })
  return c.json(await cartSummary(session))
})
