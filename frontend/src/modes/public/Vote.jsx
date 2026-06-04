import { useEffect, useRef, useState } from "react";
import { fetchPendientes, votar, getVotante, fetchVotacion } from "../../api.js";
import Nombre from "./Nombre.jsx";

// Modo Publico: "Tinder de diablos". Un diablo a la vez, botones NO/SÍ.
// Estética fanzine: cada diablo es un post-it amarillo que se "pega" en la
// pantalla (animacion eje Z) y se va apilando sobre el anterior con una
// rotacion minima -> monton de post-its (max 10 en el DOM).
// Primero pide nombre (o anonimo). Persistencia por localStorage: al volver,
// salta el nombre y solo aparecen los no votados. NO ven resultados ni ranking.
const rnd = (a, b) => a + Math.random() * (b - a);

// Baraja (Fisher-Yates). Cada votante ve los diablos en orden aleatorio propio:
// así cada diablo tiene la misma probabilidad de salir pronto o tarde, y si
// alguien abandona a medias el reparto de votos sigue siendo equitativo.
function barajar(arr) {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function Vote() {
  const [cola, setCola] = useState([]); // diablos pendientes
  const [estado, setEstado] = useState("cargando"); // cargando|nombre|votando|fin|error
  const [restantes, setRestantes] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState(""); // nombre del votante (vacío = anónimo)

  // Pila visible de post-its (los ultimos mostrados). Cada uno guarda su
  // rotacion/desplazamiento fijos para que el monton no "baile" al re-render.
  const [pila, setPila] = useState([]);
  const keyRef = useRef(0);
  const actual = cola[0];

  function cargarPendientes() {
    setEstado("cargando");
    fetchPendientes()
      .then((d) => {
        setCola(barajar(d.diablos)); // orden aleatorio por votante
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
    // Primero: ¿está la votación abierta? Si está cerrada, pantalla de cierre.
    fetchVotacion()
      .then((vot) => {
        if (!vot.abierta) {
          setEstado("cerrada");
          return;
        }
        // ¿este navegador ya se registro? Si no, pedir nombre antes de votar.
        return getVotante().then((v) => {
          if (v.registrado) {
            setNombre(v.nombre || "");
            cargarPendientes();
          } else {
            setEstado("nombre");
          }
        });
      })
      .catch((e) => {
        setError(e.message);
        setEstado("error");
      });
  }, []);

  // Cada vez que cambia el diablo de arriba, lo "pegamos" encima de la pila.
  useEffect(() => {
    if (!actual) return;
    setPila((p) => {
      if (p.length && p[p.length - 1].id === actual.id) return p; // ya esta
      const nuevo = {
        id: actual.id,
        url: actual.imagen_svg_url,
        key: keyRef.current++,
        rot: rnd(-7, 7),
        dx: rnd(-10, 10),
        dy: rnd(-6, 6),
      };
      return [...p, nuevo].slice(-10); // max 10 nodos en el DOM
    });
  }, [actual?.id]);

  async function emitir(valor) {
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
  if (estado === "nombre")
    return (
      <Nombre
        onListo={(nom) => {
          setNombre(nom || "");
          cargarPendientes();
        }}
      />
    );
  if (estado === "cerrada")
    return (
      <div className="fin">
        <div className="fin-emoji">😈</div>
        <h1 className="fin-title">
          La votación ha <span className="hl">terminado</span>
        </h1>
        <p className="fin-text">Gracias por enfrentarte a tus diablos.</p>
      </div>
    );
  if (estado === "error")
    return (
      <div className="center">
        <p className="err">Ups: {error}</p>
      </div>
    );
  if (estado === "fin")
    return (
      <div className="fin">
        <div className="fin-emoji">😈</div>
        {total === 0 ? (
          <h1 className="fin-title">Aún no hay diablos para votar</h1>
        ) : (
          <>
            <h1 className="fin-title">
              ¡Has votado todos <span className="hl">los diablos</span>!
            </h1>
            <p className="fin-text">
              Gracias por dedicarle este ratito
              {nombre ? (
                <>
                  , <span className="hl">{nombre}</span>
                </>
              ) : (
                ""
              )}
              .
            </p>
          </>
        )}
      </div>
    );

  const n = pila.length;
  return (
    <div className="vote-stage-wrap">
    <div className="ev2 ev2-live">
      <div className="ev2-head">
        <span className="ev2-of">quedan</span>
        <span className="ev2-count">{restantes}</span>
      </div>
      <div className="ev2-stage">
        {pila.map((p, idx) => {
          // profundidad desde arriba: 0 = el ultimo pegado. Los 5 de arriba
          // opacos; por debajo se desvanecen hasta 0 (se retiran sin "pop").
          const depth = n - 1 - idx;
          const op = depth < 5 ? 1 : Math.max(0, 1 - (depth - 4) * 0.2);
          return (
            <div
              key={p.key}
              className="ev2-item"
              style={{
                zIndex: idx,
                opacity: op,
                transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)`,
              }}
            >
              <div className="ev2-block ev2-drop">
                {/* alt vacío: no filtrar el ID mientras carga el SVG */}
                <img src={p.url} alt="" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="ev2-buttons">
        <button className="bt-no" onClick={() => emitir(-1)} aria-label="No me gusta">
          NO
        </button>
        <button className="bt-si" onClick={() => emitir(1)} aria-label="Me gusta">
          SÍ
        </button>
      </div>
    </div>
    </div>
  );
}
