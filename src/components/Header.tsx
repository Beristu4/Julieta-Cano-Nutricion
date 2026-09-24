"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Cerrar el menú al cambiar de página
  useEffect(() => setAbierto(false), [pathname]);

  // En la home los links de sección son anclas; en el resto vuelven a la home.
  const ancla = (id: string) => (pathname === "/" ? `#${id}` : `/#${id}`);

  const links = (
    <>
      <Link className="nav-link" href={ancla("sobre")}>Sobre mí</Link>
      <Link className="nav-link" href={ancla("servicios")}>Servicios</Link>
      <Link className="nav-link" href="/donde-encontrarme">Dónde encontrarme</Link>
      <Link className="nav-link" href="/productos">Productos</Link>
      <Link className="nav-cta" href="/donde-encontrarme">Agendar turno</Link>
    </>
  );

  return (
    <header className="header">
      <Link href="/" className="logo" aria-label="Julieta Cano Nutrición, inicio">
        <span className="logo-nombre">Julieta Cano</span>
        <span className="logo-sub">Nutrición</span>
      </Link>

      <nav className="nav-desktop" aria-label="Principal">{links}</nav>

      <button
        type="button"
        className="burger"
        aria-label="Menú"
        aria-expanded={abierto}
        aria-controls="menu-mobile"
        onClick={() => setAbierto((a) => !a)}
      >
        <span />
        <span />
      </button>

      {abierto && (
        <nav id="menu-mobile" className="nav-mobile" aria-label="Principal" onClick={() => setAbierto(false)}>
          {links}
        </nav>
      )}
    </header>
  );
}
