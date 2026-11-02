export const kc = (n: number) =>
  new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n) + ' Kč'
export const pct = (d: number) => `−${Math.round(d * 100)} %`
export const till = (iso: string | null) =>
  iso ? `do ${new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}` : ''
