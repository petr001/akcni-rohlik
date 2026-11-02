import type { Group } from './types'
import { kc, pct } from './format'

export const PREVIEW_COUNT = 6

interface Props {
  groups: Group[]
  onOpenGroup: (g: Group, rect: DOMRect) => void
  onOpenSection: () => void
}

/** Kompaktní textový náhled sbalené sekce: druhy s největší slevou + „+N dalších“ (jediná zbývající položka se ukáže rovnou). */
export function Preview({ groups, onOpenGroup, onOpenSection }: Props) {
  const sorted = [...groups].sort((a, b) => b.products[0].discount - a.products[0].discount)
  const limit = groups.length === PREVIEW_COUNT + 1 ? groups.length : PREVIEW_COUNT
  const top = sorted.slice(0, limit)
  const more = groups.length - top.length
  return (
    <div className="grid grid-cols-2 gap-2 px-2 pb-4 pt-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {top.map((g) => {
        const rep = g.products[0]
        return (
          <button
            key={g.id}
            onClick={(e) => onOpenGroup(g, e.currentTarget.getBoundingClientRect())}
            className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface px-2.5 py-2 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
          >
            <span className="truncate text-[13px] font-semibold leading-tight">{g.name}</span>
            <span className="flex items-center justify-between gap-1">
              <span className="whitespace-nowrap text-[13px] font-extrabold text-sale">{kc(rep.salePrice)}</span>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-sale px-1.5 text-[10px] font-extrabold leading-4 text-sale-ink">{pct(rep.discount)}</span>
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
