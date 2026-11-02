import { useState, type FormEvent } from 'react'

interface Props {
  onDone: (email: string) => void
  onClose: () => void
}

/** Standardní pole username/current-password, aby je vyplnil správce hesel (Touch ID). */
export function LoginForm({ onDone, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.get('username'), password: f.get('password') }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      onDone(j.email)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fade fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-md" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="pop-in w-full max-w-sm rounded-3xl bg-surface p-6 shadow-pop ring-1 ring-line">
        <h2 className="text-lg font-bold">Přihlášení k Rohlíku</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Potřebné pro košík. Heslo se pouze přepošle Rohlíku a neukládá se.</p>
        <label className="block text-sm font-medium" htmlFor="username">E-mail</label>
        <input id="username" name="username" type="email" autoComplete="username" required autoFocus
          className="mb-3 mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5" />
        <label className="block text-sm font-medium" htmlFor="password">Heslo</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="mb-3 mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5" />
        {error && <p className="mb-3 rounded-xl bg-sale/15 p-2 text-sm text-sale">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-full bg-accent py-2.5 font-bold text-accent-ink transition active:scale-95 disabled:opacity-50">
            {busy ? 'Přihlašuji…' : 'Přihlásit'}
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-2 px-4 py-2.5">Zrušit</button>
        </div>
      </form>
    </div>
  )
}
