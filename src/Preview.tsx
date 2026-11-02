import { useLayoutEffect, useRef, useState } from 'react'
import { subgroups, topDeal, type Group } from './types'
import { kc, pct } from './format'

export const PREVIEW_COUNT = 6

interface Props {
  groups: Group[]
  onOpenGroup: (g: Group, rect: DOMRect) => void
  onOpenSection: () => void
}

/** Kompaktní textový náhled sbalené sekce: druhy s největší slevou + „+N dalších“ (jediná zbývající položka se ukáže rovnou). */
export function Preview({ groups, onOpenGroup, onOpenSection }: Props) {
  const grid = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(2)
  // Počet sloupců se čte z vykreslené mřížky, aby limit dlaždic odpovídal řádku (první řádek = dlaždice + „+N“).
  useLayoutEffect(() => {
    const el = grid.current!
    const read = () => setCols(getComputedStyle(el).gridTemplateColumns.split(' ').length)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const base = Math.max(PREVIEW_COUNT, cols - 1)
  const limit = groups.length === base + 1 ? groups.length : base
  // Reprezentanti pokrývají různé podskupiny: z každé podskupiny postupně první, druhá… (kolo za kolem),
  // výsledek se vrátí v pořadí „z regálu“.
  const subs = subgroups(groups)
  const picked = new Set<Group>()
  for (let round = 0; picked.size < limit && round < groups.length; round++)
    for (const sub of subs) if (picked.size < limit && sub.groups[round]) picked.add(sub.groups[round])
  const top = groups.filter((g) => picked.has(g))
  const more = groups.length - top.length
  return (
    <div ref={grid} className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 px-2 pb-4 pt-2">
      {top.map((g) => {
        const rep = topDeal(g)
        return (
          <button
            key={g.id}
            onClick={(e) => onOpenGroup(g, e.currentTarget.getBoundingClientRect())}
            className="flex min-w-0 items-center gap-2 rounded-xl bg-surface px-2.5 py-2 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
          >
            <img
              src={rep.image}
              alt=""
              width={28}
              height={28}
              loading="lazy"
              decoding="async"
              className="h-7 w-7 shrink-0 rounded-md bg-white object-contain"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold leading-tight">{g.name}</span>
            <span className="flex items-center justify-between gap-1">
              <span className="whitespace-nowrap text-[13px] font-extrabold text-sale">{kc(rep.salePrice)}</span>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-sale px-1.5 text-[10px] font-extrabold leading-4 text-sale-ink">{pct(rep.discount)}</span>
            </span>
            </span>
          </button>
        )
      })}
      {more > 0 && (
        <button
          onClick={onOpenSection}
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-line px-2.5 py-2 text-sm font-bold text-muted transition hover:border-accent hover:text-accent active:scale-95"
        >
          +{more} dalších
        </button>
      )}
    </div>
  )
}
