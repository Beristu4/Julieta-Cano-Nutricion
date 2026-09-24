"use client";

import { useAdmin } from "@/lib/admin/contexto";

export default function SoloAdmin({ children }: { children: React.ReactNode }) {
  const { esAdmin } = useAdmin();
  if (!esAdmin) return <div className="adm-card adm-muted">Esta sección es solo para Julieta.</div>;
  return <>{children}</>;
}
