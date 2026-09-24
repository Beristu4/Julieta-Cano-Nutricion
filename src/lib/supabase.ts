import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cliente: SupabaseClient | null = null;

/**
 * Cliente de Supabase con la clave pública (anon).
 * Devuelve null si faltan las variables de entorno, así el sitio
 * funciona igual en desarrollo sin base configurada.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!cliente) {
    cliente = createClient(url, anonKey, {
      auth: { persistSession: typeof window !== "undefined" },
    });
  }
  return cliente;
}
