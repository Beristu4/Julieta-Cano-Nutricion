"use client";

import { useCallback, useEffect, useState } from "react";
import SoloAdmin from "@/components/admin/SoloAdmin";
import { useAdmin, mensajeError } from "@/lib/admin/contexto";
import { DOW_LARGO } from "@/lib/fechas";

type Horario = {
  id: string;
  consultorio_id: string;
  dia_semana: number;
  desde: string;
  hasta: string;
  intervalo_min: number;
  semanas: number[] | null;
};

const SEMANAS = [
  { valor: 1, etiqueta: "1ª" },
  { valor: 2, etiqueta: "2ª" },
  { valor: 3, etiqueta: "3ª" },
  { valor: 4, etiqueta: "4ª" },
  { valor: 5, etiqueta: "5ª" },
  { valor: -1, etiqueta: "Última" },
];

function textoSemanas(semanas: number[] | null): string {
  if (!semanas || semanas.length === 0) return "";
  const nombres = SEMANAS.filter((s) => semanas.includes(s.valor)).map((s) => s.etiqueta.toLowerCase());
  return ` · solo ${nombres.join(", ")} del mes`;
}

// Lunes primero
const DIAS = [1, 2, 3, 4, 5, 6, 0];

function Horarios() {
  const { sb, consultorios } = useAdmin();
  const [consultorioId, setConsultorioId] = useState(consultorios[0]?.id ?? "");
  const [horarios, setHorarios] = useState<Horario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dias, setDias] = useState<number[]>([]);
  const [desde, setDesde] = useState("09:00");
  const [hasta, setHasta] = useState("12:00");
  const [intervalo, setIntervalo] = useState(30);
  const [todasLasSemanas, setTodasLasSemanas] = useState(true);
  const [semanas, setSemanas] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!consultorioId) return;
    const { data, error } = await sb
      .from("horarios")
      .select("id, consultorio_id, dia_semana, desde, hasta, intervalo_min, semanas")
      .eq("consultorio_id", consultorioId)
      .order("desde");
    if (error) setError(mensajeError(error));
    setHorarios((data ?? []) as Horario[]);
  }, [sb, consultorioId]);

  useEffect(() => {
    setHorarios(null);
    cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (dias.length === 0) return setError("Elegí al menos un día.");
    if (desde >= hasta) return setError("La hora de inicio tiene que ser anterior a la de fin.");
    if (!todasLasSemanas && semanas.length === 0) return setError("Elegí en qué semanas del mes atiende.");
    setGuardando(true);
    const { error } = await sb.from("horarios").insert(
      dias.map((d) => ({
        consultorio_id: consultorioId,
        dia_semana: d,
        desde,
        hasta,
        intervalo_min: intervalo,
        semanas: todasLasSemanas ? null : semanas,
      })),
    );
    setGuardando(false);
    if (error) return setError(mensajeError(error));
    setDias([]);
    setTodasLasSemanas(true);
    setSemanas([]);
    cargar();
  }

  async function borrar(id: string) {
    if (!window.confirm("¿Borrar este tramo? Los turnos ya dados no se tocan.")) return;
    const { error } = await sb.from("horarios").delete().eq("id", id);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  const hhmm = (t: string) => t.slice(0, 5);

  return (
    <>
      <div className="adm-cabecera">
        <h1 className="adm-h1">Horarios</h1>
        <select className="adm-input" value={consultorioId} onChange={(e) => setConsultorioId(e.target.value)} aria-label="Consultorio">
          {consultorios.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <p className="adm-muted">
        Plantilla semanal de atención. Los pacientes solo pueden reservar dentro de estos tramos. Para vacaciones o
        feriados usá <b>Bloqueos</b>.
      </p>

      {consultorios.length === 0 && <div className="adm-card adm-muted">No hay consultorios con agenda online.</div>}

      {horarios && (
        <div className="adm-card adm-tabla-wrap">
          <table className="adm-tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th>Tramos</th>
              </tr>
            </thead>
            <tbody>
              {DIAS.map((d) => {
                const tramos = horarios.filter((h) => h.dia_semana === d);
                return (
                  <tr key={d}>
                    <td style={{ textTransform: "capitalize", width: 120 }}>{DOW_LARGO[d]}</td>
                    <td>
                      {tramos.length === 0 && <span className="adm-muted">No atiende</span>}
                      <div className="adm-fila">
                        {tramos.map((h) => (
                          <span key={h.id} className="adm-tag" style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                            {hhmm(h.desde)}–{hhmm(h.hasta)} · cada {h.intervalo_min} min{textoSemanas(h.semanas)}
                            <button type="button" className="adm-link" aria-label="Borrar tramo" onClick={() => borrar(h.id)}>×</button>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {consultorioId && (
        <form className="adm-card adm-form" onSubmit={agregar}>
          <h2 className="adm-h2">Agregar tramo</h2>
          <div className="adm-fila">
            {DIAS.map((d) => (
              <label key={d} className="adm-check" style={{ textTransform: "capitalize" }}>
                <input
                  type="checkbox"
                  checked={dias.includes(d)}
                  onChange={(e) => setDias((xs) => (e.target.checked ? [...xs, d] : xs.filter((x) => x !== d)))}
                />
                {DOW_LARGO[d]}
              </label>
            ))}
          </div>
          <div className="adm-grid-2">
            <label className="adm-campo">
              <span>Desde</span>
              <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} required />
            </label>
            <label className="adm-campo">
              <span>Hasta</span>
              <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
            </label>
            <label className="adm-campo">
              <span>Un turno cada</span>
              <select value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} minutos</option>
                ))}
              </select>
            </label>
          </div>
          <div className="adm-campo">
            <span>¿Qué semanas del mes?</span>
            <div className="adm-fila">
              <label className="adm-check">
                <input type="radio" checked={todasLasSemanas} onChange={() => setTodasLasSemanas(true)} />
                Todas
              </label>
              <label className="adm-check">
                <input type="radio" checked={!todasLasSemanas} onChange={() => setTodasLasSemanas(false)} />
                Solo algunas
              </label>
            </div>
            {!todasLasSemanas && (
              <div className="adm-fila">
                {SEMANAS.map((s) => (
                  <label key={s.valor} className="adm-check">
                    <input
                      type="checkbox"
                      checked={semanas.includes(s.valor)}
                      onChange={(e) =>
                        setSemanas((xs) => (e.target.checked ? [...xs, s.valor] : xs.filter((x) => x !== s.valor)))
                      }
                    />
                    {s.etiqueta}
                  </label>
                ))}
              </div>
            )}
            {!todasLasSemanas && (
              <span className="adm-chico">
                Ej.: miércoles + 1ª = solo el primer miércoles de cada mes (días 1 al 7).
              </span>
            )}
          </div>
          <p className="adm-muted adm-chico">
            El último turno termina a la hora &quot;Hasta&quot;. Ej.: 9 a 12 con consultas de 60 min → último turno a las 11.
          </p>
          {error && <p className="adm-error">{error}</p>}
          <button type="submit" className="adm-btn adm-btn-primario" style={{ alignSelf: "flex-start" }} disabled={guardando}>
            Agregar
          </button>
        </form>
      )}
    </>
  );
}

export default function Page() {
  return (
    <SoloAdmin>
      <Horarios />
    </SoloAdmin>
  );
}
