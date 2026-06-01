import { useEffect, useRef, useState } from "react";
import { previewDiablo, guardarDiablo, listarDiablos } from "../../api.js";

// Valores por defecto de los umbrales (espejo de backend config.js).
const DEFAULTS = { blackMax: 85, redMinR: 110, redDelta: 40 };

// Flujo de captura (modo Dev):
//  1. Pulsar "Foto" (cámara del móvil).
//  2. Se vectoriza y se muestra: ID propuesto + foto + vectorización + máscaras.
//  3. Sliders para ajustar cuánta tinta se queda en cada capa (negro/rojo).
//  4. "Repetir" (otra foto) o "Guardar" (persiste, estado=pendiente).
export default function Capture() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);
  const [res, setRes] = useState(null); // { svg, preview, maskForma, maskDetalle }
  const [thresholds, setThresholds] = useState(DEFAULTS);
  const [id, setId] = useState("");
  const [nombre, setNombre] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [procError, setProcError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [sugerido, setSugerido] = useState(null);

  // Control de carrera: solo la última petición lanzada es válida.
  const seqRef = useRef(0);

  // Sugerir el primer ID 1–100 libre.
  useEffect(() => {
    listarDiablos()
      .then((d) => {
        const usados = new Set(d.map((x) => x.id));
        for (let i = 1; i <= 100; i++)
          if (!usados.has(i)) {
            setSugerido(i);
            setId(String(i));
            break;
          }
      })
      .catch(() => {});
  }, []);

  // Reprocesa cuando cambian foto o umbrales, con debounce y anti-carrera.
  // Un error NO borra la última vista buena ni bloquea futuros intentos.
  useEffect(() => {
    if (!file) return;
    const t = setTimeout(async () => {
      const mine = ++seqRef.current;
      setProcesando(true);
      setProcError("");
      try {
        const r = await previewDiablo(file, thresholds);
        if (mine !== seqRef.current) return; // llegó tarde: ignorar
        setRes({
          svg: r.svg,
          preview: `data:image/png;base64,${r.preview_png_base64}`,
          maskForma: `data:image/png;base64,${r.mask_forma_base64}`,
          maskDetalle: `data:image/png;base64,${r.mask_detalle_base64}`,
        });
      } catch (e) {
        if (mine === seqRef.current) setProcError(e.message);
      } finally {
        if (mine === seqRef.current) setProcesando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [file, thresholds]);

  function onFoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setRes(null);
    setThresholds(DEFAULTS);
    setFotoUrl(URL.createObjectURL(f));
    setFile(f); // dispara el useEffect
  }

  function setTh(key, value) {
    setThresholds((th) => ({ ...th, [key]: Number(value) }));
  }

  function repetir() {
    seqRef.current++; // invalida lo en vuelo
    setFile(null);
    setRes(null);
    setFotoUrl(null);
    setProcError("");
    fileRef.current?.click();
  }

  async function guardar() {
    if (!file || !id) return;
    setGuardando(true);
    setError("");
    try {
      await guardarDiablo(file, { id: Number(id), nombre, thresholds });
      seqRef.current++;
      setFile(null);
      setRes(null);
      setFotoUrl(null);
      setNombre("");
      setId(String(Number(id) + 1));
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h2>Capturar diablo</h2>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFoto}
        style={{ display: "none" }}
      />
      {!file && (
        <button className="btn-primary" onClick={() => fileRef.current?.click()}>
          📷 Foto
        </button>
      )}
      {error && <p className="err">{error}</p>}

      {file && (
        <div className="card">
          <div className="row">
            <label>
              ID&nbsp;
              <input
                type="number"
                min="1"
                max="100"
                value={id}
                onChange={(e) => setId(e.target.value)}
                style={{ width: 80 }}
              />
            </label>
            {sugerido && <small>(sugerido: {sugerido})</small>}
            <label>
              Nombre&nbsp;
              <input
                type="text"
                value={nombre}
                placeholder="opcional"
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
          </div>

          {/* Vista grande: foto vs vectorización */}
          <div className="cmp">
            <figure>
              <img src={fotoUrl} alt="foto" />
              <figcaption>Foto</figcaption>
            </figure>
            <figure>
              {/* SVG en vivo: vectorial, nítido a cualquier tamaño */}
              <div
                className={`svgbox ${procesando ? "loading" : ""}`}
                dangerouslySetInnerHTML={res ? { __html: res.svg } : undefined}
              />
              <figcaption>
                Vectorización {procesando && "· actualizando…"}
              </figcaption>
            </figure>
          </div>
          {procError && <p className="err">No se pudo vectorizar: {procError}</p>}

          {/* Máscaras como detalle plegable */}
          <details className="masks">
            <summary>Ver capas (forma / detalle)</summary>
            <div className="previews">
              <figure>
                <img src={res?.maskForma} alt="forma" />
                <figcaption>Capa roja (forma)</figcaption>
              </figure>
              <figure>
                <img src={res?.maskDetalle} alt="detalle" />
                <figcaption>Capa negra (detalle)</figcaption>
              </figure>
            </div>
          </details>

          <fieldset style={{ border: "none", padding: 0, marginTop: "0.5rem" }}>
            <label className="slider">
              <span>Negro (detalle): {thresholds.blackMax}</span>
              <input
                type="range"
                min="40"
                max="160"
                value={thresholds.blackMax}
                onChange={(e) => setTh("blackMax", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Rojo — umbral mínimo: {thresholds.redMinR}</span>
              <input
                type="range"
                min="60"
                max="200"
                value={thresholds.redMinR}
                onChange={(e) => setTh("redMinR", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Rojo — dominancia: {thresholds.redDelta}</span>
              <input
                type="range"
                min="5"
                max="100"
                value={thresholds.redDelta}
                onChange={(e) => setTh("redDelta", e.target.value)}
              />
            </label>
            <button onClick={() => setThresholds(DEFAULTS)} style={{ marginTop: "0.5rem" }}>
              Restablecer umbrales
            </button>
          </fieldset>

          <div className="row" style={{ marginTop: "0.5rem" }}>
            <button onClick={repetir} disabled={guardando}>
              ↺ Repetir
            </button>
            <button
              className="btn-primary"
              onClick={guardar}
              disabled={guardando || procesando || !id || !res}
            >
              {guardando ? "Guardando…" : "💾 Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
