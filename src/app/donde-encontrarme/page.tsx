import type { Metadata } from "next";
import Onda from "@/components/Onda";
import Consultorios from "@/components/Consultorios";
import { getConsultorios, getTiposConsulta } from "@/lib/data";

export const metadata: Metadata = {
  title: "Dónde encontrarme",
  description: "Consultorios de la Lic. Julieta Cano y reserva de turnos online.",
};

// Vuelve a leer consultorios y tipos de consulta cada 60 segundos.
export const revalidate = 60;

export default async function DondeEncontrarme() {
  const [{ consultorios, enVivo }, tipos] = await Promise.all([getConsultorios(), getTiposConsulta()]);

  const conAgenda = consultorios.filter((c) => c.modalidad === "agenda");
  const porWhatsapp = consultorios.filter((c) => c.modalidad === "whatsapp");
  const nombres = (lista: string[]) =>
    lista.length <= 1 ? lista.join("") : `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
  const clinicas = consultorios.filter((c) => c.modalidad === "clinica");

  return (
    <>
      <section className="hero-pagina">
        <div className="contenedor contenido" data-reveal>
          <span className="eyebrow" style={{ color: "var(--crema)" }}>Consultorios</span>
          <h1 className="titulo-hero">
            Dónde <em>encontrarme</em>
          </h1>
          <p className="lead">
            {conAgenda.length > 0 && (
              <>
                En <strong>{nombres(conAgenda.map((c) => c.nombre))}</strong> reservás directo en mi agenda.{" "}
              </>
            )}
            {porWhatsapp.length > 0 && (
              <>
                <strong>{nombres(porWhatsapp.map((c) => c.nombre))}</strong>: coordinamos día y horario por WhatsApp.{" "}
              </>
            )}
            {clinicas.length > 0 && (
              <>
                En <strong>{nombres(clinicas.map((c) => c.nombre))}</strong>, el turno se coordina con la clínica.
              </>
            )}
          </p>
        </div>
        <Onda trazo="abajoA" posicion="abajo" />
      </section>

      <Consultorios consultorios={consultorios} tipos={tipos} reservaDisponible={enVivo && tipos.length > 0} />
    </>
  );
}
