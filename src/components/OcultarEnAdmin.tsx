"use client";

import { usePathname } from "next/navigation";

/** Oculta header, footer y botón de WhatsApp del sitio público dentro del panel. */
export default function OcultarEnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
