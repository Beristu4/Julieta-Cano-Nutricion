"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function Login() {
  const sb = getSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setError(null);
    setEnviando(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setEnviando(false);
    if (error) setError("Email o contraseña incorrectos.");
    // Si entra, AdminShell detecta la sesión y redirige a la agenda.
  }

  return (
    <div className="adm-centro">
      <form className="adm-card adm-angosto adm-form" onSubmit={entrar}>
        <div>
          <p className="adm-marca">Julieta Cano <span>panel</span></p>
          <h1 className="adm-h1" style={{ marginTop: 12 }}>Ingresar</h1>
        </div>
        <label className="adm-campo">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="adm-campo">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button type="submit" className="adm-btn adm-btn-primario" disabled={enviando || !sb}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="adm-muted adm-chico">¿Olvidaste la contraseña? Pedile a Julieta que te la cambie desde Usuarios.</p>
      </form>
    </div>
  );
}
