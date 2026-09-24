"use client";

import { useEffect } from "react";

type Props = {
  titulo: string;
  subtitulo?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ titulo, subtitulo, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="adm-modal-fondo" onClick={onClose}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-cab">
          <div className="adm-pila" style={{ gap: 4 }}>
            <h2 className="adm-h2">{titulo}</h2>
            {subtitulo && <div className="adm-muted adm-chico">{subtitulo}</div>}
          </div>
          <button type="button" className="adm-cerrar" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
