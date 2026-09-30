"use client";

import { createContext, useContext } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Rol = "admin" | "secretaria";
export type EstadoTurno = "pendiente" | "confirmado" | "cancelado" | "ausente" | "atendido";

export type Perfil = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: Rol;
  activo: boolean;
};

export type Modalidad = "agenda" | "whatsapp" | "clinica";

export type ConsultorioAdmin = {
  id: string;
  nombre: string;
  reserva_online: boolean;
  modalidad: Modalidad;
  activo: boolean;
  orden: number;
};

export type TipoAdmin = {
  id: string;
  nombre: string;
  duracion_min: number;
  activo: boolean;
  orden: number;
};

export type Turno = {
  id: string;
  consultorio_id: string;
  tipo_consulta_id: string;
  inicio: string;
  fin: string;
  paciente_nombre: string;
  paciente_telefono: string;
  estado: EstadoTurno;
  origen: "web" | "secretaria";
  notas: string | null;
  creado_en: string;
};

export type AdminCtx = {
  sb: SupabaseClient;
  user: User;
  perfil: Perfil;
  esAdmin: boolean;
  /** Consultorios propios (agenda web o por WhatsApp) que este usuario puede gestionar. */
  consultorios: ConsultorioAdmin[];
  tipos: TipoAdmin[];
  recargarCatalogos: () => Promise<void>;
};

export const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin fuera del panel");
  return ctx;
}

export const ESTADOS: { valor: EstadoTurno; etiqueta: string }[] = [
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "confirmado", etiqueta: "Confirmado" },
  { valor: "atendido", etiqueta: "Atendido" },
  { valor: "ausente", etiqueta: "Ausente" },
  { valor: "cancelado", etiqueta: "Cancelado" },
];

/** Traduce errores de Postgres/PostgREST a mensajes para el usuario. */
export function mensajeError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "";
  if (error.code === "23P01") return "Ese horario se superpone con otro turno del mismo consultorio.";
  if (error.code === "23503") return "No se puede borrar porque tiene datos asociados. Desactivalo en su lugar.";
  if (error.code === "23514") return "Algún dato no es válido (revisá teléfono, nombre, horarios).";
  if (error.code === "42501" || error.message?.includes("row-level security")) return "No tenés permiso para hacer esto.";
  if (error.message?.includes("sin_permiso")) return "No tenés permiso sobre ese consultorio.";
  return error.message ?? "Ocurrió un error.";
}
