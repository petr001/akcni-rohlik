import { useMemo, useState } from 'react'
import type { Group, Product } from './types'
import { matchList, parseList, type Hit, type Match } from './listMatch'
import { ProductCard } from './ProductCard'

const LIST_KEY = 'fast-rohlik:list'
const PICKS_KEY = 'fast-rohlik:picks'
const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {}
}

const PLACEHOLDER = `Vlož nákupní seznam, třeba:
pomeranče, mandarinky
2x mléko
- cukety
baterie AAA`

interface Props {
  groups: Group[]
  quantities: Record<string, number>
  busyId: number | null
  addedId: number | null
  onAdd: (p: Product) => void
  onAddAll: (items: { p: Product; qty: number }[]) => void
}

/** Nákupní seznam: vložený text → u každé položky nejlepší akční produkt + alternativy (párování v listMatch.ts). */
export function ShoppingList({ groups, quantities, busyId, addedId, onAdd, onAddAll }: Props) {
  const [text, setText] = useState(() => read(LIST_KEY, ''))
  const [picks, setPicks] = useState<Record<string, number>>(() => read(PICKS_KEY, {}))
  const matches = useMemo(() => matchList(parseList(text), groups, picks), [text, groups, picks])

  const changeText = (v: string) => {
    setText(v)
    write(LIST_KEY, v)
  }
  const choose = (m: Match, p: Product | null) => {
    const next = { ...picks }
    if (p) next[m.item.key] = p.id
    else delete next[m.item.key]
    setPicks(next)
    write(PICKS_KEY, next)
  }

  const found = matches.filter((m) => !m.weak && m.best)
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,340px)_1fr] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <textarea
          value={text}
          onChange={(e) => changeText(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Nákupní seznam"
          rows={10}
          className="w-full resize-y rounded-2xl border border-line bg-surface p-3.5 text-[15px] leading-relaxed shadow-card placeholder:text-muted lg:min-h-[60vh]"
        />
        <p className="mt-2 text-xs text-muted">
          Jedna položka na řádek nebo oddělené čárkou. Párují se jen produkty v akci; zvolená alternativa se zapamatuje.
        </p>
        {found.length > 0 && (
          <button
            onClick={() => onAddAll(found.map((m) => ({ p: m.best!.p, qty: m.item.qty })))}
            disabled={busyId !== null}
            className="mt-3 h-10 w-full rounded-full bg-accent px-4 text-sm font-bold text-accent-ink shadow-md transition active:scale-95 disabled:opacity-60"
          >
            Přidat do košíku vše nalezené ({found.length})
          </button>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {matches.length === 0 && <p className="py-10 text-center text-muted">Vlož seznam vlevo – položky se napárují na akce hned.</p>}
        {matches.map((m, i) => (
          <Row key={`${i}-${m.item.key}`} m={m} quantities={quantities} busyId={busyId} addedId={addedId} onAdd={onAdd} onChoose={(p) => choose(m, p)} />
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  m: Match
  quantities: Record<string, number>
  busyId: number | null
  addedId: number | null
  onAdd: (p: Product) => void
  onChoose: (p: Product | null) => void
}

function Row({ m, quantities, busyId, addedId, onAdd, onChoose }: RowProps) {
  const [showMaybe, setShowMaybe] = useState(false)
  const search = `https://www.rohlik.cz/hledat?q=${encodeURIComponent(m.item.text)}`
  const hits: Hit[] = m.best ? [m.best, ...m.alts] : []
  const visible = !m.weak || showMaybe
  const card = (h: Hit, best: boolean) => (
    <div key={h.p.id} className={`flex w-40 shrink-0 flex-col gap-1 sm:w-44 ${best && !m.weak ? 'rounded-[1.1rem] ring-2 ring-accent' : ''}`}>
      <ProductCard p={h.p} inCart={quantities[h.p.id] ?? 0} busy={busyId === h.p.id} added={addedId === h.p.id} onAdd={onAdd} />
      {best && m.picked ? (
        <button onClick={() => onChoose(null)} className="pb-1 text-xs font-semibold text-accent hover:underline">
          ✓ zapamatováno · zrušit
        </button>
      ) : !best || m.weak ? (
        <button onClick={() => onChoose(h.p)} className="pb-1 text-xs font-semibold text-muted hover:text-accent">
          Použít tenhle
        </button>
      ) : null}
    </div>
  )
  return (
    <section className="rounded-2xl border border-line bg-surface-2/40 p-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
        <h3 className="text-base font-extrabold">{m.item.text}</h3>
        {m.item.qty > 1 && <span className="rounded-full bg-surface-2 px-2 text-xs font-bold">{m.item.qty}×</span>}
        {!m.weak && m.best && <span className="truncate text-xs text-muted">{m.best.g.name}</span>}
        {m.weak && (
          <span className="text-sm text-muted">
            v akci není ·{' '}
            <a href={search} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
              hledat na Rohlíku ↗
            </a>
            {hits.length > 0 && (
              <>
                {' · '}
                <button onClick={() => setShowMaybe((v) => !v)} aria-expanded={showMaybe} className="font-semibold text-ink hover:text-accent">
                  možná ({hits.length}) {showMaybe ? '▴' : '▾'}
                </button>
              </>
            )}
          </span>
        )}
      </div>
      {visible && hits.length > 0 && (
        <div className={`chips-scroll -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 pt-1 ${m.weak ? 'opacity-80' : ''}`}>
          {hits.map((h, k) => card(h, k === 0))}
        </div>
      )}
    </section>
  )
}
