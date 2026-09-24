"use client";

import { useState } from "react";
import Modal from "./Modal";
import SelectorHorario from "./SelectorHorario";
import { useAdmin, mensajeError } from "@/lib/admin/contexto";
import { hoyAR } from "@/lib/fechas";

type Props = {
  fechaInicial: string;
  consultorioInicial?: string;
  onClose: () => void;
  onCreado: () => void;
};

export default function NuevoTurno({ fechaInicial, consultorioInicial, onClose, onCreado }: Props) {
  const { sb, user, consultorios, tipos } = useAdmin();
  const tiposActivos = tipos.filter((t) => t.activo);
  const consActivos = consultorios.filter((c) => c.activo);

  const [consultorioId, setConsultorioId] = useState(consultorioInicial ?? consActivos[0]?.id ?? "");
  const [tipoId, setTipoId] = useState(tiposActivos[0]?.id ?? "");
  const [fecha, setFecha] = useState(fechaInicial < hoyAR() ? hoyAR() : fechaInicial);
  const [inicio, setInicio] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState<"confirmado" | "pendiente">("confirmado");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const tipo = tiposActivos.find((t) => t.id === tipoId);
  const tel = telefono.replace(/\D/g, "");
  const valido = Boolean(consultorioId && tipo && inicio && nombre.trim().length >= 2 && tel.length >= 8 && tel.length <= 20);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || !tipo || !inicio) return;
    setGuardando(true);
    setError(null);
    const fin = new Date(new Date(inicio).getTime() + tipo.duracion_min * 60_000).toISOString();
    const { error } = await sb.from("turnos").insert({
      consultorio_id: consultorioId,
      tipo_consulta_id: tipo.id,
      inicio,
      fin,
      paciente_nombre: nombre.trim(),
      paciente_telefono: tel,
      estado,
      origen: "secretaria",
      notas: notas.trim() || null,
      creado_por: user.id,
    });
    setGuardando(false);
    if (error) {
      setError(mensajeError(error));
      return;
    }
    onCreado();
  }

  return (
    <Modal titulo="Nuevo turno" onClose={onClose}>
      {consActivos.length === 0 ? (
        <p className="adm-muted">No tenés consultorios asignados. Pedile a Julieta que te asigne uno.</p>
      ) : (
        <form className="adm-form" onSubmit={guardar}>
          <div className="adm-grid-2">
            <label className="adm-campo">
              <span>Consultorio</span>
              <select value={consultorioId} onChange={(e) => { setConsultorioId(e.target.value); setInicio(null); }}>
                {consActivos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label className="adm-campo">
              <span>Tipo de consulta</span>
              <select value={tipoId} onChange={(e) => { setTipoId(e.target.value); setInicio(null); }}>
                {tiposActivos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.duracion_min} min)</option>
                ))}
              </select>
            </label>
          </div>
          <label className="adm-campo">
            <span>Fecha</span>
            <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setInicio(null); }} required />
          </label>
          <div className="adm-campo">
            <span>Horario</span>
            <SelectorHorario consultorioId={consultorioId} tipoId={tipoId} fecha={fecha} valor={inicio} onChange={setInicio} />
          </div>
          <hr className="adm-sep" />
          <div className="adm-grid-2">
            <label className="adm-campo">
              <span>Nombre y apellido</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} required />
            </label>
            <label className="adm-campo">
              <span>Teléfono (con código de área)</span>
              <input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="261 555 1234" required />
            </label>
          </div>
          <label className="adm-campo">
            <span>Notas (opcional)</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </label>
          <div className="adm-fila">
            <label className="adm-check">
              <input type="radio" name="estado" checked={estado === "confirmado"} onChange={() => setEstado("confirmado")} />
              Confirmado
            </label>
            <label className="adm-check">
              <input type="radio" name="estado" checked={estado === "pendiente"} onChange={() => setEstado("pendiente")} />
              Pendiente
            </label>
          </div>
          {error && <p className="adm-error" role="alert">{error}</p>}
          <button type="submit" className="adm-btn adm-btn-primario" disabled={!valido || guardando}>
            {guardando ? "Guardando…" : "Guardar turno"}
          </button>
        </form>
      )}
    </Modal>
  );
}
