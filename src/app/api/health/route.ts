import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Endpoint para el ping cada 10 minutos (cron-job.org / UptimeRobot).
// Mantiene despierto Render y, al consultar la base, también Supabase.
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  const sb = getSupabase();

  if (!sb) {
    return NextResponse.json({ ok: true, db: "sin_configurar" }, { headers });
  }

  const { data, error } = await sb.rpc("ping");
  if (error) {
    return NextResponse.json({ ok: false, db: "error", detalle: error.message }, { status: 503, headers });
  }

  return NextResponse.json({ ok: true, db: data, hora: new Date().toISOString() }, { headers });
}
