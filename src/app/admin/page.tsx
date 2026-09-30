"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DetalleTurno from "@/components/admin/DetalleTurno";
import NuevoTurno from "@/components/admin/NuevoTurno";
import { type Turno, useAdmin, mensajeError } from "@/lib/admin/contexto";
import {
  DOW_CORTO,
  MES_LARGO,
  aISO,
  fechaAR,
  fechaCorta,
  fechaLarga,
  horaAR,
  hoyAR,
  lunesDe,
  partesFecha,
  primeroDelMes,
  sumarDias,
  sumarMeses,
} from "@/lib/fechas";

type Vista = "dia" | "semana" | "mes" | "proximos";

const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: "dia", etiqueta: "Día" },
  { valor: "semana", etiqueta: "Semana" },
  { valor: "mes", etiqueta: "Mes" },
  { valor: "proximos", etiqueta: "45 días" },
];

const DIAS_PROXIMOS = 45;
const CLAVE_VISTA = "jc-agenda-vista";
const MAX_EN_CELDA = 3;

/** Rango [desde, hasta) a consultar según la vista. */
function rango(vista: Vista, fecha: string, hoy: string): { desde: string; hasta: string } {
  switch (vista) {
    case "dia":
      return { desde: fecha, hasta: sumarDias(fecha, 1) };
    case "semana": {
      const l = lunesDe(fecha);
      return { desde: l, hasta: sumarDias(l, 7) };
    }
    case "mes": {
      // Grilla completa: del lunes de la 1ª semana al domingo de la última
      const primero = primeroDelMes(fecha);
      const inicio = lunesDe(primero);
      const ultimo = sumarDias(sumarMeses(fecha, 1), -1);
      return { desde: inicio, hasta: sumarDias(lunesDe(ultimo), 7) };
    }
    case "proximos":
      return { desde: hoy, hasta: sumarDias(hoy, DIAS_PROXIMOS) };
  }
}

