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
  const [estado, setEstado] = useState("idle"); // idle|procesando|listo|guardando|error
  const [error, setError] = useState("");
  const [sugerido, setSugerido] = useState(null);

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

  async function procesar(f, th) {
    setEstado("procesando");
    setError("");
    try {
      const r = await previewDiablo(f, th);
      setRes({
        svg: r.svg,
        preview: `data:image/png;base64,${r.preview_png_base64}`,
        maskForma: `data:image/png;base64,${r.mask_forma_base64}`,
        maskDetalle: `data:image/png;base64,${r.mask_detalle_base64}`,
      });
      setEstado("listo");
    } catch (e) {
      setError(e.message);
      setEstado("error");
    }
  }

  function onFoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFotoUrl(URL.createObjectURL(f));
    setThresholds(DEFAULTS);
    procesar(f, DEFAULTS);
  }

  // Reaplica umbrales (con debounce) al mover sliders.
  function onThreshold(key, value) {
    const th = { ...thresholds, [key]: Number(value) };
    setThresholds(th);
    clearTimeout(onThreshold._t);
    onThreshold._t = setTimeout(() => file && procesar(file, th), 250);
  }

  function repetir() {
    setFile(null);
    setRes(null);
    setFotoUrl(null);
    setEstado("idle");
    fileRef.current?.click();
  }

  async function guardar() {
    if (!file || !id) return;
    setEstado("guardando");
    setError("");
    try {
      await guardarDiablo(file, { id: Number(id), nombre, thresholds });
      // preparar el siguiente
      setFile(null);
      setRes(null);
      setFotoUrl(null);
      setNombre("");
      setId(String(Number(id) + 1));
      setEstado("idle");
    } catch (e) {
      setError(e.message);
      setEstado("error");
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

          <div className="previews">
            <figure>
              <img src={fotoUrl} alt="foto" />
              <figcaption>Foto</figcaption>
            </figure>
            <figure>
              <img src={res?.preview} alt="vector" />
              <figcaption>Vectorización {estado === "procesando" && "…"}</figcaption>
            </figure>
            <figure>
              <img src={res?.maskForma} alt="forma" />
              <figcaption>Capa roja (forma)</figcaption>
            </figure>
            <figure>
              <img src={res?.maskDetalle} alt="detalle" />
              <figcaption>Capa negra (detalle)</figcaption>
            </figure>
          </div>

          <fieldset style={{ border: "none", padding: 0, marginTop: "0.5rem" }}>
            <label className="slider">
              <span>Negro (detalle): {thresholds.blackMax}</span>
              <input
                type="range"
                min="40"
                max="160"
                value={thresholds.blackMax}
                onChange={(e) => onThreshold("blackMax", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Rojo — umbral mínimo: {thresholds.redMinR}</span>
              <input
                type="range"
                min="60"
                max="200"
                value={thresholds.redMinR}
                onChange={(e) => onThreshold("redMinR", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Rojo — dominancia: {thresholds.redDelta}</span>
              <input
                type="range"
                min="5"
                max="100"
                value={thresholds.redDelta}
                onChange={(e) => onThreshold("redDelta", e.target.value)}
              />
            </label>
          </fieldset>

          <div className="row">
            <button onClick={repetir} disabled={estado === "guardando"}>
              ↺ Repetir
            </button>
            <button
              className="btn-primary"
              onClick={guardar}
              disabled={estado === "guardando" || estado === "procesando" || !id}
            >
              {estado === "guardando" ? "Guardando…" : "💾 Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
