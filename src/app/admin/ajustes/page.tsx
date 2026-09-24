"use client";

import { useCallback, useEffect, useState } from "react";
import SoloAdmin from "@/components/admin/SoloAdmin";
import { type TipoAdmin, useAdmin, mensajeError } from "@/lib/admin/contexto";

type Config = {
  anticipacion_min_horas: number;
  anticipacion_max_dias: number;
  max_turnos_futuros_por_telefono: number;
};

function Ajustes() {
  const { sb, recargarCatalogos } = useAdmin();
  const [tipos, setTipos] = useState<TipoAdmin[] | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaDuracion, setNuevaDuracion] = useState(30);

  const cargar = useCallback(async () => {
    const [{ data: t, error: e1 }, { data: c, error: e2 }] = await Promise.all([
      sb.from("tipos_consulta").select("id, nombre, duracion_min, activo, orden").order("orden"),
      sb.from("configuracion").select("anticipacion_min_horas, anticipacion_max_dias, max_turnos_futuros_por_telefono").eq("id", 1).single(),
    ]);
    if (e1 || e2) setError(mensajeError(e1 ?? e2));
    setTipos((t ?? []) as TipoAdmin[]);
    setConfig((c as Config | null) ?? null);
  }, [sb]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function actualizarTipo(id: string, cambios: Partial<TipoAdmin>) {
    setError(null);
    const { error } = await sb.from("tipos_consulta").update(cambios).eq("id", id);
    if (error) return setError(mensajeError(error));
    await cargar();
    await recargarCatalogos();
  }

  async function agregarTipo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await sb
      .from("tipos_consulta")
      .insert({ nombre: nuevoNombre.trim(), duracion_min: nuevaDuracion, orden: (tipos?.length ?? 0) + 1 });
    if (error) return setError(mensajeError(error));
    setNuevoNombre("");
    await cargar();
    await recargarCatalogos();
  }

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setError(null);
    setOk(null);
    const { error } = await sb.from("configuracion").update(config).eq("id", 1);
    if (error) return setError(mensajeError(error));
    setOk("Ajustes guardados.");
  }

  return (
    <>
      <h1 className="adm-h1">Ajustes</h1>
      {error && <p className="adm-error">{error}</p>}

      <div className="adm-card adm-pila">
        <h2 className="adm-h2">Tipos de consulta</h2>
        <p className="adm-muted adm-chico">La duración define qué horarios quedan libres. Los inactivos no se ofrecen en la web.</p>
        {tipos === null ? (
          <p className="adm-muted">Cargando…</p>
        ) : (
          <div className="adm-tabla-wrap">
            <table className="adm-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Duración</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        className="adm-input"
                        defaultValue={t.nombre}
                        onBlur={(e) => e.target.value.trim() && e.target.value !== t.nombre && actualizarTipo(t.id, { nombre: e.target.value.trim() })}
                      />
                    </td>
                    <td>
                      <select
                        className="adm-input"
                        value={t.duracion_min}
                        onChange={(e) => actualizarTipo(t.id, { duracion_min: Number(e.target.value) })}
                      >
                        {[15, 20, 30, 40, 45, 60, 90].map((m) => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="adm-check">
                        <input type="checkbox" checked={t.activo} onChange={(e) => actualizarTipo(t.id, { activo: e.target.checked })} />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form className="adm-fila" onSubmit={agregarTipo}>
          <input className="adm-input" placeholder="Nuevo tipo de consulta" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required />
          <select className="adm-input" value={nuevaDuracion} onChange={(e) => setNuevaDuracion(Number(e.target.value))}>
            {[15, 20, 30, 40, 45, 60, 90].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
          <button type="submit" className="adm-btn adm-btn-oscuro" disabled={!nuevoNombre.trim()}>Agregar</button>
        </form>
      </div>

      {config && (
        <form className="adm-card adm-form" onSubmit={guardarConfig}>
          <h2 className="adm-h2">Reglas de reserva online</h2>
          <div className="adm-grid-2">
            <label className="adm-campo">
              <span>Anticipación mínima (horas)</span>
              <input
                type="number"
                min={0}
                max={168}
                value={config.anticipacion_min_horas}
                onChange={(e) => setConfig({ ...config, anticipacion_min_horas: Number(e.target.value) })}
              />
            </label>
            <label className="adm-campo">
              <span>Se puede reservar hasta (días)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={config.anticipacion_max_dias}
                onChange={(e) => setConfig({ ...config, anticipacion_max_dias: Number(e.target.value) })}
              />
            </label>
            <label className="adm-campo">
              <span>Turnos futuros por teléfono</span>
              <input
                type="number"
                min={1}
                max={10}
                value={config.max_turnos_futuros_por_telefono}
                onChange={(e) => setConfig({ ...config, max_turnos_futuros_por_telefono: Number(e.target.value) })}
              />
            </label>
          </div>
          {ok && <p className="adm-ok">{ok}</p>}
          <button type="submit" className="adm-btn adm-btn-primario" style={{ alignSelf: "flex-start" }}>Guardar</button>
        </form>
      )}
    </>
  );
}

export default function Page() {
  return (
    <SoloAdmin>
      <Ajustes />
    </SoloAdmin>
  );
}
