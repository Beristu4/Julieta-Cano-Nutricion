"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin, mensajeError } from "@/lib/admin/contexto";
import { aISO, fechaAR, fechaCorta, horaAR, hoyAR, sumarDias } from "@/lib/fechas";

type Bloqueo = {
  id: string;
  consultorio_id: string | null;
  desde: string;
  hasta: string;
  motivo: string | null;
};

export default function Bloqueos() {
  const { sb, esAdmin, consultorios } = useAdmin();
  const [bloqueos, setBloqueos] = useState<Bloqueo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [consultorioId, setConsultorioId] = useState<string>(esAdmin ? "todos" : consultorios[0]?.id ?? "");
  const [fDesde, setFDesde] = useState(hoyAR());
  const [fHasta, setFHasta] = useState(hoyAR());
  const [diaCompleto, setDiaCompleto] = useState(true);
  const [hDesde, setHDesde] = useState("09:00");
  const [hHasta, setHHasta] = useState("13:00");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from("bloqueos")
      .select("id, consultorio_id, desde, hasta, motivo")
      .gte("hasta", new Date().toISOString())
      .order("desde");
    if (error) setError(mensajeError(error));
    setBloqueos((data ?? []) as Bloqueo[]);
  }, [sb]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    const desde = diaCompleto ? aISO(fDesde) : aISO(fDesde, hDesde);
    const hasta = diaCompleto ? aISO(sumarDias(fHasta, 1)) : aISO(fHasta, hHasta);
    if (desde >= hasta) return setError("El fin tiene que ser posterior al inicio.");

    setGuardando(true);
    const cid = consultorioId === "todos" ? null : consultorioId;
    const { error } = await sb.from("bloqueos").insert({ consultorio_id: cid, desde, hasta, motivo: motivo.trim() || null });
    if (error) {
      setGuardando(false);
      return setError(mensajeError(error));
    }

    // ¿Quedaron turnos dentro del bloqueo?
    let q = sb
      .from("turnos")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente", "confirmado"])
      .lt("inicio", hasta)
      .gt("fin", desde);
    if (cid) q = q.eq("consultorio_id", cid);
    const { count } = await q;
    setGuardando(false);
    if (count && count > 0) {
      setAviso(`Ojo: hay ${count} turno(s) ya dados dentro de ese bloqueo. Revisalos en la Agenda para reprogramarlos o cancelarlos.`);
    }
    setMotivo("");
    cargar();
  }

  async function borrar(id: string) {
    if (!window.confirm("¿Quitar este bloqueo? Esos horarios vuelven a estar disponibles.")) return;
    const { error } = await sb.from("bloqueos").delete().eq("id", id);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  const nombre = (id: string | null) => (id ? consultorios.find((c) => c.id === id)?.nombre ?? "Otro consultorio" : "Todos");

  function rango(b: Bloqueo) {
    const d = fechaAR(b.desde);
    const hIni = horaAR(b.desde);
    const finMenos = new Date(new Date(b.hasta).getTime() - 1).toISOString();
    const h = fechaAR(finMenos);
    const hFin = horaAR(b.hasta);
    const completo = hIni === "00:00" && hFin === "00:00";
    if (completo) return d === h ? `${fechaCorta(d)} (todo el día)` : `${fechaCorta(d)} → ${fechaCorta(h)}`;
    return d === fechaAR(b.hasta)
      ? `${fechaCorta(d)} · ${hIni}–${hFin}`
      : `${fechaCorta(d)} ${hIni} → ${fechaCorta(fechaAR(b.hasta))} ${hFin}`;
  }

  return (
    <>
      <h1 className="adm-h1">Bloqueos</h1>
      <p className="adm-muted">Vacaciones, feriados o ausencias. Durante un bloqueo no se pueden reservar turnos.</p>

      <form className="adm-card adm-form" onSubmit={agregar}>
        <h2 className="adm-h2">Nuevo bloqueo</h2>
        <div className="adm-grid-2">
          <label className="adm-campo">
            <span>Consultorio</span>
            <select value={consultorioId} onChange={(e) => setConsultorioId(e.target.value)}>
              {esAdmin && <option value="todos">Todos</option>}
              {consultorios.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="adm-campo">
            <span>Motivo (opcional)</span>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Vacaciones, feriado…" />
          </label>
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={diaCompleto} onChange={(e) => setDiaCompleto(e.target.checked)} />
          Días completos
        </label>
        <div className="adm-grid-2">
          <label className="adm-campo">
            <span>Desde</span>
            <input type="date" value={fDesde} onChange={(e) => { setFDesde(e.target.value); if (e.target.value > fHasta) setFHasta(e.target.value); }} required />
          </label>
          {!diaCompleto && (
            <label className="adm-campo">
              <span>Hora desde</span>
              <input type="time" value={hDesde} onChange={(e) => setHDesde(e.target.value)} required />
            </label>
          )}
          <label className="adm-campo">
            <span>Hasta</span>
            <input type="date" value={fHasta} min={fDesde} onChange={(e) => setFHasta(e.target.value)} required />
          </label>
          {!diaCompleto && (
            <label className="adm-campo">
              <span>Hora hasta</span>
              <input type="time" value={hHasta} onChange={(e) => setHHasta(e.target.value)} required />
            </label>
          )}
        </div>
        {error && <p className="adm-error">{error}</p>}
        {aviso && <p className="adm-error">{aviso}</p>}
        <button type="submit" className="adm-btn adm-btn-primario" style={{ alignSelf: "flex-start" }} disabled={guardando || !consultorioId}>
          Bloquear
        </button>
      </form>

      <div className="adm-card">
        <h2 className="adm-h2" style={{ marginBottom: 12 }}>Próximos bloqueos</h2>
        {bloqueos === null && <p className="adm-muted">Cargando…</p>}
        {bloqueos && bloqueos.length === 0 && <p className="adm-muted">No hay bloqueos cargados.</p>}
        {bloqueos && bloqueos.length > 0 && (
          <div className="adm-tabla-wrap">
            <table className="adm-tabla">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Consultorio</th>
                  <th>Motivo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bloqueos.map((b) => {
                  const puede = esAdmin || (b.consultorio_id !== null && consultorios.some((c) => c.id === b.consultorio_id));
                  return (
                    <tr key={b.id}>
                      <td>{rango(b)}</td>
                      <td>{nombre(b.consultorio_id)}</td>
                      <td className="adm-muted">{b.motivo ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        {puede && (
                          <button type="button" className="adm-btn adm-btn-chico adm-btn-peligro" onClick={() => borrar(b.id)}>
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
