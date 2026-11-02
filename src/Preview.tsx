import type { Group } from './types'
import { kc, pct } from './format'
import { Img } from './Img'

export const PREVIEW_COUNT = 6

interface Props {
  groups: Group[]
  onOpenGroup: (g: Group, rect: DOMRect) => void
  onOpenSection: () => void
}

/** Kompaktní náhled sbalené sekce: druhy s největší slevou + „+N dalších“. */
export function Preview({ groups, onOpenGroup, onOpenSection }: Props) {
  const top = [...groups].sort((a, b) => b.products[0].discount - a.products[0].discount).slice(0, PREVIEW_COUNT)
  const more = groups.length - top.length
  return (
    <div className="grid grid-cols-4 gap-2.5 px-1 pb-4 pt-1 sm:grid-cols-7">
      {top.map((g) => {
        const rep = g.products[0]
        return (
          <button
            key={g.id}
            onClick={(e) => onOpenGroup(g, e.currentTarget.getBoundingClientRect())}
            className="group relative flex min-w-0 flex-col rounded-2xl bg-surface p-1.5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop active:scale-95"
          >
            <div className="relative">
              <Img src={rep.image} className="aspect-square rounded-xl" />
              <span className="absolute left-1 top-1 rounded-full bg-sale px-1.5 text-[10px] font-extrabold leading-4 text-sale-ink">
                {pct(rep.discount)}
              </span>
            </div>
            <div className="mt-1.5 truncate px-0.5 text-[12px] font-semibold leading-tight">{g.name}</div>
            <div className="px-0.5 text-[12px] font-extrabold text-sale">{kc(rep.salePrice)}</div>
          </button>
        )
      })}
      {more > 0 && (
        <button
          onClick={onOpenSection}
          className="flex min-h-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-line text-sm font-bold text-muted transition hover:border-accent hover:text-accent active:scale-95"
        >
          <span className="text-lg">+{more}</span>
          <span className="text-[11px] font-medium">dalších</span>
        </button>
      )}
    </div>
  )
}
