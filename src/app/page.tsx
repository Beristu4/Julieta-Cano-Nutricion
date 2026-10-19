import Link from "next/link";
import Foto from "@/components/Foto";
import Onda from "@/components/Onda";
import { WHATSAPP_VISIBLE, waLink } from "@/lib/site";

type Grupo = {
  num: string;
  titulo: string;
  bajada: string;
  items: string[];
  destacado?: boolean;
};

const GRUPOS: Grupo[] = [
  {
    num: "01",
    titulo: "Deporte y rendimiento",
    bajada: "Nutrición basada en evidencia para entrenar, competir y recuperarte mejor.",
    items: ["Nutrición deportiva para chicos, adolescentes y adultos", "Antropometría ISAK"],
    destacado: true,
  },
  {
    num: "02",
    titulo: "Etapas de la mujer",
    bajada: "Acompañamiento en los momentos de cambio.",
    items: ["Embarazo", "Preparación integral para el nacimiento", "Menopausia"],
  },
  {
    num: "03",
    titulo: "Nutrición para tu día a día",
    bajada: "Alimentación real, flexible y sostenible.",
    items: ["Mejorar tus hábitos sin dietas restrictivas ni recetas mágicas"],
  },
];

export default function Home() {
  return (
    <>
      <section id="inicio" className="hero">
        <div className="contenedor hero-grid">
          <div className="hero-texto" data-reveal>
            <span className="eyebrow" style={{ color: "var(--crema)" }}>Lic. en Nutrición</span>
            <h1 className="titulo-hero">
              Aprender a comer, <em>en cada etapa</em>
            </h1>
            <p className="lead">
              Nutrición basada en evidencia, <strong>especializada en deporte</strong>. Te acompaño si entrenás, si
              estás embarazada, en la menopausia o si querés mejorar tus hábitos en tu día a día.{" "}
              <strong>Atención presencial en distintas partes de Mendoza y online.</strong>
            </p>
            <div className="acciones">
              <Link className="btn btn-primario" href="/donde-encontrarme">Agendar turno</Link>
              <a className="link-subrayado" href="#servicios">Ver servicios</a>
            </div>
          </div>
          <div className="hero-foto" data-reveal data-reveal-delay="150">
            <div className="marco-arco">
              <Foto src="/img/julieta.png" alt="Julieta Cano" placeholder="Foto de Julieta" />
            </div>
          </div>
        </div>
        <Onda trazo="abajoA" posicion="abajo" />
      </section>

      <section id="sobre" className="sobre">
        <div className="sobre-texto" data-reveal>
          <span className="eyebrow" style={{ color: "var(--terracota)" }}>Sobre mí</span>
          <h2 className="titulo-seccion">
            Hola, soy <em>Julieta</em>.
          </h2>
          <p className="texto">
            Soy <strong>nutricionista, antropometrista ISAK 1</strong> y me formé en nutrición deportiva con{" "}
            <strong>Francis Holway</strong> y otros referentes de nutrición deportiva. Trabajo en el{" "}
            <strong>Hospital Italiano de Mendoza</strong> y atiendo en consultorio presencial y online.
          </p>
          <p className="texto">
            Realizo <strong>deporte competitivo desde muy chica</strong>: sé lo que es entrenar, competir y no saber
            bien qué comer.
          </p>
          <p className="texto">
            Pero el deporte es solo una parte. Acompaño también el embarazo, la preparación para el nacimiento, la
            menopausia y a quien simplemente quiere comer mejor. Porque creo que el gran desafío es{" "}
            <strong>aprender a comer, en cada etapa de la vida</strong>, sin dietas restrictivas ni recetas mágicas.
          </p>
        </div>
        <div className="sobre-fotos" data-reveal data-reveal-delay="150">
          <div><Foto src="/img/sobre-1.jpg" alt="Julieta Cano" placeholder="Foto de Julieta" /></div>
          <div><Foto src="/img/sobre-2.jpg" alt="Consultorio" placeholder="Consultorio" /></div>
          <div><Foto src="/img/sobre-3.jpg" alt="Comida saludable" placeholder="Comida / detalle" /></div>
        </div>
      </section>

      <section id="servicios" className="servicios">
        <Onda trazo="arribaA" posicion="arriba" />
        <div className="contenedor">
          <div className="servicios-cabecera" data-reveal>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span className="eyebrow" style={{ color: "var(--oliva)" }}>Qué ofrezco</span>
              <h2 className="titulo-seccion" style={{ color: "var(--crema)" }}>Servicios</h2>
            </div>
            <p>Un abordaje integral para acompañarte en cada etapa.</p>
          </div>
          <div className="servicios-grupos">
            {GRUPOS.map((g) => (
              <div key={g.num} className={`grupo ${g.destacado ? "destacado" : ""}`} data-reveal data-reveal-stagger>
                <span className="num">{g.num}</span>
                <h3>{g.titulo}</h3>
                <p className="bajada">{g.bajada}</p>
                <ul>
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <Onda trazo="abajoB" posicion="abajo" />
      </section>

      <section id="contacto" className="contacto">
        <div className="contenido" data-reveal>
          <span className="eyebrow" style={{ color: "var(--terracota)" }}>Turnos</span>
          <h2>
            Empecemos <em>tu proceso</em>
          </h2>
          <p className="texto">
            Reservá online en <Link href="/donde-encontrarme">mis consultorios</Link> o escribime por WhatsApp y
            coordinamos tu primera consulta. Respondo personalmente.
          </p>
          <div className="acciones" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primario" href="/donde-encontrarme">Reservar turno</Link>
            <a className="btn btn-wpp" href={waLink("Hola Julieta! Quiero reservar un turno")} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
          <p className="telefono">{WHATSAPP_VISIBLE}</p>
        </div>
      </section>
    </>
  );
}
