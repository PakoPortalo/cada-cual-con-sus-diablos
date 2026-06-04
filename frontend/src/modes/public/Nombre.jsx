import { useState } from "react";
import { registrarVotante } from "../../api.js";
import logo from "../../assets/logo.png";

// Intro de la votación: secuencia de slides (fade in / fade out al tocar) que
// presenta el proyecto y explica cómo se vota; al final, registro de nombre
// (o anónimo). Estética fanzine.
const SLIDES = [
  // 0 · título (logo dibujado a mano) + firma
  (
    <div className="seq-titulo">
      <img className="seq-logo" src={logo} alt="Cada cual con sus diablos" />
      <p className="seq-by">mololo</p>
    </div>
  ),
  // 1
  (
    <p className="seq-text">
      Cada persona tiene sus propios diablos, de los que trata de escapar y a los
      que acaba volviendo una y otra vez.
      <br />
      <br />
      <b>¿Cuáles son los tuyos?</b>
    </p>
  ),
  // 2
  (
    <p className="seq-text">
      Bienvenido a <b>Buscando Diablos</b>, donde harás match con tus diablos más
      profundos.
      <br />
      <br />
      Intenta terminar de votarlos todos… o puede que pierdas para siempre al
      diablo de tu vida.
    </p>
  ),
  // 3
  (
    <p className="seq-text">
      El mecanismo es sencillo:
      <br />
      <br />
      Si conectas con el diablo, di que <b>SI</b>.
      <br />
      Si el diablo no te dice nada, pulsa <b>NO</b>.
    </p>
  ),
];

// Filtros SVG para el efecto "boil" (trazo que se mueve, estilo dibujo animado):
// cada uno desplaza ligeramente los píxeles con un ruido distinto; el CSS va
// alternando entre ellos a pocos fps para que el logo "hierva".
function BoilFilters() {
  // dos sets: "boil" (logo, desplazamiento fuerte) y "boilt" (texto, más sutil)
  const sets = [
    { prefix: "boil", scale: 5 },
    { prefix: "boilt", scale: 2.5 },
  ];
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {sets.flatMap(({ prefix, scale }) =>
          [1, 4, 9].map((seed, i) => (
            <filter id={`${prefix}${i}`} key={`${prefix}${i}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.018"
                numOctaves="2"
                seed={seed}
                result="n"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="n"
                scale={scale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))
        )}
      </defs>
    </svg>
  );
}

export default function Nombre({ onListo }) {
  const [fase, setFase] = useState("seq"); // seq | form
  const [paso, setPaso] = useState(0);
  const [saliendo, setSaliendo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  function avanzar() {
    if (saliendo) return;
    setSaliendo(true);
    setTimeout(() => {
      if (paso < SLIDES.length - 1) {
        setPaso((p) => p + 1);
        setSaliendo(false);
      } else {
        setFase("form");
      }
    }, 420);
  }

  async function enviar(anon) {
    setCargando(true);
    setError("");
    try {
      const nom = anon ? "" : nombre.trim();
      await registrarVotante(nom);
      onListo(nom);
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  }

  if (fase === "seq") {
    return (
      <div className="seq" onClick={avanzar}>
        <BoilFilters />
        <div className={`seq-slide ${saliendo ? "saliendo" : "entrando"}`} key={paso}>
          {SLIDES[paso]}
        </div>
        <div className="seq-hint">toca para continuar</div>
      </div>
    );
  }

  return (
    <div className="intro">
      <div className="intro-inner intro-fadein">
        <form
          className="intro-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) enviar(false);
          }}
        >
          <label className="intro-label">Introduce tu nombre</label>
          <input
            type="text"
            value={nombre}
            placeholder="tu nombre"
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
          {error && <p className="err">{error}</p>}
          <div className="intro-botones">
            <button type="submit" className="intro-btn" disabled={cargando || !nombre.trim()}>
              Enviar
            </button>
            <button
              type="button"
              className="intro-btn ghost"
              disabled={cargando}
              onClick={() => enviar(true)}
            >
              Mejor anónimo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
