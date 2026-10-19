"use client";

import { useState } from "react";
import ReservaModal from "./ReservaModal";
import { waClinica, waLink } from "@/lib/site";
import type { Consultorio, TipoConsulta } from "@/lib/tipos";

type Props = {
  consultorios: Consultorio[];
  tipos: TipoConsulta[];
  /** false si Supabase no está configurado: los botones derivan a WhatsApp. */
  reservaDisponible: boolean;
};

const num = (i: number) => String(i + 1).padStart(2, "0");

const ETIQUETA: Record<Consultorio["modalidad"], string> = {
  agenda: "Agenda online",
  whatsapp: "Coordinamos por WhatsApp",
  clinica: "Turnos por la clínica",
};

export default function Consultorios({ consultorios, tipos, reservaDisponible }: Props) {
  const [abierto, setAbierto] = useState<Consultorio | null>(null);

  // Tarjetas grandes: los que atiende Julieta directamente (agenda web o coordinando por WhatsApp)
  const propios = consultorios.filter((c) => c.modalidad !== "clinica");
  const clinicas = consultorios.filter((c) => c.modalidad === "clinica");

  function botonPrincipal(c: Consultorio) {
    if (c.modalidad === "agenda" && reservaDisponible) {
      return (
        <button type="button" className="btn btn-primario btn-chico" onClick={() => setAbierto(c)}>
          Reservar turno
        </button>
      );
    }
    const texto =
      c.modalidad === "whatsapp"
        ? `Hola Julieta! Quiero coordinar una consulta (${c.nombre}).`
        : `Hola Julieta! Quiero reservar un turno en ${c.nombre}`;
    return (
      <a className="btn btn-primario btn-chico" href={waLink(texto)} target="_blank" rel="noopener noreferrer">
        {c.modalidad === "whatsapp" ? "Coordinar por WhatsApp" : "Reservar turno"}
      </a>
    );
  }

  return (
    <section id="donde" className="lugares">
      {propios.length > 0 && (
        <div className="tarjetas">
          {propios.map((c, i) => (
            <div key={c.id} className="tarjeta-arco" data-reveal data-reveal-stagger>
              <span className="num">{num(i)}</span>
              <span className="etiqueta">{ETIQUETA[c.modalidad]}</span>
              <h3>{c.nombre}</h3>
              <p>
                {c.direccion && (
                  <>
                    {c.direccion}
                    <br />
                  </>
                )}
                {c.detalle}
              </p>
              {c.link_mapa && (
                <a className="mapa" href={c.link_mapa} target="_blank" rel="noopener noreferrer">
                  Ver mapa
                </a>
              )}
              {botonPrincipal(c)}
              {c.extra_whatsapp && (
                <a
                  className="extra-wpp"
                  href={waLink(`Hola Julieta! Te escribo por ${c.nombre}: `)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.extra_whatsapp}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {clinicas.length > 0 && (
        <>
          <div className="clinicas-cabecera" data-reveal>
            <div>
              <span className="eyebrow" style={{ color: "var(--terracota)" }}>Turnos por la clínica</span>
              <h2 className="titulo-seccion">
                También <em>atiendo en</em>
              </h2>
            </div>
            <p>El turno se coordina directamente con la clínica por WhatsApp.</p>
          </div>
          <div className="clinicas">
            {clinicas.map((c, i) => {
              const link = waClinica(c.whatsapp_clinica, c.nombre);
              return (
                <div key={c.id} className="clinica" data-reveal data-reveal-stagger>
                  <div className="clinica-info">
                    <span className="num">{num(i)}</span>
                    <div>
                      <h3>{c.nombre}</h3>
                      <p>{[c.direccion, c.detalle].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  {link && (
                    <a className="btn btn-contorno" href={link} target="_blank" rel="noopener noreferrer">
                      WhatsApp de la clínica
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {abierto && <ReservaModal consultorio={abierto} tipos={tipos} onClose={() => setAbierto(null)} />}
    </section>
  );
}
