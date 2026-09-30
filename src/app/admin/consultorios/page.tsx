"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import SoloAdmin from "@/components/admin/SoloAdmin";
import { type Modalidad, useAdmin, mensajeError } from "@/lib/admin/contexto";

type Consultorio = {
  id: string;
  nombre: string;
  direccion: string | null;
  detalle: string | null;
  link_mapa: string | null;
  whatsapp_clinica: string | null;
  modalidad: Modalidad;
  extra_whatsapp: string | null;
  activo: boolean;
  orden: number;
};

const MODALIDADES: { valor: Modalidad; etiqueta: string; ayuda: string }[] = [
  { valor: "agenda", etiqueta: "Agenda online", ayuda: "Los pacientes reservan desde la web según los horarios cargados." },
  { valor: "whatsapp", etiqueta: "Coordinar por WhatsApp", ayuda: "El botón abre tu WhatsApp. Los turnos se cargan a mano en la agenda." },
  { valor: "clinica", etiqueta: "Turnos por la clínica", ayuda: "Se muestra aparte, con el botón al WhatsApp de la clínica." },
];

type Borrador = Omit<Consultorio, "id"> & { id?: string };

const VACIO: Borrador = {
  nombre: "",
  direccion: "",
  detalle: "",
  link_mapa: "",
  whatsapp_clinica: "",
  modalidad: "agenda",
  extra_whatsapp: "",
  activo: true,
  orden: 0,
};

