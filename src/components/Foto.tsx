"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  placeholder: string;
};

/** Imagen con placeholder rayado si falta el archivo o falla la carga. */
export default function Foto({ src, alt, placeholder }: Props) {
  const [error, setError] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Si la imagen falló antes de que React hidrate, onError no se dispara: revisar al montar.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setError(true);
  }, [src]);

  if (!src || error) {
    return (
      <div className="foto-placeholder" role="img" aria-label={alt}>
        {placeholder}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} className="foto" src={src} alt={alt} onError={() => setError(true)} />
  );
}
