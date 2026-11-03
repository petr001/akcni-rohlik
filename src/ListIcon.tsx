/** Ikona nákupního seznamu (lísteček se zaškrtávacími řádky) v barvě textu, stejně jako CartIcon. */
export function ListIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="m7.5 8.5 1.3 1.3 2.2-2.3" />
      <path d="M13.5 8.5h3" />
      <path d="m7.5 14.5 1.3 1.3 2.2-2.3" />
      <path d="M13.5 14.5h3" />
    </svg>
  )
}