export default function Agenda() {
  const { sb, consultorios, tipos } = useAdmin();

  const [vista, setVistaState] = useState<Vista>("dia");
  const [fecha, setFecha] = useState(hoyAR());
  const [consultorioId, setConsultorioId] = useState<string>("todos");
  const [verCancelados, setVerCancelados] = useState(false);
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [pendientes, setPendientes] = useState<number>(0);

  const hoy = hoyAR();
  const { desde, hasta } = rango(vista, fecha, hoy);
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

  // Recordar la última vista elegida en este navegador
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CLAVE_VISTA) as Vista | null;
      if (v && VISTAS.some((x) => x.valor === v)) setVistaState(v);
    } catch {
      /* sin almacenamiento: queda la vista por defecto */
    }
  }, []);

  function setVista(v: Vista) {
    setVistaState(v);
    try {
      window.localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* ignorar */
    }
  }

  // Refresco automático cada 60 s (por si entran reservas web)
  useEffect(() => {
    const id = window.setInterval(cargar, 60_000);
    return () => window.clearInterval(id);
  }, [cargar]);

  const nombreConsultorio = (id: string) => consultorios.find((c) => c.id === id)?.nombre ?? "";
  const nombreTipo = (id: string) => tipos.find((t) => t.id === id)?.nombre ?? "";
  const turnoSel = turnos?.find((t) => t.id === seleccionado) ?? null;

  const mover = (n: number) => {
    if (vista === "dia") setFecha(sumarDias(fecha, n));
    else if (vista === "semana") setFecha(sumarDias(fecha, n * 7));
    else if (vista === "mes") setFecha(sumarMeses(fecha, n));
  };

  const mayuscula = (t: string) => t.replace(/^./, (c) => c.toUpperCase());
  const pm = partesFecha(fecha);
  const titulo =
    vista === "dia"
      ? fecha === hoy
        ? `Hoy, ${fechaCorta(fecha)}`
        : mayuscula(fechaLarga(fecha))
      : vista === "semana"
        ? `Semana del ${fechaCorta(desde)}`
        : vista === "mes"
          ? `${mayuscula(MES_LARGO[pm.mes])} ${pm.anio}`
          : `Próximos ${DIAS_PROXIMOS} días`;

  // En la vista mes, contar solo los del mes (la grilla muestra días de meses vecinos)
  const delPeriodo = (turnos ?? []).filter(
    (t) => vista !== "mes" || fechaAR(t.inicio).slice(0, 7) === fecha.slice(0, 7),
  );
  const activos = delPeriodo.filter((t) => t.estado !== "cancelado");

  const irAlDia = (d: string) => {
    setFecha(d);
    setVista("dia");
  };

  // Agrupar por fecha (para "45 días")
  const porDia = new Map<string, Turno[]>();
  (turnos ?? []).forEach((t) => {
    const d = fechaAR(t.inicio);
    porDia.set(d, [...(porDia.get(d) ?? []), t]);
  });

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
          {vista !== "proximos" ? (
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
          ) : (
            <span className="adm-muted adm-chico">Desde hoy hasta el {fechaCorta(sumarDias(hoy, DIAS_PROXIMOS - 1))}</span>
          )}
          <div className="adm-seg" role="group" aria-label="Vista">
            {VISTAS.map((v) => (
              <button key={v.valor} type="button" aria-pressed={vista === v.valor} onClick={() => setVista(v.valor)}>
                {v.etiqueta}
              </button>
            ))}
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
                <button type="button" className={`adm-dia-cab ${d === hoy ? "hoy" : ""}`} onClick={() => irAlDia(d)}>
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

      {turnos && vista === "mes" && (
        <div className="adm-mes">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
            <div key={dow} className="adm-mes-dow">{DOW_CORTO[dow]}</div>
          ))}
          {(() => {
            const celdas: string[] = [];
            for (let d = desde; d < hasta; d = sumarDias(d, 1)) celdas.push(d);
            return celdas.map((d) => {
              const delDia = (porDia.get(d) ?? []).filter((t) => t.estado !== "cancelado" || verCancelados);
              const fuera = d.slice(0, 7) !== fecha.slice(0, 7);
              const pendientesDia = delDia.filter((t) => t.estado === "pendiente").length;
              return (
                <button
                  key={d}
                  type="button"
                  className={`adm-mes-celda ${fuera ? "fuera" : ""} ${d === hoy ? "hoy" : ""}`}
                  onClick={() => irAlDia(d)}
                  aria-label={`${fechaLarga(d)}: ${delDia.length} turnos`}
                >
                  <span className="num">{partesFecha(d).dia}</span>
                  {delDia.length > 0 && (
                    <span className="cuenta">
                      {delDia.length}
                      {pendientesDia > 0 && <i title="Por confirmar" />}
                    </span>
                  )}
                  <span className="items">
                    {delDia.slice(0, MAX_EN_CELDA).map((t) => (
                      <span key={t.id} className={`estado-${t.estado}`}>
                        {horaAR(t.inicio)} {t.paciente_nombre.split(" ")[0]}
                      </span>
                    ))}
                    {delDia.length > MAX_EN_CELDA && <span className="mas">+{delDia.length - MAX_EN_CELDA} más</span>}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      )}

      {turnos && vista === "proximos" && (
        <div className="adm-pila">
          {porDia.size === 0 && <div className="adm-card adm-vacio">No hay turnos en los próximos {DIAS_PROXIMOS} días.</div>}
          {Array.from(porDia.entries()).map(([d, lista]) => (
            <div key={d} className="adm-pila" style={{ gap: 8 }}>
              <button type="button" className="adm-grupo-dia" onClick={() => irAlDia(d)}>
                {d === hoy ? "Hoy · " : ""}
                {mayuscula(fechaLarga(d))}
                <span className="adm-tag">{lista.filter((t) => t.estado !== "cancelado").length}</span>
              </button>
              <div className="adm-lista-turnos">
                {lista.map((t) => (
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
            </div>
          ))}
        </div>
      )}

      {turnoSel && <DetalleTurno turno={turnoSel} onClose={() => setSeleccionado(null)} onCambio={cargar} />}

      {creando && (
        <NuevoTurno
          fechaInicial={vista === "proximos" ? hoy : fecha}
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
