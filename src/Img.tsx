import { useState } from 'react'

/** Obrázek s jemným náběhem po načtení a shimmerem, než dorazí. */
export function Img({ src, className = '' }: { src: string; className?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {!ok && <div className="skeleton absolute inset-0" />}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setOk(true)}
        onError={() => setOk(true)}
        className={`h-full w-full object-contain transition-opacity duration-300 ${ok ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
