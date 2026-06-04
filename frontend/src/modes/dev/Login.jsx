import { useState } from "react";
import { supabase } from "../../supabase.js";

// Login del modo Dev (solo Pako). Email + contraseña via Supabase Auth.
export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setCargando(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setError(error.message);
    setCargando(false);
  }

  return (
    <div className="center">
      <form className="card" onSubmit={entrar} style={{ minWidth: 280 }}>
        <h2>👿 Modo Dev 😈</h2>
        <p>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            style={{ width: "100%" }}
          />
        </p>
        <p>
          <input
            type="password"
            placeholder="contraseña"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            style={{ width: "100%" }}
          />
        </p>
        {error && <p className="err">{error}</p>}
        <button className="btn-primary" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