function Consultorios() {
  const { sb, recargarCatalogos } = useAdmin();
  const [lista, setLista] = useState<Consultorio[] | null>(null);
  const [editando, setEditando] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from("consultorios")
      .select("id, nombre, direccion, detalle, link_mapa, whatsapp_clinica, modalidad, extra_whatsapp, activo, orden")
      .order("orden");
    if (error) setError(mensajeError(error));
    setLista((data ?? []) as Consultorio[]);
  }, [sb]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    setError(null);
    const limpio = (v: string | null) => (v && v.trim() ? v.trim() : null);
    const fila = {
      nombre: editando.nombre.trim(),
      direccion: limpio(editando.direccion),
      detalle: limpio(editando.detalle),
      link_mapa: limpio(editando.link_mapa),
      whatsapp_clinica: editando.modalidad === "clinica" ? limpio(editando.whatsapp_clinica) : null,
      modalidad: editando.modalidad,
      extra_whatsapp: limpio(editando.extra_whatsapp),
      activo: editando.activo,
      orden: Number(editando.orden) || 0,
    };
    const { error } = editando.id
      ? await sb.from("consultorios").update(fila).eq("id", editando.id)
      : await sb.from("consultorios").insert(fila);
    setGuardando(false);
    if (error) return setError(mensajeError(error));
    setEditando(null);
    await cargar();
    await recargarCatalogos();
  }

  async function borrar(c: Consultorio) {
    if (!window.confirm(`¿Borrar "${c.nombre}"? Si tiene turnos no se va a poder: en ese caso desactivalo.`)) return;
    const { error } = await sb.from("consultorios").delete().eq("id", c.id);
    if (error) return setError(mensajeError(error));
    await cargar();
    await recargarCatalogos();
  }

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setEditando((b) => (b ? { ...b, [k]: v } : b));

  return (
    <>
      <div className="adm-cabecera">
        <h1 className="adm-h1">Consultorios</h1>
        <button
          type="button"
          className="adm-btn adm-btn-primario"
          onClick={() => setEditando({ ...VACIO, orden: (lista?.length ?? 0) + 1 })}
        >
          + Consultorio
        </button>
      </div>
      <p className="adm-muted">
        <b>Agenda online</b>: reservan desde la web. <b>Por WhatsApp</b>: coordinan con vos (ej. consultas online).{" "}
        <b>Por la clínica</b>: el turno lo da la clínica.
      </p>
      {error && !editando && <p className="adm-error">{error}</p>}

      <div className="adm-card adm-tabla-wrap">
        {lista === null ? (
          <p className="adm-muted">Cargando…</p>
        ) : (
          <table className="adm-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td className="adm-muted">{c.orden}</td>
                  <td>
                    <b style={{ fontWeight: 500 }}>{c.nombre}</b>
                    <div className="adm-muted adm-chico">{c.direccion ?? c.detalle ?? ""}</div>
                  </td>
                  <td>
                    {c.modalidad === "agenda" && <span className="adm-badge est-confirmado">Agenda online</span>}
                    {c.modalidad === "whatsapp" && <span className="adm-badge est-pendiente">Por WhatsApp</span>}
                    {c.modalidad === "clinica" && <span className="adm-tag">Por la clínica</span>}
                  </td>
                  <td>{c.activo ? "Visible" : <span className="adm-muted">Oculto</span>}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button type="button" className="adm-btn adm-btn-chico" onClick={() => { setError(null); setEditando({ ...c }); }}>
                      Editar
                    </button>{" "}
                    <button type="button" className="adm-btn adm-btn-chico adm-btn-peligro" onClick={() => borrar(c)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <Modal titulo={editando.id ? "Editar consultorio" : "Nuevo consultorio"} onClose={() => setEditando(null)}>
          <form className="adm-form" onSubmit={guardar}>
            <label className="adm-campo">
              <span>Nombre</span>
              <input value={editando.nombre} onChange={(e) => set("nombre", e.target.value)} required />
            </label>
            <label className="adm-campo">
              <span>Dirección</span>
              <input value={editando.direccion ?? ""} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle 123, Ciudad" />
            </label>
            <label className="adm-campo">
              <span>Detalle (texto de la tarjeta)</span>
              <input value={editando.detalle ?? ""} onChange={(e) => set("detalle", e.target.value)} placeholder="Martes y jueves de 9 a 13 hs" />
            </label>
            <label className="adm-campo">
              <span>Link de Google Maps (opcional)</span>
              <input type="url" value={editando.link_mapa ?? ""} onChange={(e) => set("link_mapa", e.target.value)} />
            </label>
            <div className="adm-campo">
              <span>¿Cómo se dan los turnos?</span>
              <div className="adm-pila" style={{ gap: 8 }}>
                {MODALIDADES.map((m) => (
                  <label key={m.valor} className="adm-check" style={{ alignItems: "flex-start" }}>
                    <input type="radio" name="modalidad" checked={editando.modalidad === m.valor} onChange={() => set("modalidad", m.valor)} />
                    <span>
                      {m.etiqueta}
                      <span className="adm-muted adm-chico" style={{ display: "block" }}>{m.ayuda}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {editando.modalidad !== "clinica" && (
              <label className="adm-campo">
                <span>Link extra a tu WhatsApp (opcional)</span>
                <input
                  value={editando.extra_whatsapp ?? ""}
                  onChange={(e) => set("extra_whatsapp", e.target.value)}
                  placeholder="¿Necesitás un sobreturno? Escribime"
                />
              </label>
            )}
            {editando.modalidad === "clinica" && (
              <label className="adm-campo">
                <span>WhatsApp de la clínica (número o link)</span>
                <input value={editando.whatsapp_clinica ?? ""} onChange={(e) => set("whatsapp_clinica", e.target.value)} placeholder="261 555 1234" />
              </label>
            )}
            <div className="adm-grid-2">
              <label className="adm-check">
                <input type="checkbox" checked={editando.activo} onChange={(e) => set("activo", e.target.checked)} />
                Visible en el sitio
              </label>
              <label className="adm-campo">
                <span>Orden</span>
                <input type="number" min={0} value={editando.orden} onChange={(e) => set("orden", Number(e.target.value))} />
              </label>
            </div>
            {error && <p className="adm-error">{error}</p>}
            <button type="submit" className="adm-btn adm-btn-primario" disabled={guardando || !editando.nombre.trim()}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <SoloAdmin>
      <Consultorios />
    </SoloAdmin>
  );
}
