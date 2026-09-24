import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Alta de usuarios y cambio de contraseña. Necesita la clave service_role,
// que SOLO vive en el servidor (variable SUPABASE_SERVICE_ROLE_KEY en Render).
export const dynamic = "force-dynamic";

function clienteServicio(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Verifica que quien llama sea un admin activo (token de su sesión). */
async function esAdmin(req: Request, sb: SupabaseClient): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: perfil } = await sb.from("perfiles").select("rol, activo").eq("id", data.user.id).maybeSingle();
  return Boolean(perfil && perfil.rol === "admin" && perfil.activo);
}

type Alta = {
  email?: string;
  password?: string;
  nombre?: string;
  rol?: string;
  consultorios?: string[];
};

export async function POST(req: Request) {
  const sb = clienteServicio();
  if (!sb) return json({ error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." }, 500);
  if (!(await esAdmin(req, sb))) return json({ error: "No autorizado." }, 401);

  const body = ((await req.json().catch(() => null)) ?? {}) as Alta;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const nombre = (body.nombre ?? "").trim();
  const rol = body.rol === "admin" ? "admin" : "secretaria";
  const consultorios = Array.isArray(body.consultorios) ? body.consultorios.filter((c) => typeof c === "string") : [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido." }, 400);
  if (password.length < 8) return json({ error: "La contraseña tiene que tener al menos 8 caracteres." }, 400);
  if (!nombre) return json({ error: "Falta el nombre." }, 400);

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !data.user) {
    const msg = error?.message?.toLowerCase().includes("already") ? "Ya existe un usuario con ese email." : error?.message;
    return json({ error: msg ?? "No se pudo crear el usuario." }, 400);
  }

  const id = data.user.id;
  const { error: e1 } = await sb.from("perfiles").upsert({ id, nombre, email, rol, activo: true });
  if (e1) return json({ error: `Usuario creado, pero falló el perfil: ${e1.message}` }, 500);

  if (rol === "secretaria" && consultorios.length > 0) {
    const { error: e2 } = await sb
      .from("perfil_consultorio")
      .insert(consultorios.map((consultorio_id) => ({ perfil_id: id, consultorio_id })));
    if (e2) return json({ error: `Usuario creado, pero falló la asignación de consultorios: ${e2.message}` }, 500);
  }

  return json({ ok: true, id });
}

type CambioClave = { id?: string; password?: string };

export async function PATCH(req: Request) {
  const sb = clienteServicio();
  if (!sb) return json({ error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." }, 500);
  if (!(await esAdmin(req, sb))) return json({ error: "No autorizado." }, 401);

  const body = ((await req.json().catch(() => null)) ?? {}) as CambioClave;
  if (!body.id) return json({ error: "Falta el usuario." }, 400);
  if (!body.password || body.password.length < 8) {
    return json({ error: "La contraseña tiene que tener al menos 8 caracteres." }, 400);
  }

  const { error } = await sb.auth.admin.updateUserById(body.id, { password: body.password });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
