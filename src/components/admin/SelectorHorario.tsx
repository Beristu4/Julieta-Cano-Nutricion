"use client";

import { useEffect, useState } from "react";
import { useAdmin, mensajeError } from "@/lib/admin/contexto";
import { aISO, horaAR } from "@/lib/fechas";

type Props = {
  consultorioId: string;
  tipoId: string;
  fecha: string;
  /** Turno a ignorar (al reprogramar, para que no choque consigo mismo). */
  excluirId?: string;
  /** Instante ISO elegido. */
  valor: string | null;
  onChange: (iso: string | null) => void;
};

/**
 * Muestra los horarios libres del día según la agenda del consultorio.
 * Permite además cargar un horario manual fuera de la grilla.
 */
export default function SelectorHorario({ consultorioId, tipoId, fecha, excluirId, valor, onChange }: Props) {
  const { sb } = useAdmin();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [horaManual, setHoraManual] = useState("");

  useEffect(() => {
    setSlots(null);
    setError(null);
    if (!consultorioId || !tipoId || !fecha) return;
    let vigente = true;
    sb.rpc("horarios_libres_staff", {
      p_consultorio: consultorioId,
      p_fecha: fecha,
      p_tipo: tipoId,
      p_excluir_turno: excluirId ?? null,
    }).then(({ data, error }) => {
      if (!vigente) return;
      if (error) {
        setError(mensajeError(error));
        setSlots([]);
        return;
      }
      setSlots(((data ?? []) as { hora_inicio: string }[]).map((r) => r.hora_inicio));
    });
    return () => {
      vigente = false;
    };
  }, [sb, consultorioId, tipoId, fecha, excluirId]);

  if (!consultorioId || !tipoId || !fecha) {
    return <p className="adm-muted adm-chico">Elegí consultorio, tipo de consulta y fecha.</p>;
  }

  return (
    <div className="adm-pila" style={{ gap: 8 }}>
      {!manual && (
        <>
          {slots === null && <p className="adm-muted adm-chico">Buscando horarios libres…</p>}
          {error && <p className="adm-error">{error}</p>}
          {slots && slots.length === 0 && !error && (
            <p className="adm-muted adm-chico">No hay horarios libres ese día según la agenda.</p>
          )}
          {slots && slots.length > 0 && (
            <div className="adm-slots">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="adm-slot"
                  aria-pressed={valor === s}
                  onClick={() => onChange(s)}
                >
                  {horaAR(s)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {manual && (
        <label className="adm-campo">
          <span>Hora (fuera de la grilla)</span>
          <input
            type="time"
            value={horaManual}
            onChange={(e) => {
              setHoraManual(e.target.value);
              onChange(e.target.value ? aISO(fecha, e.target.value) : null);
            }}
          />
        </label>
      )}
      <button
        type="button"
        className="adm-link adm-chico"
        style={{ alignSelf: "flex-start" }}
        onClick={() => {
          setManual((m) => !m);
          setHoraManual("");
          onChange(null);
        }}
      >
        {manual ? "Elegir de los horarios libres" : "Cargar otro horario a mano"}
      </button>
    </div>
  );
}
