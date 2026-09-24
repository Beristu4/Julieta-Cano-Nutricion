"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import SoloAdmin from "@/components/admin/SoloAdmin";
import { type Perfil, type Rol, useAdmin, mensajeError } from "@/lib/admin/contexto";

type PerfilConConsultorios = Perfil & { perfil_consultorio: { consultorio_id: string }[] };

function Usuarios() {
  const { sb, user, consultorios } = useAdmin();
  const [lista, setLista] = useState<PerfilConConsultorios[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from("perfiles")
      .select("id, nombre, email, rol, activo, perfil_consultorio(consultorio_id)")
      .order("creado_en");
    if (error) setError(mensajeError(error));
    setLista((data ?? []) as PerfilConConsultorios[]);
  }, [sb]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function llamarApi(metodo: "POST" | "PATCH", body: unknown): Promise<string | null> {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/admin/usuarios", {
      method: metodo,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify(body),
    });
    const r = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? null : r.error ?? "Error inesperado.";
  }

  async function actualizar(id: string, cambios: Partial<Perfil>) {
    setError(null);
    setOk(null);
    const { error } = await sb.from("perfiles").update(cambios).eq("id", id);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  async function asignar(perfilId: string, consultorioId: string, asignado: boolean) {
    setError(null);
    const { error } = asignado
      ? await sb.from("perfil_consultorio").insert({ perfil_id: perfilId, consultorio_id: consultorioId })
      : await sb.from("perfil_consultorio").delete().eq("perfil_id", perfilId).eq("consultorio_id", consultorioId);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  async function cambiarClave(p: Perfil) {
    const nueva = window.prompt(`Nueva contraseña para ${p.nombre ?? p.email} (mínimo 8 caracteres):`);
    if (!nueva) return;
    setError(null);
    setOk(null);
    const err = await llamarApi("PATCH", { id: p.id, password: nueva });
    if (err) return setError(err);
    setOk(`Contraseña actualizada. Pasásela a ${p.nombre ?? "la persona"} por un medio seguro.`);
  }

  return (
    <>
      <div className="adm-cabecera">
        <h1 className="adm-h1">Usuarios</h1>
        <button type="button" className="adm-btn adm-btn-primario" onClick={() => setCreando(true)}>
          + Usuario
        </button>
      </div>
      <p className="adm-muted">Cada secretaria ve y gestiona solo los turnos de los consultorios que tenga asignados.</p>
      {error && <p className="adm-error">{error}</p>}
      {ok && <p className="adm-ok">{ok}</p>}

      {lista === null && <p className="adm-muted">Cargando…</p>}
      <div className="adm-pila">
        {lista?.map((p) => {
          const yo = p.id === user.id;
          const asignados = new Set(p.perfil_consultorio.map((x) => x.consultorio_id));
          return (
            <div key={p.id} className="adm-card adm-pila">
              <div className="adm-cabecera">
                <div>
                  <b style={{ fontWeight: 500, fontSize: 17 }}>{p.nombre ?? "(sin nombre)"}</b>{" "}
                  {yo && <span className="adm-tag">vos</span>}
                  <div className="adm-muted adm-chico">{p.email}</div>
                </div>
                <div className="adm-fila">
                  <select
                    className="adm-input"
                    value={p.rol}
                    disabled={yo}
                    onChange={(e) => actualizar(p.id, { rol: e.target.value as Rol })}
                    aria-label="Rol"
                  >
                    <option value="secretaria">Secretaria</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="adm-check">
                    <input type="checkbox" checked={p.activo} disabled={yo} onChange={(e) => actualizar(p.id, { activo: e.target.checked })} />
                    Activo
                  </label>
                  <button type="button" className="adm-btn adm-btn-chico" onClick={() => cambiarClave(p)}>
                    Cambiar contraseña
                  </button>
                </div>
              </div>
              {p.rol === "secretaria" && (
                <div className="adm-fila">
                  <span className="adm-muted adm-chico">Consultorios:</span>
                  {consultorios.map((c) => (
                    <label key={c.id} className="adm-check">
                      <input type="checkbox" checked={asignados.has(c.id)} onChange={(e) => asignar(p.id, c.id, e.target.checked)} />
                      {c.nombre}
                    </label>
                  ))}
                  {asignados.size === 0 && <span className="adm-error adm-chico">Sin consultorios: no va a ver turnos.</span>}
                </div>
              )}
              {p.rol === "admin" && <span className="adm-muted adm-chico">Admin: ve todos los consultorios y la configuración.</span>}
            </div>
          );
        })}
      </div>

      {creando && (
        <NuevoUsuario
          consultorios={consultorios}
          onClose={() => setCreando(false)}
          crear={async (datos) => {
            const err = await llamarApi("POST", datos);
            if (err) return err;
            setCreando(false);
            setOk(`Usuario creado. Pasale a ${datos.nombre} su email y contraseña: entra en /admin.`);
            cargar();
            return null;
          }}
        />
      )}
    </>
  );
}

type DatosAlta = { nombre: string; email: string; password: string; rol: Rol; consultorios: string[] };

function NuevoUsuario({
  consultorios,
  onClose,
  crear,
}: {
  consultorios: { id: string; nombre: string }[];
  onClose: () => void;
  crear: (d: DatosAlta) => Promise<string | null>;
}) {
  const [d, setD] = useState<DatosAlta>({ nombre: "", email: "", password: "", rol: "secretaria", consultorios: [] });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const err = await crear(d);
    setGuardando(false);
    if (err) setError(err);
  }

  return (
    <Modal titulo="Nuevo usuario" onClose={onClose}>
      <form className="adm-form" onSubmit={enviar}>
        <label className="adm-campo">
          <span>Nombre</span>
          <input value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} required />
        </label>
        <label className="adm-campo">
          <span>Email</span>
          <input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} required />
        </label>
        <label className="adm-campo">
          <span>Contraseña inicial (mínimo 8 caracteres)</span>
          <input type="text" value={d.password} minLength={8} onChange={(e) => setD({ ...d, password: e.target.value })} required />
        </label>
        <label className="adm-campo">
          <span>Rol</span>
          <select value={d.rol} onChange={(e) => setD({ ...d, rol: e.target.value as Rol })}>
            <option value="secretaria">Secretaria</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {d.rol === "secretaria" && (
          <div className="adm-campo">
            <span>Consultorios que maneja</span>
            <div className="adm-fila">
              {consultorios.map((c) => (
                <label key={c.id} className="adm-check">
                  <input
                    type="checkbox"
                    checked={d.consultorios.includes(c.id)}
                    onChange={(e) =>
                      setD({
                        ...d,
                        consultorios: e.target.checked ? [...d.consultorios, c.id] : d.consultorios.filter((x) => x !== c.id),
                      })
                    }
                  />
                  {c.nombre}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="adm-error">{error}</p>}
        <button type="submit" className="adm-btn adm-btn-primario" disabled={guardando}>
          {guardando ? "Creando…" : "Crear usuario"}
        </button>
      </form>
    </Modal>
  );
}

export default function Page() {
  return (
    <SoloAdmin>
      <Usuarios />
    </SoloAdmin>
  );
}
