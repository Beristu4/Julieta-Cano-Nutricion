import type { Metadata } from "next";
import Onda from "@/components/Onda";
import Foto from "@/components/Foto";
import { getProductos } from "@/lib/data";
import { waLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Productos",
  description: "Productos de la Lic. Julieta Cano. Consultas y pedidos por WhatsApp.",
};

export const revalidate = 60;

export default async function Productos() {
  const productos = await getProductos();

  if (productos.length === 0) {
    return (
      <section className="hero-pagina" style={{ minHeight: "calc(100vh - 200px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="contenedor contenido" data-reveal style={{ width: "100%" }}>
          <span className="eyebrow" style={{ color: "var(--crema)" }}>Productos</span>
          <h1 className="titulo-hero">
            próxima<em>mente</em>
          </h1>
          <p className="lead">
            Estoy preparando productos para <strong>acompañarte también fuera de la consulta</strong>.
          </p>
          <div className="acciones" style={{ marginTop: 6 }}>
            <a
              className="btn btn-primario"
              href={waLink("Hola Julieta! Quiero enterarme cuando salgan tus productos")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Avisame cuando estén
            </a>
          </div>
        </div>
        <Onda trazo="abajoA" posicion="abajo" />
      </section>
    );
  }

  return (
    <>
      <section className="hero-pagina">
        <div className="contenedor contenido" data-reveal>
          <span className="eyebrow" style={{ color: "var(--crema)" }}>Productos</span>
          <h1 className="titulo-hero">
            para tu <em>día a día</em>
          </h1>
          <p className="lead">
            Productos para <strong>acompañarte también fuera de la consulta</strong>. Consultá precios y
            disponibilidad por WhatsApp.
          </p>
        </div>
        <Onda trazo="abajoA" posicion="abajo" />
      </section>

      <section className="productos">
        <div className="grilla-productos">
          {productos.map((p) => (
            <article key={p.id} className="producto" data-reveal data-reveal-stagger>
              <div className="producto-foto">
                <Foto src={p.foto_url} alt={p.nombre} placeholder={p.nombre} />
              </div>
              <h3>{p.nombre}</h3>
              {p.descripcion && <p>{p.descripcion}</p>}
              <a
                className="btn btn-wpp"
                href={waLink(`Hola Julieta! Me interesa ${p.nombre}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
