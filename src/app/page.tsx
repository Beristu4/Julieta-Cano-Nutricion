import Link from "next/link";
import Foto from "@/components/Foto";
import Onda from "@/components/Onda";
import { WHATSAPP_VISIBLE, waLink } from "@/lib/site";

const SERVICIOS = [
  { num: "01", titulo: "Nutrición", desc: "Planes personalizados basados en alimentación real, flexible y sostenible en el tiempo." },
  { num: "02", titulo: "Nutrición deportiva", desc: "Estrategias de alimentación para acompañar tu rendimiento y tus objetivos deportivos." },
  { num: "03", titulo: "Nutrición en el embarazo", desc: "Una alimentación segura y sin culpa para cubrir tus necesidades y las de tu bebé en cada etapa." },
  { num: "04", titulo: "Antropometría", desc: "Medición y seguimiento de tu composición corporal para ajustar el plan con precisión." },
  { num: "05", titulo: "Preparación integral para el nacimiento", desc: "Acompañamiento para llegar al nacimiento con información, hábitos saludables y tranquilidad." },
  { num: "06", titulo: "Nutrición y menopausia", desc: "Alimentación para acompañar los cambios de esta etapa: energía, descanso, salud ósea y composición corporal." },
];

export default function Home() {
  return (
    <>
      <section id="inicio" className="hero">
        <div className="contenedor hero-grid">
          <div className="hero-texto" data-reveal>
            <span className="eyebrow" style={{ color: "var(--crema)" }}>Lic. en Nutrición</span>
            <h1 className="titulo-hero">
              alimentar tu bienestar, <em>a tu manera</em>
            </h1>
            <p className="lead">
              Acompañamiento nutricional <strong>cercano y personalizado</strong>. Planes pensados para{" "}
              <strong>tu cuerpo, tus objetivos y tu día a día</strong>.
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
            hola, soy <em>Julieta</em>.
          </h2>
          <p className="texto">
            Soy <strong>licenciada en nutrición</strong> y me dedico a acompañar a cada persona en su proceso,{" "}
            <strong>sin dietas restrictivas ni recetas mágicas</strong>. Creo en una alimentación{" "}
            <strong>real, flexible y sostenible</strong> en el tiempo.
          </p>
          <p className="texto">
            Acompaño desde la nutrición deportiva y la antropometría hasta el embarazo, la preparación para el
            nacimiento y la menopausia, con planes que se adaptan a vos y no al revés.
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
              <h2 className="titulo-seccion" style={{ color: "var(--crema)" }}>servicios</h2>
            </div>
            <p>Un abordaje integral para acompañarte en cada etapa.</p>
          </div>
          <div className="servicios-grilla">
            {SERVICIOS.map((s) => (
              <div key={s.num} className="servicio" data-reveal data-reveal-stagger>
                <span className="num">{s.num}</span>
                <h3>{s.titulo}</h3>
                <p>{s.desc}</p>
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
            empecemos <em>tu proceso</em>
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
