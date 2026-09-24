"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DetalleTurno from "@/components/admin/DetalleTurno";
import NuevoTurno from "@/components/admin/NuevoTurno";
import { type Turno, useAdmin, mensajeError } from "@/lib/admin/contexto";
import {
  DOW_CORTO,
  aISO,
  fechaAR,
  fechaCorta,
  fechaLarga,
  horaAR,
  hoyAR,
  lunesDe,
  partesFecha,
  sumarDias,
} from "@/lib/fechas";

type Vista = "dia" | "semana";

export default function Agenda() {
  const { sb, consultorios, tipos } = useAdmin();

  const [vista, setVista] = useState<Vista>("dia");
  const [fecha, setFecha] = useState(hoyAR());
  const [consultorioId, setConsultorioId] = useState<string>("todos");
  const [verCancelados, setVerCancelados] = useState(false);
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [pendientes, setPendientes] = useState<number>(0);

  const desde = vista === "dia" ? fecha : lunesDe(fecha);
  const dias = vista === "dia" ? 1 : 7;
  const hasta = sumarDias(desde, dias);
  const idsPermitidos = useMemo(() => consultorios.map((c) => c.id), [consultorios]);

  const cargar = useCallback(async () => {
    setError(null);
    if (idsPermitidos.length === 0) {
      setTurnos([]);
      return;
    }
    let q = sb
      .from("turnos")
      .select("id, consultorio_id, tipo_consulta_id, inicio, fin, paciente_nombre, paciente_telefono, estado, origen, notas, creado_en")
      .gte("inicio", aISO(desde))
      .lt("inicio", aISO(hasta));
    q = consultorioId === "todos" ? q.in("consultorio_id", idsPermitidos) : q.eq("consultorio_id", consultorioId);
    if (!verCancelados) q = q.neq("estado", "cancelado");
    const { data, error } = await q.order("inicio");
    if (error) {
      setError(mensajeError(error));
      setTurnos([]);
      return;
    }
    setTurnos((data ?? []) as Turno[]);

    // Pendientes de confirmar desde hoy en adelante
    const { count } = await sb
      .from("turnos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .gte("inicio", new Date().toISOString())
      .in("consultorio_id", idsPermitidos);
    setPendientes(count ?? 0);
  }, [sb, desde, hasta, consultorioId, verCancelados, idsPermitidos]);

  useEffect(() => {
    setTurnos(null);
    cargar();
  }, [cargar]);

  // Refresco automático cada 60 s (por si entran reservas web)
  useEffect(() => {
    const id = window.setInterval(cargar, 60_000);
    return () => window.clearInterval(id);
  }, [cargar]);

  const nombreConsultorio = (id: string) => consultorios.find((c) => c.id === id)?.nombre ?? "";
  const nombreTipo = (id: string) => tipos.find((t) => t.id === id)?.nombre ?? "";
  const turnoSel = turnos?.find((t) => t.id === seleccionado) ?? null;
  const hoy = hoyAR();

  const mover = (n: number) => setFecha(sumarDias(fecha, n * dias));

  const titulo =
    vista === "dia"
      ? fecha === hoy
        ? `Hoy, ${fechaCorta(fecha)}`
        : fechaLarga(fecha).replace(/^./, (c) => c.toUpperCase())
      : `Semana del ${fechaCorta(desde)}`;

  const activos = (turnos ?? []).filter((t) => t.estado !== "cancelado");

  return (
    <>
      <div className="adm-cabecera">
        <h1 className="adm-h1">Agenda</h1>
        <button type="button" className="adm-btn adm-btn-primario" onClick={() => setCreando(true)} disabled={consultorios.length === 0}>
          + Turno
        </button>
      </div>

      {consultorios.length === 0 && (
        <div className="adm-card adm-muted">No tenés consultorios asignados todavía. Pedile a Julieta que te asigne uno desde Usuarios.</div>
      )}

      <div className="adm-card adm-pila">
        <div className="adm-toolbar">
          <div className="adm-nav-fecha">
            <button type="button" className="adm-btn adm-btn-chico" onClick={() => mover(-1)} aria-label="Anterior">←</button>
            <button type="button" className="adm-btn adm-btn-chico" onClick={() => setFecha(hoy)}>Hoy</button>
            <button type="button" className="adm-btn adm-btn-chico" onClick={() => mover(1)} aria-label="Siguiente">→</button>
            <input
              type="date"
              className="adm-input"
              value={fecha}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              aria-label="Ir a fecha"
            />
          </div>
          <div className="adm-seg" role="group" aria-label="Vista">
            <button type="button" aria-pressed={vista === "dia"} onClick={() => setVista("dia")}>Día</button>
            <button type="button" aria-pressed={vista === "semana"} onClick={() => setVista("semana")}>Semana</button>
          </div>
        </div>
        <div className="adm-toolbar">
          <div className="adm-fila">
            <select className="adm-input" value={consultorioId} onChange={(e) => setConsultorioId(e.target.value)} aria-label="Consultorio">
              <option value="todos">Todos los consultorios</option>
              {consultorios.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <label className="adm-check">
              <input type="checkbox" checked={verCancelados} onChange={(e) => setVerCancelados(e.target.checked)} />
              Ver cancelados
            </label>
          </div>
          <div className="adm-resumen">
            <span className="adm-tag">{activos.length} turnos</span>
            {pendientes > 0 && <span className="adm-badge est-pendiente">{pendientes} por confirmar</span>}
          </div>
        </div>
      </div>

      <div className="adm-nav-fecha">
        <span className="titulo">{titulo}</span>
      </div>

      {error && <p className="adm-error">{error}</p>}
      {turnos === null && <p className="adm-muted">Cargando turnos…</p>}

      {turnos && vista === "dia" && (
        <div className="adm-lista-turnos">
          {turnos.length === 0 && <div className="adm-card adm-vacio">No hay turnos este día.</div>}
          {turnos.map((t) => (
            <button key={t.id} type="button" className={`adm-turno estado-${t.estado}`} onClick={() => setSeleccionado(t.id)}>
              <span className="hora">
                {horaAR(t.inicio)}
                <small>{horaAR(t.fin)}</small>
              </span>
              <span className="quien">
                <strong>{t.paciente_nombre}</strong>
                <span>
                  {nombreTipo(t.tipo_consulta_id)}
                  {consultorioId === "todos" && ` · ${nombreConsultorio(t.consultorio_id)}`}
                  {t.origen === "web" && " · web"}
                </span>
              </span>
              <span className={`adm-badge est-${t.estado}`}>{t.estado}</span>
            </button>
          ))}
        </div>
      )}

      {turnos && vista === "semana" && (
        <div className="adm-semana">
          {Array.from({ length: 7 }, (_, i) => sumarDias(desde, i)).map((d) => {
            const delDia = turnos.filter((t) => fechaAR(t.inicio) === d);
            const p = partesFecha(d);
            return (
              <div key={d} className="adm-dia">
                <button
                  type="button"
                  className={`adm-dia-cab ${d === hoy ? "hoy" : ""}`}
                  onClick={() => {
                    setFecha(d);
                    setVista("dia");
                  }}
                >
                  {DOW_CORTO[p.dow]}
                  <strong>{p.dia}</strong>
                </button>
                {delDia.length === 0 && <span className="adm-muted adm-chico" style={{ padding: "0 4px" }}>—</span>}
                {delDia.map((t) => (
                  <button key={t.id} type="button" className={`adm-mini estado-${t.estado}`} onClick={() => setSeleccionado(t.id)}>
                    <b>{horaAR(t.inicio)}</b>
                    <span>{t.paciente_nombre}</span>
                    {consultorioId === "todos" && <span className="adm-muted">{nombreConsultorio(t.consultorio_id)}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {turnoSel && <DetalleTurno turno={turnoSel} onClose={() => setSeleccionado(null)} onCambio={cargar} />}

      {creando && (
        <NuevoTurno
          fechaInicial={fecha}
          consultorioInicial={consultorioId !== "todos" ? consultorioId : undefined}
          onClose={() => setCreando(false)}
          onCreado={() => {
            setCreando(false);
            cargar();
          }}
        />
      )}
    </>
  );
}
