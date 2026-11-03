import type { Group, Product } from './types'
import { norm } from './format'

/**
 * Nákupní seznam: vložený text → položky → nejlepší akční produkt + alternativy.
 * Páruje se jen proti akcím, které už má klient (žádné další požadavky na Rohlík).
 */

export interface Item {
  text: string // očištěný text položky (bez odrážky a množství), zobrazuje se a je klíčem paměti voleb
  key: string
  qty: number
  tokens: string[] // kmeny slov
  forms: string[] // původní tvary slov (bez diakritiky) – přesná shoda tvaru („mandarinky“ = „Mandarinky“) je bonus
  line: number // položky ze stejného řádku („pomeranče, mandarinky“) si navzájem napoví kategorii
}

export interface Hit {
  p: Product
  g: Group
  score: number
  strong: boolean // aspoň jedno slovo je „hlava“ názvu nebo sedí na druh, a žádné není jen příchuť
  lead: boolean // název začíná hledaným slovem – produkt je ta věc sama, ne značkový výrobek s příchutí
}

export interface Match {
  item: Item
  best: Hit | null
  alts: Hit[]
  weak: boolean // jen slabá shoda (příchuť, přísada, jiná kategorie než sousedé na řádku) → spíš „v akci není“
  picked: boolean // nejlepší shoda je zapamatovaná volba
}

