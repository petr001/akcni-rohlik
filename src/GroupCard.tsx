import { topDeal, type Group } from './types'
import { kc, pct } from './format'
import { Img } from './Img'

interface Props {
  group: Group
  tone?: number // odstín podskupiny (hsl hue)
  first?: boolean // první karta nové podskupiny (jen zvýrazní její štítek)
  onOpen: (rect: DOMRect) => void
}

export function GroupCard({ group, tone, first, onOpen }: Props) {
  const rep = topDeal(group) // produkt s největší slevou
  const n = group.products.length
  return (
    <button
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      // jemné podbarvení celé karty odstínem podskupiny (míchá se s barvou povrchu, takže sedí ve světlém i tmavém tématu)
      style={tone === undefined ? undefined : ({ '--tone': tone, background: 'color-mix(in srgb, var(--surface), hsl(var(--tone) 60% 50%) 13%)' } as React.CSSProperties)}
      className={`group relative flex w-full flex-col overflow-hidden rounded-3xl p-2.5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop active:translate-y-0 active:scale-[.97] ${tone === undefined ? 'bg-surface' : ''}`}
    >
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
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-2.5">
        <div className={`flex h-3.5 items-center gap-1 truncate text-[10.5px] font-semibold uppercase tracking-wider ${first ? 'text-ink' : 'text-muted'}`}>
          {tone !== undefined && group.parent && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'hsl(var(--tone) 55% 50%)' }} />}
          <span className="truncate">{group.parent}</span>
        </div>
        <div className="line-clamp-2 text-[17px] font-bold leading-snug">{group.name}</div>
        <div className="mt-0.5 line-clamp-1 text-[13px] text-muted">{rep.name}</div>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
          <span className="whitespace-nowrap text-lg font-extrabold text-sale">{kc(rep.salePrice)}</span>
          <s className="whitespace-nowrap text-xs text-muted">{kc(rep.originalPrice)}</s>
        </div>
      </div>
    </button>
  )
}
