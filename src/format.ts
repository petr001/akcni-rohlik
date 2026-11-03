export const kc = (n: number) =>
  new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n) + ' Kč'
export const pct = (d: number) => `−${Math.round(d * 100)} %`
export const till = (iso: string | null) =>
  iso ? `do ${new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}` : ''

/** Emoji k hlavním kategoriím Rohlíku (hledá se podle klíčového slova v názvu, ať přežije drobnou změnu názvu). */
const ICONS: [string, string][] = [
  ['ovoce', '🥦'], ['mlé', '🥛'], ['maso', '🥩'], ['pekár', '🥐'], ['uzenin', '🥓'], ['bistro', '🥪'],
  ['mraž', '🧊'], ['plant', '🌱'], ['trvanl', '🥫'], ['nápoj', '🥤'], ['speciální', '💪'], ['kosmet', '💄'],
  ['drogerie', '🧴'], ['domácnost', '🏡'], ['dítě', '🍼'], ['zvíře', '🐾'], ['marks', '🛍️'],
]
export const categoryIcon = (name: string) => ICONS.find(([k]) => name.toLowerCase().includes(k))?.[1] ?? ''

/** Bez diakritiky a malými písmeny – „Šulánky“ = „sulanky“. */
export const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
