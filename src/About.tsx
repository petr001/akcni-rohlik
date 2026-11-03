type Credit = { name: string; href: string; note: string }

const ROHLIK_PROJECTS: Credit[] = [
  {
    name: 'dvejsada/rohlik_api_python',
    href: 'https://github.com/dvejsada/rohlik_api_python',
    note: 'Asynchronní Python klient k neveřejnému API Rohlíku (košík, vyhledávání, detail produktu) – inspirace pro podobu endpointů.',
  },
  {
    name: 'xuio/HA-RohlikCZ',
    href: 'https://github.com/xuio/HA-RohlikCZ',
    note: 'Integrace pro Home Assistant, vzniklá reverzním inženýrstvím API webu rohlik.cz.',
  },
  {
    name: '@tomaspavlin/rohlik-mcp',
    href: 'https://www.npmjs.com/package/@tomaspavlin/rohlik-mcp',
    note: 'MCP server pro AI asistenty nad Rohlíkem (npm).',
  },
]

function List({ items }: { items: Credit[] }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((c) => (
        <li key={c.name} className="rounded-2xl bg-surface p-3.5 shadow-card">
          <a href={c.href} target="_blank" rel="noreferrer" className="font-bold text-accent hover:underline">
            {c.name}
          </a>
          <p className="text-sm text-muted">{c.note}</p>
        </li>
      ))}
    </ul>
  )
}

export function About({ onClose }: { onClose: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <button onClick={onClose} className="mb-5 h-9 rounded-full bg-surface-2 px-3.5 text-sm font-semibold transition active:scale-95">
        ← Zpět na akce
      </button>
      <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
        <img src="/logo.svg" alt="" className="h-10 w-10" /> O aplikaci
      </h1>
      <p className="mt-3 text-muted">
        Akční Rohlík je osobní appka pro rychlejší procházení akčních produktů na rohlik.cz. S Rohlíkem (Rohlik Group) nijak
        nesouvisí a není jím schválená ani podporovaná.
      </p>

      <h2 className="mb-3 mt-8 text-xl font-extrabold">Rohlík a jeho API</h2>
      <p className="mb-3 text-sm text-muted">
        Data (akce, ceny, obrázky) patří Rohlíku a pocházejí z jeho webu. Appka používá stejné neveřejné endpointy jako web;
        tyto open-source projekty mapují totéž API a díky nim je jednodušší se v něm vyznat:
      </p>
      <List items={ROHLIK_PROJECTS} />

      <h2 className="mb-3 mt-8 text-xl font-extrabold">Upozornění</h2>
      <p className="text-sm text-muted">
        API Rohlíku není oficiální a může se kdykoli změnit. Podmínky Rohlíku povolují využití jen k lepšímu nakupování na
        rohlik.cz. Appku používej jen osobně a nezatěžuj Rohlík zbytečnými požadavky. Všechny názvy a značky patří jejich
        vlastníkům.
      </p>
    </div>
  )
}
