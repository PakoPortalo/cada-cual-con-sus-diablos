import { useEffect, useRef, useState } from "react";
import Nombre from "./Nombre.jsx";

// Pantalla de DEMO (/ejemplo): misma experiencia (intro + votación) pero sin
// tocar la votación oficial — no registra votante ni guarda ningún voto. Solo
// para enseñar cómo funciona. Usa diablos reales de muestra.
const SB = import.meta.env.VITE_SUPABASE_URL;
const svg = (n) => `${SB}/storage/v1/object/public/diablos/svg/${String(n).padStart(3, "0")}.svg`;
const rnd = (a, b) => a + Math.random() * (b - a);
const MUESTRA = Array.from({ length: 12 }, (_, i) => i + 1);
const inicial = () => MUESTRA.map((id) => ({ id, url: svg(id) }));

export default function Ejemplo() {
  const [fase, setFase] = useState("intro"); // intro | votando | fin
  const [cola, setCola] = useState(inicial);
  const [pila, setPila] = useState([]);
  const keyRef = useRef(0);
  const actual = cola[0];
  const total = MUESTRA.length;

  // apila el diablo de arriba (igual que en la votación real)
  useEffect(() => {
    if (fase !== "votando" || !actual) return;
    setPila((p) => {
      if (p.length && p[p.length - 1].id === actual.id) return p;
      return [
        ...p,
        { id: actual.id, url: actual.url, key: keyRef.current++, rot: rnd(-7, 7), dx: rnd(-10, 10), dy: rnd(-6, 6) },
      ].slice(-10);
    });
  }, [fase, actual?.id]);

  function emitir() {
    const resto = cola.slice(1); // SIN llamada a la API: solo avanza
    setCola(resto);
    if (resto.length === 0) setFase("fin");
  }

  function reiniciar() {
    setCola(inicial());
    setPila([]);
    setFase("votando");
  }

  if (fase === "intro") return <Nombre demo onListo={() => setFase("votando")} />;

  if (fase === "fin")
    return (
      <div className="fin">
        <span className="badge-ejemplo">ejemplo</span>
        <div className="fin-emoji">😈</div>
        <h1 className="fin-title">
          Esto es solo un <span className="hl">ejemplo</span>
        </h1>
        <p className="fin-text">Así se vota. En la de verdad, cada voto cuenta.</p>
        <button className="intro-btn" style={{ marginTop: "1.2rem", maxWidth: 240 }} onClick={reiniciar}>
          Repetir
        </button>
      </div>
    );

  const restantes = cola.length;
  const n = pila.length;
  return (
    <div className="vote-stage-wrap">
      <div className="ev2 ev2-live">
        <span className="badge-ejemplo">ejemplo</span>
        <div className="ev2-head">
          <span className="ev2-of">quedan</span>
          <span className="ev2-count">{restantes}</span>
        </div>
        <div className="ev2-stage">
          {pila.map((p, idx) => {
            const depth = n - 1 - idx;
            const op = depth < 5 ? 1 : Math.max(0, 1 - (depth - 4) * 0.2);
            return (
              <div
                key={p.key}
                className="ev2-item"
                style={{ zIndex: idx, opacity: op, transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)` }}
              >
                <div className="ev2-block ev2-drop">
                  <img src={p.url} alt="" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="ev2-buttons">
          <button className="bt-no" onClick={emitir} aria-label="No me gusta">
            NO
          </button>
          <button className="bt-si" onClick={emitir} aria-label="Me gusta">
            SÍ
          </button>
        </div>
      </div>
    </div>
  );
}
