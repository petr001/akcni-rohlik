import type { Group } from './types'
import { kc, pct } from './format'

export function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  const rep = group.products[0] // největší sleva
  const n = group.products.length
  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col rounded-3xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[.98]"
    >
      {n > 1 && <div className="absolute inset-x-4 -bottom-1.5 -z-10 h-3 rounded-b-2xl bg-white/70" />}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-50">
        <img src={rep.image} alt="" loading="lazy" className="h-full w-full object-contain" />
        <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          {pct(rep.discount)}
        </span>
        <span className="absolute bottom-2 right-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-xs font-semibold text-white">
          {n} v akci
        </span>
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wide text-stone-400">{group.parent || ' '}</div>
      <div className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight">{group.name}</div>
      <div className="mt-1 text-sm text-stone-600">
        {rep.name.length > 40 ? rep.name.slice(0, 38) + '…' : rep.name}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-bold text-red-600">{kc(rep.salePrice)}</span>
        <s className="text-xs text-stone-400">{kc(rep.originalPrice)}</s>
      </div>
    </button>
  )
}
