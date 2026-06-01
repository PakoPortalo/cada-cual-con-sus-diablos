import { useState } from "react";
import { registrarVotante } from "../../api.js";

// Pantalla previa a votar: "¿Cómo te llamas?" o votar anónimo.
export default function Nombre({ onListo }) {
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(anon) {
    setCargando(true);
    setError("");
    try {
      await registrarVotante(anon ? "" : nombre);
      onListo();
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  }

  return (
    <div className="center">
      <div className="card" style={{ textAlign: "center", maxWidth: 340 }}>
        <div style={{ fontSize: "3rem" }}>👿</div>
        <h2>¿Cómo te llamas?</h2>
        <p>
          <input
            type="text"
            value={nombre}
            placeholder="tu nombre"
            onChange={(e) => setNombre(e.target.value)}
            style={{ width: "100%", textAlign: "center" }}
            onKeyDown={(e) => e.key === "Enter" && nombre.trim() && enviar(false)}
          />
        </p>
        {error && <p className="err">{error}</p>}
        <p>
          <button
            className="btn-primary"
            disabled={cargando || !nombre.trim()}
            onClick={() => enviar(false)}
            style={{ width: "100%" }}
          >
            Empezar
          </button>
        </p>
        <p>
          <button disabled={cargando} onClick={() => enviar(true)} style={{ width: "100%" }}>
            Prefiero hacerlo anónimo
          </button>
        </p>
      </div>
    </div>
  );
}
