import type { Group } from './types'
import { kc, pct } from './format'
import { Img } from './Img'

interface Props {
  group: Group
  index: number
  onOpen: (rect: DOMRect) => void
}

export function GroupCard({ group, index, onOpen }: Props) {
  const rep = group.products[0] // největší sleva
  const n = group.products.length
  return (
    <button
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      style={{ '--i': Math.min(index, 10) } as React.CSSProperties}
      className="rise group relative flex flex-col rounded-3xl bg-surface p-2.5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop active:translate-y-0 active:scale-[.97]"
    >
      {n > 1 && <span aria-hidden className="absolute inset-x-5 -bottom-1.5 -z-10 h-4 rounded-b-3xl bg-line/70" />}
      <div className="relative">
        <Img src={rep.image} className="aspect-square rounded-2xl [&_img]:transition-transform [&_img]:duration-300 group-hover:[&_img]:scale-105" />
        <span className="absolute left-2 top-2 rounded-full bg-sale px-2.5 py-0.5 text-xs font-extrabold text-sale-ink shadow">
          {pct(rep.discount)}
        </span>
        {n > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/85 px-2.5 py-0.5 text-xs font-semibold text-bg backdrop-blur">
            {n} v akci
          </span>
        )}
      </div>
      <div className="px-1.5 pb-1 pt-2.5">
        <div className="h-3.5 truncate text-[10.5px] font-semibold uppercase tracking-wider text-muted">{group.parent}</div>
        <div className="line-clamp-2 min-h-[2.6rem] text-[17px] font-bold leading-snug">{group.name}</div>
        <div className="mt-1 line-clamp-1 text-[13px] text-muted">{rep.name}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-sale">{kc(rep.salePrice)}</span>
          <s className="text-xs text-muted">{kc(rep.originalPrice)}</s>
        </div>
      </div>
    </button>
  )
}
