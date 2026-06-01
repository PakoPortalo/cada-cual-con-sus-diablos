import { useEffect, useState } from "react";
import { fetchPendientes, votar, getVotante } from "../../api.js";
import Nombre from "./Nombre.jsx";

// Modo Publico: "Tinder de diablos". Un diablo a la vez, botones 👿/💀.
// Primero pide nombre (o anonimo). Persistencia por localStorage: al volver,
// salta el nombre y solo aparecen los no votados. NO ven resultados ni ranking.
export default function Vote() {
  const [cola, setCola] = useState([]); // diablos pendientes
  const [estado, setEstado] = useState("cargando"); // cargando|nombre|votando|fin|error
  const [restantes, setRestantes] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  function cargarPendientes() {
    setEstado("cargando");
    fetchPendientes()
      .then((d) => {
        setCola(d.diablos);
        setRestantes(d.restantes);
        setTotal(d.total);
        setEstado(d.completado || d.diablos.length === 0 ? "fin" : "votando");
      })
      .catch((e) => {
        setError(e.message);
        setEstado("error");
      });
  }

  useEffect(() => {
    // ¿este navegador ya se registro? Si no, pedir nombre antes de votar.
    getVotante()
      .then((v) => (v.registrado ? cargarPendientes() : setEstado("nombre")))
      .catch((e) => {
        setError(e.message);
        setEstado("error");
      });
  }, []);

  async function emitir(valor) {
    const actual = cola[0];
    if (!actual) return;
    const resto = cola.slice(1);
    setCola(resto); // avanza ya (optimista)
    setRestantes((r) => r - 1);
    if (resto.length === 0) setEstado("fin");
    try {
      await votar(actual.id, valor);
    } catch (e) {
      setError(e.message);
    }
  }

  if (estado === "cargando") return <div className="center">Cargando diablos…</div>;
  if (estado === "nombre") return <Nombre onListo={cargarPendientes} />;
  if (estado === "error")
    return (
      <div className="center">
        <p className="err">Ups: {error}</p>
      </div>
    );
  if (estado === "fin")
    return (
      <div className="vote-screen vote-done">
        <div />
        <div>
          <div style={{ fontSize: "4rem" }}>👿</div>
          <h1>
            {total === 0
              ? "Aún no hay diablos para votar"
              : "¡Has votado todos los diablos!"}
          </h1>
          <p>Gracias por participar.</p>
        </div>
        <div />
      </div>
    );

  const actual = cola[0];
  const votados = total - restantes;
  return (
    <div className="vote-screen">
      <div className="vote-counter">
        {votados + 1} / {total}
      </div>
      <div className="vote-img">
        <img src={actual.imagen_svg_url} alt={`Diablo ${actual.id}`} />
      </div>
      <div className="vote-buttons">
        <button className="vote-no" onClick={() => emitir(-1)} aria-label="No me gusta">
          💀
        </button>
        <button className="vote-si" onClick={() => emitir(1)} aria-label="Me gusta">
          👿
        </button>
      </div>
    </div>
  );
}
