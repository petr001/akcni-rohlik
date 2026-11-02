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
    <div className="fade fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-md" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="pop w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold">Přihlášení k Rohlíku</h2>
        <p className="mb-4 mt-1 text-sm text-stone-500">Potřebné pro košík. Heslo se pouze přepošle Rohlíku a neukládá se.</p>
        <label className="block text-sm font-medium" htmlFor="username">E-mail</label>
        <input id="username" name="username" type="email" autoComplete="username" required autoFocus
          className="mb-3 mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" />
        <label className="block text-sm font-medium" htmlFor="password">Heslo</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="mb-3 mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" />
        {error && <p className="mb-3 rounded-xl bg-red-100 p-2 text-sm text-red-800">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-full bg-emerald-600 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? 'Přihlašuji…' : 'Přihlásit'}
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-stone-200 px-4 py-2">Zrušit</button>
        </div>
      </form>
    </div>
  )
}