const STOP = new Set(['s', 'se', 'na', 'do', 'bez', 'pro', 'a', 'i', 'k', 'ke', 'v', 've', 'z', 'ze', 'od', 'nebo', 'cca'])
const BULLET = /^\s*(?:[-–—•*·▪◦+>]|\[[ xX✓]?\]|[☐☑✓✔]|\d+[.)](?=\s))\s*/
const UNIT = '(?:kg|g|dkg|dag|ml|cl|dl|l|ks|bal|baleni|balení|x|×)'
const LEAD_QTY = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${UNIT}?\\.?\\s+`, 'i')
const TAIL_QTY = new RegExp(`\\s+(?:[x×]\\s*)?(\\d+(?:[.,]\\d+)?)\\s*${UNIT}?\\.?$`, 'i')
const PIECES = /^(?:ks|x|×|bal|baleni|balení)?$/i

/** Koncovky pro hrubý „stemming“ češtiny (nejdelší první). */
const ENDINGS = ['ami', 'ech', 'ach', 'ove', 'ova', 'ovy', 'ky', 'ek', 'ka', 'ce', 'ou', 'e', 'y', 'a', 'u', 'i', 'o']
/** Přídavná jména z podstatných („pomerančová“, „jahodový“) – typicky příchuť, ne samotná věc. */
const ADJ = /(?:ov[aeyi]|ovou|oveho|ovych|ovym)$/
/** Obecnější přídavná jména před podstatným („Bramborové šulánky“, „instantní káva“, „alpská sůl“). */
const ADJ_ANY = /(?:ov[aeyi]|n[aeiy]|sk[aeiy]|ck[aeiy]|c[ei])$/
/** Slova, za kterými následuje příchuť/přísada: „čokoláda s pomerančem“, „s příchutí jahody“. */
const FLAVOUR = new Set(['s', 'se', 'prichuti', 'prichut', 'a'])

export function stem(w: string): string {
  if (/\d/.test(w)) return w // AAA, 9V, CR2032 přesně
  // delší koncovka chce delší kmen („lilek“ ≠ „lil-ie“, „vejce“ → „vejc“), jednopísmenná stačí na 3 („sýry“ → „syr“)
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= (e.length > 1 ? 4 : 3)) return w.slice(0, -e.length)
  return w
}

const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean)

export function parseList(text: string): Item[] {
  const out: Item[] = []
  for (const [n, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.replace(BULLET, '').trim()
    if (!line || line.endsWith(':')) continue // prázdné řádky a nadpisy („Ovoce:“)
    for (let part of line.split(/[,;]|\s+\+\s+|\s+a\s+|\s+&\s+/i)) {
      part = part.replace(BULLET, '').trim()
      let qty = 1
      for (const re of [LEAD_QTY, TAIL_QTY]) {
        const m = part.match(re)
        if (!m) continue
        // „2x mléko“, „mléko 3 ks“ → počet kusů; „1 kg“, „500 g“ jen zahodíme
        const unit = m[0].replace(/[\d.,\s]/g, '')
        if (PIECES.test(unit) && Number.isInteger(+m[1])) qty = Math.max(1, Math.min(20, +m[1]))
        part = part.replace(re, ' ').trim()
      }
      const forms = words(part).filter((w) => !STOP.has(w) && !/^\d+$/.test(w))
      if (!forms.length) continue
      const tokens = forms.map(stem)
      out.push({ text: part, key: tokens.join(' '), qty, tokens, forms, line: n })
    }
  }
  return out
}

/** Síla shody kmene se slovem: 2 = plná (jen koncovka), 1 = slabá (delší slovo se stejným začátkem), 0 = nic. */
function strength(t: string, w: string): number {
  if (!w.startsWith(t)) return 0
  const rest = w.length - t.length
  if (rest <= 3) return 2
  return t.length >= 5 ? 1 : 0
}

interface Indexed {
  p: Product
  g: Group
  name: string[]
  cat: string[]
  kind: string // kmeny vlastního názvu druhu („Sůl“, „Brambory“) – shoda celé položky s druhem je silný signál
}

const indexCache = new WeakMap<Group[], Indexed[]>()
function index(groups: Group[]): Indexed[] {
  let idx = indexCache.get(groups)
  if (!idx) {
    idx = []
    for (const g of groups) {
      const cat = words(`${g.name} ${g.parent}`)
      const kind = words(g.name.split(' · ')[0]).map(stem).join(' ')
      for (const p of g.products) idx.push({ p, g, name: words(p.name), cat, kind })
    }
    indexCache.set(groups, idx)
  }
  return idx
}

function score(item: Item, x: Indexed): { score: number; strong: boolean; lead: boolean } | null {
  // „Hlava“ názvu = první podstatné jméno: před ním je nanejvýš značka (první slovo, `brand` z API chodí prázdný)
  // a přídavná jména („Rajčata oválná“, „Forky's Bramborové šulánky“, ale ne „Lindt Čokoláda s pomerančem“).
  const isHead = (i: number) => x.name.slice(1, i).every((w) => STOP.has(w) || /^\d/.test(w) || ADJ_ANY.test(w))
  let total = 0
  let strong = false
  let flavour = false
  let lead = false
  item.tokens.forEach((t, k) => {
    let best = -Infinity
    let bestHead = false
    let bestFlavour = false
    x.name.forEach((w, i) => {
      const s = strength(t, w)
      if (!s) return
      const head = isHead(i)
      const fl = FLAVOUR.has(x.name[i - 1]) || (ADJ.test(w) && !ADJ.test(t))
      // název začínající hledaným slovem je ta věc sama („Mandarinky – bedýnka“, „Rajčata oválná“)
      const v = (s === 2 ? 10 : 4) + (head ? 8 : 0) + (i === 0 ? 4 : 0) + (w === item.forms[k] ? 3 : 0) - (fl ? 9 : 0)
      if (v > best) [best, bestHead, bestFlavour] = [v, head, fl]
      if (i === 0 && s === 2) lead = true
    })
    const inCat = x.cat.some((w) => strength(t, w) === 2)
    if (best === -Infinity && !inCat) {
      total = -Infinity // každé slovo položky musí někde sedět
      return
    }
    // silná shoda chce slovo v názvu: buď jako hlavu, nebo kdekoli + druh („Varta Energy AAA baterie“ v Baterie…);
    // samotný druh nestačí (ZON Oranž v „Pomeranč a mandarinka“)
    if ((bestHead && !bestFlavour) || (best > -Infinity && inCat)) strong = true
    if (bestFlavour && !inCat) flavour = true
    total += Math.max(best, 0) + (inCat ? (bestHead ? 3 : 6) : 0)
  })
  if (total === -Infinity) return null
  if (x.kind === item.key) total += 8 // druh se jmenuje přesně jako položka
  return { score: total - x.name.length * 0.4, strong: strong && !flavour, lead } // kratší název = obecnější produkt
}

const byRank = (a: Hit, b: Hit) => +b.strong - +a.strong || b.score - a.score || b.p.discount - a.p.discount

export function matchItem(item: Item, groups: Group[], picks: Record<string, number> = {}, ctx?: Set<number>, max = 8): Match {
  const hits: Hit[] = []
  for (const x of index(groups)) {
    const r = score(item, x)
    // kontext řádku (viz matchList): mimo kategorii sousedů je shoda jen slabá
    if (r) hits.push({ p: x.p, g: x.g, score: r.score, strong: r.strong && (!ctx || ctx.has(x.g.topId)), lead: r.lead })
  }
  hits.sort(byRank)
  // zapamatovaná volba vyhrává, pokud je produkt pořád v akci (i když by ho skóre jinak nenašlo)
  const pickId = picks[item.key]
  const pick = pickId === undefined ? undefined : index(groups).find((x) => x.p.id === pickId)
  const pickedHit: Hit | undefined = pick && (hits.find((h) => h.p.id === pickId) ?? { p: pick.p, g: pick.g, score: 0, strong: true, lead: false })
  const best = pickedHit ?? hits[0] ?? null
  // alternativy: nejdřív další silné shody ze stejného druhu jako vítěz, pak ostatní podle pořadí
  const rest = hits.filter((h) => h.p.id !== best?.p.id)
  const same = rest.filter((h) => h.g.id === best?.g.id && h.strong === best.strong)
  const alts = [...same, ...rest.filter((h) => !same.includes(h))].slice(0, max)
  return { item, best, alts, weak: !pickedHit && !best?.strong, picked: !!pickedHit }
}

/** Ve kolika hlavních kategoriích se slovo objevuje v názvech – „pomeranč“ je v ovoci, nápojích, čokoládách… */
const spreadCache = new WeakMap<Group[], Map<string, number>>()
function spread(t: string, groups: Group[]): number {
  let m = spreadCache.get(groups)
  if (!m) spreadCache.set(groups, (m = new Map()))
  let n = m.get(t)
  if (n === undefined) {
    const tops = new Set<number>()
    for (const x of index(groups)) if (x.name.some((w) => strength(t, w) === 2)) tops.add(x.g.topId)
    m.set(t, (n = tops.size))
  }
  return n
}
/** Od kolika hlavních kategorií je slovo víceznačné (spíš příchuť než konkrétní věc). */
const AMBIGUOUS = 3

/**
 * Celý seznam. Víceznačná položka („pomeranče“) se dívá na sousedy ze stejného řádku, kteří jsou jasně
 * „ta věc sama“ („mandarinky“ → „Mandarinky – bedýnka“ v Ovoce a zelenina): silná je pak jen shoda
 * v jejich hlavní kategorii, Mirinda Pomeranč je jen „možná“. Jednoznačné položky („sůl a pepř“) se neovlivňují.
 */
export function matchList(items: Item[], groups: Group[], picks: Record<string, number> = {}): Match[] {
  const first = items.map((it) => matchItem(it, groups, picks))
  const ambiguous = items.map((it) => it.tokens.some((t) => spread(t, groups) >= AMBIGUOUS))
  return first.map((m, i) => {
    if (!ambiguous[i] || m.picked) return m
    const ctx = new Set(
      first.filter((o, j) => j !== i && o.item.line === m.item.line && !o.weak && o.best?.lead).map((o) => o.best!.g.topId),
    )
    return ctx.size ? matchItem(m.item, groups, picks, ctx) : m
  })
}
