"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import SoloAdmin from "@/components/admin/SoloAdmin";
import { useAdmin, mensajeError } from "@/lib/admin/contexto";

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  disponible: boolean;
  orden: number;
};

type Borrador = Omit<Producto, "id"> & { id?: string };

const MAX_MB = 3;

function Productos() {
  const { sb } = useAdmin();
  const [lista, setLista] = useState<Producto[] | null>(null);
  const [editando, setEditando] = useState<Borrador | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from("productos")
      .select("id, nombre, descripcion, foto_url, disponible, orden")
      .order("orden");
    if (error) setError(mensajeError(error));
    setLista((data ?? []) as Producto[]);
  }, [sb]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function subirFoto(file: File): Promise<string> {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("productos").upload(ruta, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    return sb.storage.from("productos").getPublicUrl(ruta).data.publicUrl;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    setError(null);
    try {
      let foto_url = editando.foto_url;
      if (archivo) foto_url = await subirFoto(archivo);
      const fila = {
        nombre: editando.nombre.trim(),
        descripcion: editando.descripcion?.trim() || null,
        foto_url,
        disponible: editando.disponible,
        orden: Number(editando.orden) || 0,
      };
      const { error } = editando.id
        ? await sb.from("productos").update(fila).eq("id", editando.id)
        : await sb.from("productos").insert(fila);
      if (error) throw new Error(mensajeError(error));
      setEditando(null);
      setArchivo(null);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(p: Producto) {
    if (!window.confirm(`¿Borrar "${p.nombre}"?`)) return;
    const { error } = await sb.from("productos").delete().eq("id", p.id);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  async function alternar(p: Producto) {
    const { error } = await sb.from("productos").update({ disponible: !p.disponible }).eq("id", p.id);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setEditando((b) => (b ? { ...b, [k]: v } : b));

  return (
    <>
      <div className="adm-cabecera">
        <h1 className="adm-h1">Productos</h1>
        <button
          type="button"
          className="adm-btn adm-btn-primario"
          onClick={() => {
            setArchivo(null);
            setError(null);
            setEditando({ nombre: "", descripcion: "", foto_url: null, disponible: true, orden: (lista?.length ?? 0) + 1 });
          }}
        >
          + Producto
        </button>
      </div>
      <p className="adm-muted">
        Se muestran en la web los productos <b>disponibles</b>. Sin precios: el botón abre WhatsApp. Si no hay ninguno
        disponible, la página muestra &quot;próximamente&quot;.
      </p>
      {error && !editando && <p className="adm-error">{error}</p>}

      <div className="adm-card adm-tabla-wrap">
        {lista === null && <p className="adm-muted">Cargando…</p>}
        {lista && lista.length === 0 && <p className="adm-muted">Todavía no hay productos.</p>}
        {lista && lista.length > 0 && (
          <table className="adm-tabla">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>En la web</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 64 }}>
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                    ) : (
                      <span className="adm-muted">—</span>
                    )}
                  </td>
                  <td>
                    <b style={{ fontWeight: 500 }}>{p.nombre}</b>
                    <div className="adm-muted adm-chico">{p.descripcion}</div>
                  </td>
                  <td>
                    <label className="adm-check">
                      <input type="checkbox" checked={p.disponible} onChange={() => alternar(p)} />
                      {p.disponible ? "Disponible" : "Oculto"}
                    </label>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button type="button" className="adm-btn adm-btn-chico" onClick={() => { setArchivo(null); setError(null); setEditando({ ...p }); }}>
                      Editar
                    </button>{" "}
                    <button type="button" className="adm-btn adm-btn-chico adm-btn-peligro" onClick={() => borrar(p)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <Modal titulo={editando.id ? "Editar producto" : "Nuevo producto"} onClose={() => setEditando(null)}>
          <form className="adm-form" onSubmit={guardar}>
            <label className="adm-campo">
              <span>Nombre</span>
              <input value={editando.nombre} onChange={(e) => set("nombre", e.target.value)} required />
            </label>
            <label className="adm-campo">
              <span>Descripción corta</span>
              <textarea value={editando.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
            </label>
            <label className="adm-campo">
              <span>Foto (JPG, PNG o WEBP, hasta {MAX_MB} MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_MB * 1024 * 1024) {
                    setError(`La foto pesa más de ${MAX_MB} MB.`);
                    e.target.value = "";
                    return;
                  }
                  setError(null);
                  setArchivo(f);
                }}
              />
            </label>
            {editando.foto_url && !archivo && (
              <div className="adm-fila">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editando.foto_url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />
                <button type="button" className="adm-link adm-chico" onClick={() => set("foto_url", null)}>Quitar foto</button>
              </div>
            )}
            <div className="adm-grid-2">
              <label className="adm-check">
                <input type="checkbox" checked={editando.disponible} onChange={(e) => set("disponible", e.target.checked)} />
                Disponible (se ve en la web)
              </label>
              <label className="adm-campo">
                <span>Orden</span>
                <input type="number" min={0} value={editando.orden} onChange={(e) => set("orden", Number(e.target.value))} />
              </label>
            </div>
            {error && <p className="adm-error">{error}</p>}
            <button type="submit" className="adm-btn adm-btn-primario" disabled={guardando || !editando.nombre.trim()}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return (
    <SoloAdmin>
      <Productos />
    </SoloAdmin>
  );
}
