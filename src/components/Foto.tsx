"use client";

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  placeholder: string;
};

/** Imagen con placeholder rayado si falta el archivo o falla la carga. */
export default function Foto({ src, alt, placeholder }: Props) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="foto-placeholder" role="img" aria-label={alt}>
        {placeholder}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="foto" src={src} alt={alt} loading="lazy" onError={() => setError(true)} />
  );
}
