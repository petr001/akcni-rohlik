import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { Session } from './rohlik.js'

const NAME = 'fr_session'
const MAX_AGE = 60 * 60 * 12 // 12 h

interface Payload {
  c: Record<string, string> // cookies Rohlíku
  email: string
  exp: number
}

function key() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) throw Object.assign(new Error('Chybí SESSION_SECRET v .env (min. 16 znaků)'), { status: 503 })
  return createHash('sha256').update(secret).digest()
}

// AES-256-GCM: cookie je šifrované i podepsané, session Rohlíku z něj nejde přečíst ani upravit.
function seal(p: Payload) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(JSON.stringify(p), 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url')
}

function open(token: string): Payload | null {
  try {
    const b = Buffer.from(token, 'base64url')
    const d = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12))
    d.setAuthTag(b.subarray(12, 28))
    const p = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')) as Payload
    return p.exp > Date.now() ? p : null
  } catch {
    return null
  }
}

export function saveSession(c: Context, s: Session, email: string) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(c.req.url).hostname)
  setCookie(c, NAME, seal({ c: s.exportCookies(), email, exp: Date.now() + MAX_AGE * 1000 }), {
    httpOnly: true,
    secure: !local,
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export const clearSession = (c: Context) => deleteCookie(c, NAME, { path: '/' })

export function readSession(c: Context): { session: Session; email: string } | null {
  const t = getCookie(c, NAME)
  const p = t && open(t)
  return p ? { session: new Session(p.c), email: p.email } : null
}
