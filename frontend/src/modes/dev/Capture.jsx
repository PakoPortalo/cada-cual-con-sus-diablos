import { useEffect, useRef, useState } from "react";
import { previewDiablo, guardarDiablo, listarDiablos } from "../../api.js";
import Camera from "./Camera.jsx";
import Crop from "./Crop.jsx";

// Valores por defecto de umbrales HSV + redondez + suavizado (espejo de backend).
const DEFAULTS = { valueMax: 30, satMin: 35, hueRange: 30, shapeClose: 8, smooth: 1.5 };

// Flujo de captura (modo Dev):
//  - Suelta: "Foto" (cámara) -> recorte -> vectorizar -> ajustar -> guardar.
//  - Lote:   "Subir fotos" (varias a la vez) -> cola; cada foto se vectoriza
//            sola (sin recorte manual), ajustas umbrales si hace falta y
//            "Guardar y siguiente" avanza al próximo post-it de la cola.
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
  const [camara, setCamara] = useState(false); // cámara en vivo abierta
  const [rawSrc, setRawSrc] = useState(null); // foto sin recortar (para el cropper)
  const [verForma, setVerForma] = useState(true); // capa roja visible
  const [verDetalle, setVerDetalle] = useState(true); // capa negra visible

  // Cola de lote: [{ file, url, estado }] con estado pendiente|guardado|saltado.
  // colaIdx = índice del post-it que se está procesando (-1 = no hay cola).
  const [cola, setCola] = useState([]);
  const [colaIdx, setColaIdx] = useState(-1);
  const [finCola, setFinCola] = useState(false);
  const enCola = colaIdx >= 0;

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

  // Paso 1: foto cruda (cámara o archivo) -> abrir recorte manual
  function fotoCruda(f) {
    if (!f) return;
    setRawSrc(URL.createObjectURL(f));
  }

  // Paso 2: ya recortada (o cruda, en lote) -> vectorizar
  function usarArchivo(f) {
    if (!f) return;
    setRes(null);
    setThresholds(DEFAULTS);
    setFotoUrl(URL.createObjectURL(f));
    setFile(f); // dispara el useEffect
  }

  // Cargar varias fotos a la cola. En lote se salta el recorte: la primera se
  // vectoriza directa y las demás esperan su turno.
  function cargarCola(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const items = files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      estado: "pendiente",
    }));
    setCola(items);
    setColaIdx(0);
    setFinCola(false);
    setNombre("");
    usarArchivo(items[0].file);
  }

  function onFoto(e) {
    const files = e.target.files;
    if (!files?.length) return;
    cargarCola(files); // galería = lote (1 o varias)
    e.target.value = ""; // permite volver a elegir las mismas
  }

  function marcar(idx, estado) {
    setCola((c) => c.map((it, i) => (i === idx ? { ...it, estado } : it)));
  }

  // Avanza al siguiente de la cola. nuevoId: si se pasa, fija el ID sugerido
  // para la siguiente (tras guardar = id+1; tras saltar = se mantiene).
  function avanzar(nuevoId) {
    seqRef.current++; // invalida lo en vuelo
    setNombre("");
    const next = colaIdx + 1;
    if (nuevoId != null) setId(String(nuevoId));
    if (next < cola.length) {
      setColaIdx(next);
      usarArchivo(cola[next].file);
    } else {
      // fin de cola: limpiar y mostrar resumen
      setColaIdx(-1);
      setFile(null);
      setRes(null);
      setFotoUrl(null);
      setFinCola(true);
    }
  }

  function saltar() {
    marcar(colaIdx, "saltado");
    avanzar(null); // el ID sugerido se mantiene para el siguiente
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
    setCamara(true); // volver directo a la cámara
  }

  function cerrarCola() {
    seqRef.current++;
    setCola([]);
    setColaIdx(-1);
    setFinCola(false);
    setFile(null);
    setRes(null);
    setFotoUrl(null);
  }

  async function guardar() {
    if (!file || !id) return;
    setGuardando(true);
    setError("");
    try {
      await guardarDiablo(file, { id: Number(id), nombre, thresholds });
      seqRef.current++;
      if (enCola) {
        marcar(colaIdx, "guardado");
        avanzar(Number(id) + 1);
      } else {
        setFile(null);
        setRes(null);
        setFotoUrl(null);
        setNombre("");
        setId(String(Number(id) + 1));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const guardados = cola.filter((x) => x.estado === "guardado").length;

  return (
    <div>
      <h2>Capturar diablo</h2>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFoto}
        style={{ display: "none" }}
      />
      {!file && !camara && !rawSrc && !finCola && (
        <div className="row">
          <button className="btn-primary" onClick={() => setCamara(true)}>
            📷 Foto
          </button>
          <button onClick={() => fileRef.current?.click()}>📁 Subir fotos (lote)</button>
        </div>
      )}

      {finCola && (
        <div className="card">
          <p>
            ✅ Lote terminado: <b>{guardados}</b> guardados de {cola.length}.
          </p>
          <button className="btn-primary" onClick={cerrarCola}>
            Hecho
          </button>
        </div>
      )}

      {camara && (
        <Camera
          onCapture={(f) => {
            setCamara(false);
            fotoCruda(f);
          }}
          onCancel={() => setCamara(false)}
        />
      )}

      {rawSrc && (
        <Crop
          src={rawSrc}
          onDone={(f) => {
            setRawSrc(null);
            usarArchivo(f);
          }}
          onCancel={() => setRawSrc(null)}
        />
      )}
      {error && <p className="err">{error}</p>}

      {/* Tira de la cola: miniaturas + estado + progreso */}
      {enCola && (
        <div className="cola">
          <div className="cola-cab">
            <span>
              Lote: <b>{colaIdx + 1}</b> / {cola.length} · {guardados} guardados
            </span>
            <button onClick={cerrarCola} disabled={guardando}>
              ✕ Cerrar lote
            </button>
          </div>
          <div className="cola-tira">
            {cola.map((it, i) => (
              <div
                key={i}
                className={`cola-item ${i === colaIdx ? "actual" : ""} est-${it.estado}`}
                title={it.estado}
              >
                <img src={it.url} alt={`#${i + 1}`} />
                {it.estado === "guardado" && <span className="badge ok">✓</span>}
                {it.estado === "saltado" && <span className="badge skip">↷</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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
                className={`svgbox ${procesando ? "loading" : ""} ${
                  verForma ? "" : "hide-forma"
                } ${verDetalle ? "" : "hide-detalle"}`}
                dangerouslySetInnerHTML={res ? { __html: res.svg } : undefined}
              />
              <figcaption>
                <label style={{ marginRight: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={verForma}
                    onChange={(e) => setVerForma(e.target.checked)}
                  />{" "}
                  Capa roja
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={verDetalle}
                    onChange={(e) => setVerDetalle(e.target.checked)}
                  />{" "}
                  Capa negra
                </label>
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
              <span>Negro — oscuridad máx: {thresholds.valueMax}</span>
              <input
                type="range"
                min="5"
                max="70"
                value={thresholds.valueMax}
                onChange={(e) => setTh("valueMax", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Rojo — saturación mín: {thresholds.satMin}</span>
              <input
                type="range"
                min="5"
                max="90"
                value={thresholds.satMin}
                onChange={(e) => setTh("satMin", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Rojo — amplitud de tono: {thresholds.hueRange}</span>
              <input
                type="range"
                min="5"
                max="60"
                value={thresholds.hueRange}
                onChange={(e) => setTh("hueRange", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Redondez de la forma: {thresholds.shapeClose}</span>
              <input
                type="range"
                min="0"
                max="30"
                value={thresholds.shapeClose}
                onChange={(e) => setTh("shapeClose", e.target.value)}
              />
            </label>
            <label className="slider">
              <span>Suavizado de línea: {thresholds.smooth}</span>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={thresholds.smooth}
                onChange={(e) => setTh("smooth", e.target.value)}
              />
            </label>
            <button onClick={() => setThresholds(DEFAULTS)} style={{ marginTop: "0.5rem" }}>
              Restablecer umbrales
            </button>
          </fieldset>

          <div className="row" style={{ marginTop: "0.5rem" }}>
            {enCola ? (
              <button onClick={saltar} disabled={guardando}>
                ↷ Saltar
              </button>
            ) : (
              <button onClick={repetir} disabled={guardando}>
                ↺ Repetir
              </button>
            )}
            <button
              className="btn-primary"
              onClick={guardar}
              disabled={guardando || procesando || !id || !res}
            >
              {guardando
                ? "Guardando…"
                : enCola
                ? "💾 Guardar y siguiente"
                : "💾 Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
