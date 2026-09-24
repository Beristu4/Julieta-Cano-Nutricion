"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import {
  AdminContext,
  type AdminCtx,
  type ConsultorioAdmin,
  type Perfil,
  type TipoAdmin,
} from "@/lib/admin/contexto";

const NAV: { href: string; etiqueta: string; soloAdmin?: boolean }[] = [
  { href: "/admin", etiqueta: "Agenda" },
  { href: "/admin/bloqueos", etiqueta: "Bloqueos" },
  { href: "/admin/horarios", etiqueta: "Horarios", soloAdmin: true },
  { href: "/admin/consultorios", etiqueta: "Consultorios", soloAdmin: true },
  { href: "/admin/productos", etiqueta: "Productos", soloAdmin: true },
  { href: "/admin/ajustes", etiqueta: "Ajustes", soloAdmin: true },
  { href: "/admin/usuarios", etiqueta: "Usuarios", soloAdmin: true },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const enLogin = pathname === "/admin/login";

  // undefined = cargando, null = sin sesión
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined);
  const [consultorios, setConsultorios] = useState<ConsultorioAdmin[]>([]);
  const [tipos, setTipos] = useState<TipoAdmin[]>([]);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  // Sin sesión → login. Con sesión en /admin/login → agenda.
  useEffect(() => {
    if (session === null && !enLogin) router.replace("/admin/login");
    if (session && enLogin) router.replace("/admin");
  }, [session, enLogin, router]);

  const userId = session?.user.id;

  const cargarCatalogos = useCallback(
    async (p: Perfil) => {
      if (!sb) return;
      const [{ data: cons }, { data: tps }, { data: asignados }] = await Promise.all([
        sb.from("consultorios").select("id, nombre, reserva_online, activo, orden").order("orden"),
        sb.from("tipos_consulta").select("id, nombre, duracion_min, activo, orden").order("orden"),
        sb.from("perfil_consultorio").select("consultorio_id").eq("perfil_id", p.id),
      ]);
      const todos = ((cons ?? []) as ConsultorioAdmin[]).filter((c) => c.reserva_online);
      const ids = new Set(((asignados ?? []) as { consultorio_id: string }[]).map((a) => a.consultorio_id));
      setConsultorios(p.rol === "admin" ? todos : todos.filter((c) => ids.has(c.id)));
      setTipos((tps ?? []) as TipoAdmin[]);
    },
    [sb],
  );

  useEffect(() => {
    if (!sb || !userId) {
      setPerfil(undefined);
      return;
    }
    let vigente = true;
    sb.from("perfiles")
      .select("id, nombre, email, rol, activo")
      .eq("id", userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!vigente) return;
        const p = (data as Perfil | null) ?? null;
        if (p?.activo) await cargarCatalogos(p);
        if (vigente) setPerfil(p);
      });
    return () => {
      vigente = false;
    };
  }, [sb, userId, cargarCatalogos]);

  async function salir() {
    await sb?.auth.signOut();
    router.replace("/admin/login");
  }

  if (!sb) {
    return (
      <div className="adm-centro">
        <div className="adm-card adm-angosto">
          <h1 className="adm-h1">Panel no disponible</h1>
          <p className="adm-muted">Faltan las variables de Supabase en el servidor.</p>
        </div>
      </div>
    );
  }

  if (enLogin) return <>{children}</>;

  if (session === undefined || (session && perfil === undefined)) {
    return <div className="adm-centro adm-muted">Cargando…</div>;
  }
  if (!session) return <div className="adm-centro adm-muted">Redirigiendo…</div>;

  if (!perfil || !perfil.activo) {
    return (
      <div className="adm-centro">
        <div className="adm-card adm-angosto">
          <h1 className="adm-h1">Usuario sin acceso</h1>
          <p className="adm-muted">
            Tu usuario ({session.user.email}) todavía no está habilitado. Pedile a Julieta que lo active desde Usuarios.
          </p>
          <button type="button" className="adm-btn" onClick={salir}>Salir</button>
        </div>
      </div>
    );
  }

  const esAdmin = perfil.rol === "admin";
  const ctx: AdminCtx = {
    sb,
    user: session.user,
    perfil,
    esAdmin,
    consultorios,
    tipos,
    recargarCatalogos: () => cargarCatalogos(perfil),
  };

  const activo = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <AdminContext.Provider value={ctx}>
      <div className="adm">
        <header className="adm-top">
          <div className="adm-top-fila">
            <Link href="/admin" className="adm-marca">
              Julieta Cano <span>panel</span>
            </Link>
            <div className="adm-usuario">
              <span className="adm-muted">{perfil.nombre ?? session.user.email}</span>
              <button type="button" className="adm-link" onClick={salir}>Salir</button>
            </div>
          </div>
          <nav className="adm-nav" aria-label="Panel">
            {NAV.filter((n) => esAdmin || !n.soloAdmin).map((n) => (
              <Link key={n.href} href={n.href} className={activo(n.href) ? "activo" : undefined}>
                {n.etiqueta}
              </Link>
            ))}
            <Link href="/" target="_blank">Ver sitio ↗</Link>
          </nav>
        </header>
        <div className="adm-contenido">{children}</div>
      </div>
    </AdminContext.Provider>
  );
}
