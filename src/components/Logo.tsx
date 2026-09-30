"use client";

import { useEffect, useRef, useState } from "react";

/** Archivo del logo. Poné el logo en public/img/logo.png (o cambiá la extensión acá). */
export const LOGO_SRC = "/img/logo.png";

/**
 * Logo de Juli Nutrición. Si el archivo todavía no está en public/img,
 * muestra el logotipo de texto del diseño.
 */
export default function Logo({ alto = 48 }: { alto?: number }) {
  const [sinArchivo, setSinArchivo] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Si la imagen falló antes de que React hidrate, onError no se dispara: revisar al montar.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setSinArchivo(true);
  }, []);

  if (sinArchivo) {
    return (
      <span className="logo-texto">
        <span className="logo-nombre">Julieta Cano</span>
        <span className="logo-sub">Nutrición</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      className="logo-img"
      src={LOGO_SRC}
      alt="Juli Nutrición"
      style={{ height: alto }}
      onError={() => setSinArchivo(true)}
    />
  );
}
