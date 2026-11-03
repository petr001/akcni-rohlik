import { Hono } from 'hono'
import { buildPart, getDeals, topCategories } from './deals.js'

/**
 * Jediná Hono app: lokálně ji servíruje server/dev.ts, na Vercelu api/index.ts.
 * Žádný sdílený stav v paměti. Košík je jen v prohlížeči; do Rohlíku ho vloží bookmarklet přímo na rohlik.cz.
 */
export const app = new Hono().basePath('/api')

// Místo pro pozdější ochranu appky: nastav APP_PASSWORD (HTTP Basic, libovolné uživatelské jméno)
// nebo použij Vercel Authentication. Bez APP_PASSWORD je appka otevřená (jen localhost).
app.use('*', async (c, next) => {
  const pw = process.env.APP_PASSWORD
  if (!pw) return next()
  const auth = c.req.header('authorization') ?? ''
  const given = auth.startsWith('Basic ') ? atob(auth.slice(6)).split(':').slice(1).join(':') : ''
  if (given !== pw) return c.json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Basic realm="Akcni Rohlik"' })
  return next()
})

app.onError((e, c) => c.json({ error: e.message }, ((e as any).status ?? 502) as 502))

// Akce jsou na Rohlíku veřejné. Stahují se po hlavních kategoriích (limit funkce ~10 s).
app.get('/deals', async (c) => c.json(await getDeals(c.req.query('refresh') === '1')))
app.post('/deals/part/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!(await topCategories()).includes(id)) return c.json({ error: 'Neznámá kategorie' }, 404)
  const part = await buildPart(id)
  return c.json({ topId: id, groups: part.groups.length })
})
