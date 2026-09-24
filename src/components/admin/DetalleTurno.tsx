"use client";

import { useState } from "react";
import Modal from "./Modal";
import SelectorHorario from "./SelectorHorario";
import { ESTADOS, type EstadoTurno, type Turno, useAdmin, mensajeError } from "@/lib/admin/contexto";
import { fechaAR, fechaLarga, horaAR } from "@/lib/fechas";
import { waLink } from "@/lib/site";

type Props = {
  turno: Turno;
  onClose: () => void;
  onCambio: () => void;
};

export default function DetalleTurno({ turno, onClose, onCambio }: Props) {
  const { sb, esAdmin, consultorios, tipos } = useAdmin();
  const consultorio = consultorios.find((c) => c.id === turno.consultorio_id);
  const tipo = tipos.find((t) => t.id === turno.tipo_consulta_id);

  const [notas, setNotas] = useState(turno.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [reprogramando, setReprogramando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(fechaAR(turno.inicio));
  const [nuevoInicio, setNuevoInicio] = useState<string | null>(null);

  const fecha = fechaAR(turno.inicio);
  const hora = horaAR(turno.inicio);
  const lugar = consultorio?.nombre ?? "el consultorio";
  const nombreCorto = turno.paciente_nombre.split(" ")[0];
  // Normaliza a formato internacional argentino para wa.me (549 + área + número)
  const telBase = turno.paciente_telefono.replace(/^0+/, "");
  const telWpp = telBase.startsWith("54") ? telBase : `549${telBase}`;

  const msgConfirmar = `Hola ${nombreCorto}! Te confirmamos tu turno con la Lic. Julieta Cano el ${fechaLarga(fecha)} a las ${hora} hs en ${lugar}. Si no podés asistir, avisanos por este medio. ¡Gracias!`;
  const msgRecordar = `Hola ${nombreCorto}! Te recordamos tu turno con la Lic. Julieta Cano el ${fechaLarga(fecha)} a las ${hora} hs en ${lugar}. ¡Te esperamos!`;

  async function actualizar(cambios: Partial<Turno>, mensaje: string) {
    setOcupado(true);
    setError(null);
    setOk(null);
    const { error } = await sb.from("turnos").update(cambios).eq("id", turno.id);
    setOcupado(false);
    if (error) {
      setError(mensajeError(error));
      return false;
    }
    setOk(mensaje);
    onCambio();
    return true;
  }

  async function cambiarEstado(estado: EstadoTurno) {
    if (estado === "cancelado" && !window.confirm("¿Cancelar este turno? El horario queda libre.")) return;
    await actualizar({ estado }, "Estado actualizado.");
  }

  async function reprogramar() {
    if (!nuevoInicio || !tipo) return;
    const fin = new Date(new Date(nuevoInicio).getTime() + tipo.duracion_min * 60_000).toISOString();
    const cambio: Partial<Turno> = { inicio: nuevoInicio, fin };
    if (turno.estado === "cancelado" || turno.estado === "ausente") cambio.estado = "confirmado";
    const hecho = await actualizar(cambio, `Reprogramado para el ${fechaLarga(fechaAR(nuevoInicio))} a las ${horaAR(nuevoInicio)} hs.`);
    if (hecho) {
      setReprogramando(false);
      setNuevoInicio(null);
    }
  }

  async function borrar() {
    if (!window.confirm("¿Borrar definitivamente este turno? Si solo no viene, usá Cancelar.")) return;
    setOcupado(true);
    const { error } = await sb.from("turnos").delete().eq("id", turno.id);
    setOcupado(false);
    if (error) {
      setError(mensajeError(error));
      return;
    }
    onCambio();
    onClose();
  }

  return (
    <Modal
      titulo={turno.paciente_nombre}
      subtitulo={
        <>
          {fechaLarga(fecha)} · {hora} hs · {lugar}
        </>
      }
      onClose={onClose}
    >
      <dl className="adm-datos">
        <dt>Estado</dt>
        <dd><span className={`adm-badge est-${turno.estado}`}>{turno.estado}</span></dd>
        <dt>Consulta</dt>
        <dd>{tipo?.nombre ?? "—"} {tipo && <span className="adm-muted">({tipo.duracion_min} min)</span>}</dd>
        <dt>Teléfono</dt>
        <dd><a href={`tel:+${telWpp}`}>{turno.paciente_telefono}</a></dd>
        <dt>Origen</dt>
        <dd>{turno.origen === "web" ? "Reserva web" : "Cargado por secretaría"}</dd>
      </dl>

      <div className="adm-fila">
        <a className="adm-btn adm-btn-wpp adm-btn-chico" href={waLink(msgConfirmar, telWpp)} target="_blank" rel="noopener noreferrer">
          WhatsApp: confirmar
        </a>
        <a className="adm-btn adm-btn-wpp adm-btn-chico" href={waLink(msgRecordar, telWpp)} target="_blank" rel="noopener noreferrer">
          WhatsApp: recordar
        </a>
        <a className="adm-btn adm-btn-chico" href={waLink(undefined, telWpp)} target="_blank" rel="noopener noreferrer">
          Abrir chat
        </a>
      </div>

      <hr className="adm-sep" />

      <div className="adm-pila" style={{ gap: 8 }}>
        <span className="adm-muted adm-chico">Cambiar estado</span>
        <div className="adm-fila">
          {ESTADOS.filter((e) => e.valor !== turno.estado).map((e) => (
            <button
              key={e.valor}
              type="button"
              className={`adm-btn adm-btn-chico ${e.valor === "cancelado" ? "adm-btn-peligro" : ""}`}
              disabled={ocupado}
              onClick={() => cambiarEstado(e.valor)}
            >
              {e.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <label className="adm-campo">
        <span>Notas</span>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
      </label>
      {notas !== (turno.notas ?? "") && (
        <button
          type="button"
          className="adm-btn adm-btn-oscuro adm-btn-chico"
          style={{ alignSelf: "flex-start" }}
          disabled={ocupado}
          onClick={() => actualizar({ notas: notas.trim() || null }, "Notas guardadas.")}
        >
          Guardar notas
        </button>
      )}

      <hr className="adm-sep" />

      {!reprogramando ? (
        <button type="button" className="adm-btn" style={{ alignSelf: "flex-start" }} onClick={() => setReprogramando(true)}>
          Reprogramar
        </button>
      ) : (
        <div className="adm-pila">
          <label className="adm-campo">
            <span>Nueva fecha</span>
            <input type="date" value={nuevaFecha} onChange={(e) => { setNuevaFecha(e.target.value); setNuevoInicio(null); }} />
          </label>
          <SelectorHorario
            consultorioId={turno.consultorio_id}
            tipoId={turno.tipo_consulta_id}
            fecha={nuevaFecha}
            excluirId={turno.id}
            valor={nuevoInicio}
            onChange={setNuevoInicio}
          />
          <div className="adm-fila">
            <button type="button" className="adm-btn adm-btn-primario" disabled={!nuevoInicio || ocupado} onClick={reprogramar}>
              Confirmar cambio
            </button>
            <button type="button" className="adm-btn" onClick={() => { setReprogramando(false); setNuevoInicio(null); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="adm-error" role="alert">{error}</p>}
      {ok && <p className="adm-ok">{ok}</p>}

      {esAdmin && (
        <button type="button" className="adm-link adm-chico" style={{ alignSelf: "flex-start", color: "var(--terracota-hover)" }} onClick={borrar}>
          Borrar turno
        </button>
      )}
    </Modal>
  );
}
