import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Obrázek s rezervovaným místem (rodič určuje aspect-ratio). Bez fade-in: obrázek se po načtení
 * jen vymění za skeleton (fade z průhlednosti při každém otevření sekce působil jako blikání).
 */
export function Img({ src, className = '' }: { src: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [ok, setOk] = useState(false)

  useLayoutEffect(() => {
    const im = ref.current
    if (im?.complete && im.naturalWidth > 0) {
      setOk(true)
    }
  }, [src])

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {!ok && <div className="skeleton absolute inset-0" />}
      <img
        ref={ref}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setOk(true)}
        onError={() => setOk(true)}
        className={`h-full w-full object-contain ${ok ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
