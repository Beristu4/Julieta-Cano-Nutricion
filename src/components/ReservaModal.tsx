"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ZONA_HORARIA, waLink } from "@/lib/site";
import type { Consultorio, TipoConsulta } from "@/lib/tipos";

type Props = {
  consultorio: Consultorio;
  tipos: TipoConsulta[];
  onClose: () => void;
};

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const fmtHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA_HORARIA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "2026-09-25" → partes de la fecha sin depender de la zona del navegador. */
function partes(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return { dia: d, mes: m - 1, dow };
}

const MENSAJES_ERROR: Record<string, string> = {
  horario_no_disponible: "Ese horario se acaba de ocupar. Elegí otro, por favor.",
  limite_turnos: "Ya tenés turnos reservados con ese teléfono. Si necesitás otro, escribime por WhatsApp.",
  datos_invalidos: "Revisá tu nombre y teléfono.",
};

type Estado = "form" | "enviando" | "listo";

export default function ReservaModal({ consultorio, tipos, onClose }: Props) {
  const sb = getSupabase();

  const [tipo, setTipo] = useState<TipoConsulta | null>(tipos.length === 1 ? tipos[0] : null);
  const [dias, setDias] = useState<string[] | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [horas, setHoras] = useState<string[] | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [estado, setEstado] = useState<Estado>("form");
  const [error, setError] = useState<string | null>(null);

  // Cerrar con Escape y bloquear el scroll de fondo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // 1. Tipo elegido → días con lugar
  useEffect(() => {
    setDias(null);
    setDia(null);
    if (!sb || !tipo) return;
    let vigente = true;
    sb.rpc("dias_disponibles", { p_consultorio: consultorio.id, p_tipo: tipo.id }).then(({ data, error }) => {
      if (!vigente) return;
      if (error) {
        setError("No pudimos cargar la agenda. Probá de nuevo en un rato.");
        setDias([]);
        return;
      }
      setDias(((data ?? []) as { fecha: string }[]).map((r) => r.fecha));
    });
    return () => {
      vigente = false;
    };
  }, [sb, consultorio.id, tipo]);

  // 2. Día elegido → horarios libres
  useEffect(() => {
    setHoras(null);
    setHora(null);
    if (!sb || !tipo || !dia) return;
    let vigente = true;
    sb.rpc("horarios_libres", { p_consultorio: consultorio.id, p_fecha: dia, p_tipo: tipo.id }).then(
      ({ data, error }) => {
        if (!vigente) return;
        if (error) {
          setError("No pudimos cargar los horarios. Probá de nuevo en un rato.");
          setHoras([]);
          return;
        }
        setHoras(((data ?? []) as { hora_inicio: string }[]).map((r) => r.hora_inicio));
      },
    );
    return () => {
      vigente = false;
    };
  }, [sb, consultorio.id, tipo, dia]);

  const telDigitos = telefono.replace(/\D/g, "");
  const listo = Boolean(tipo && dia && hora && nombre.trim().length > 1 && telDigitos.length >= 8);

  async function confirmar() {
    if (!sb || !tipo || !hora || !listo) return;
    setError(null);
    setEstado("enviando");
    const { error } = await sb.rpc("reservar_turno", {
      p_consultorio: consultorio.id,
      p_tipo: tipo.id,
      p_inicio: hora,
      p_nombre: nombre.trim(),
      p_telefono: telDigitos,
    });
    if (error) {
      const clave = Object.keys(MENSAJES_ERROR).find((k) => error.message.includes(k));
      setError(clave ? MENSAJES_ERROR[clave] : "No pudimos reservar el turno. Probá de nuevo o escribime por WhatsApp.");
      setEstado("form");
      if (clave === "horario_no_disponible" && dia) {
        // refrescar horarios
        const d = dia;
        setDia(null);
        setTimeout(() => setDia(d), 0);
      }
      return;
    }
    setEstado("listo");
  }

  const resumenDia = dia
    ? (() => {
        const p = partes(dia);
        return `${DOW_LARGO[p.dow]} ${p.dia} de ${MES_LARGO[p.mes]}`;
      })()
    : "";
  const resumenHora = hora ? fmtHora.format(new Date(hora)) : "";
  const mensajeWpp = `Hola Julieta! Reservé un turno por la web: ${resumenDia} a las ${resumenHora} hs en ${consultorio.nombre} (${tipo?.nombre ?? ""}). Soy ${nombre.trim()}.`;

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserva-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-cabecera">
          <div>
            <span className="eyebrow">Reservar turno</span>
            <h3 id="reserva-titulo">{consultorio.nombre}</h3>
          </div>
          <button type="button" className="modal-cerrar" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
          <svg className="modal-onda" viewBox="0 0 580 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,40 L0,20 C150,44 430,0 580,18 L580,40 Z" fill="var(--crema)" />
          </svg>
        </div>

        <div className="modal-cuerpo">
          {!sb && (
            <>
              <p className="aviso">La agenda online todavía no está disponible. Escribime y coordinamos tu turno.</p>
              <a
                className="btn btn-wpp"
                style={{ alignSelf: "flex-start" }}
                href={waLink(`Hola Julieta! Quiero reservar un turno en ${consultorio.nombre}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Escribir por WhatsApp
              </a>
            </>
          )}

          {sb && estado !== "listo" && (
            <>
              <div className="paso">
                <span className="paso-titulo"><em>01</em>Tipo de consulta</span>
                <div className="opciones">
                  {tipos.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="chip"
                      aria-pressed={tipo?.id === t.id}
                      onClick={() => setTipo(t)}
                    >
                      {t.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {tipo && (
                <div className="paso">
                  <span className="paso-titulo"><em>02</em>Elegí el día</span>
                  {dias === null && <span className="cargando">Buscando días disponibles…</span>}
                  {dias !== null && dias.length === 0 && (
                    <p className="aviso">
                      No hay turnos libres en las próximas semanas.{" "}
                      <a href={waLink(`Hola Julieta! Busco turno en ${consultorio.nombre}`)} target="_blank" rel="noopener noreferrer">
                        Escribime por WhatsApp
                      </a>{" "}
                      y lo vemos.
                    </p>
                  )}
                  {dias && dias.length > 0 && (
                    <div className="grilla-dias">
                      {dias.map((f) => {
                        const p = partes(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            className="chip chip-dia"
                            aria-pressed={dia === f}
                            aria-label={`${DOW_LARGO[p.dow]} ${p.dia} de ${MES_LARGO[p.mes]}`}
                            onClick={() => setDia(f)}
                          >
                            <span className="dow">{DOW[p.dow]}</span>
                            <span className="dia">{p.dia}</span>
                            <span className="mes">{MES[p.mes]}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {dia && (
                <div className="paso">
                  <span className="paso-titulo"><em>03</em>Elegí el horario</span>
                  {horas === null && <span className="cargando">Buscando horarios…</span>}
                  {horas !== null && horas.length === 0 && <p className="aviso">Ese día ya no tiene horarios libres.</p>}
                  {horas && horas.length > 0 && (
                    <div className="grilla-horas">
                      {horas.map((h) => (
                        <button
                          key={h}
                          type="button"
                          className="chip chip-hora"
                          aria-pressed={hora === h}
                          onClick={() => setHora(h)}
                        >
                          {fmtHora.format(new Date(h))}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hora && (
                <div className="paso">
                  <span className="paso-titulo"><em>04</em>Tus datos</span>
                  <input
                    className="campo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                    autoComplete="name"
                    maxLength={120}
                  />
                  <input
                    className="campo"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono (con código de área)"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={25}
                  />
                </div>
              )}

              {error && <p className="aviso aviso-error" role="alert">{error}</p>}

              <button
                type="button"
                className="btn btn-primario"
                disabled={!listo || estado === "enviando"}
                onClick={confirmar}
              >
                {estado === "enviando" ? "Reservando…" : "Confirmar turno"}
              </button>
            </>
          )}

          {sb && estado === "listo" && (
            <div className="paso" style={{ gap: 16 }}>
              <p className="listo-titulo">
                ¡listo, <em>{nombre.trim().split(" ")[0]}</em>! Tu turno quedó reservado.
              </p>
              <div className="resumen">
                <span>{resumenDia}</span>
                <span>
                  {resumenHora} hs · {consultorio.nombre}
                </span>
                <span>{tipo?.nombre}</span>
              </div>
              <p className="aviso">Te vamos a escribir para confirmarlo. Si querés, avisale a Julieta ahora:</p>
              <a
                className="btn btn-wpp"
                style={{ alignSelf: "flex-start" }}
                href={waLink(mensajeWpp)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Avisar a Julieta por WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
