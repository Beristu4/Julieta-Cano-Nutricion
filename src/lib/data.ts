import { getSupabase } from "./supabase";
import type { Consultorio, Producto, TipoConsulta } from "./tipos";

// Datos de respaldo: se usan si Supabase no está configurado o no responde.
// Así el sitio público nunca queda vacío.
const CONSULTORIOS_RESPALDO: Consultorio[] = [
  { id: "sar", nombre: "Sar Salud Integral", direccion: null, detalle: "Dirección y horarios a confirmar.", link_mapa: null, whatsapp_clinica: null, reserva_online: true, orden: 1 },
  { id: "cdd", nombre: "Centro de Diagnóstico", direccion: null, detalle: "Dirección y horarios a confirmar.", link_mapa: null, whatsapp_clinica: null, reserva_online: true, orden: 2 },
  { id: "online", nombre: "Turnos Online", direccion: null, detalle: "Consulta por videollamada, desde donde estés.", link_mapa: null, whatsapp_clinica: null, reserva_online: true, orden: 3 },
  { id: "sandona", nombre: "Clínica San Dóna", direccion: null, detalle: "Dirección y horarios a confirmar.", link_mapa: null, whatsapp_clinica: null, reserva_online: false, orden: 4 },
  { id: "italiano", nombre: "Hospital Italiano", direccion: null, detalle: "Dirección y horarios a confirmar.", link_mapa: null, whatsapp_clinica: null, reserva_online: false, orden: 5 },
];

export async function getConsultorios(): Promise<{ consultorios: Consultorio[]; enVivo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { consultorios: CONSULTORIOS_RESPALDO, enVivo: false };
  const { data, error } = await sb
    .from("consultorios")
    .select("id, nombre, direccion, detalle, link_mapa, whatsapp_clinica, reserva_online, orden")
    .eq("activo", true)
    .order("orden");
  if (error || !data) {
    console.error("getConsultorios", error?.message);
    return { consultorios: CONSULTORIOS_RESPALDO, enVivo: false };
  }
  return { consultorios: data as Consultorio[], enVivo: true };
}

export async function getTiposConsulta(): Promise<TipoConsulta[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("tipos_consulta")
    .select("id, nombre, duracion_min, orden")
    .eq("activo", true)
    .order("orden");
  if (error || !data) {
    console.error("getTiposConsulta", error?.message);
    return [];
  }
  return data as TipoConsulta[];
}

export async function getProductos(): Promise<Producto[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("productos")
    .select("id, nombre, descripcion, foto_url, orden")
    .eq("disponible", true)
    .order("orden");
  if (error || !data) {
    console.error("getProductos", error?.message);
    return [];
  }
  return data as Producto[];
}
