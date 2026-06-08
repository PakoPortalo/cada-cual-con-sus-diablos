import { useEffect, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  listarDiablos, patchDiablo, activarTodos, fetchRanking, borrarDiablo, reasignarDiablo,
  descargarBackup, reiniciarVotos, fetchStats, fetchVotacion, setVotacionAbierta,
} from "../../api.js";
import EditarDiablo from "./EditarDiablo.jsx";

// Formatea segundos a "Xm Ys" (o "Ys" si <1 min).
function fmtDur(seg) {
  const s = Math.round(seg || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

// Panel Dev: estado de los 100 diablos + resultados/graficas (SOLO aqui, nunca
// en el modo publico). Permite abrir la votacion y revisar el ranking Wilson.
export default function Admin() {
  const [diablos, setDiablos] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [votosTotales, setVotosTotales] = useState(0);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("detalle"); // detalle | galeria
  const [editando, setEditando] = useState(null); // diablo en edición
  const [bajando, setBajando] = useState(false); // descargando backup
  const [abriendo, setAbriendo] = useState(false); // activando pendientes
  const [stats, setStats] = useState(null); // estadísticas de participación
  const [verCuadro, setVerCuadro] = useState(false); // overlay cuadro Top 9
  const [abierta, setAbierta] = useState(null); // votación abierta/cerrada
  const [cambiandoVot, setCambiandoVot] = useState(false);

  async function recargar() {
    try {
      const [d, r, s, vot] = await Promise.all([
        listarDiablos(), fetchRanking(), fetchStats(), fetchVotacion(),
      ]);
      setDiablos(d);
      setRanking(r.ranking);
      setVotosTotales(r.votos_totales);
      setStats(s);
      setAbierta(vot.abierta);
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleVotacion() {
    const cerrar = abierta; // si está abierta, la acción es cerrar
    const msg = cerrar
      ? "¿Cerrar la votación? Nadie podrá votar más y los resultados quedan congelados."
      : "¿Reabrir la votación? La gente volverá a poder votar.";
    if (!confirm(msg)) return;
    setCambiandoVot(true);
    setError("");
    try {
      const r = await setVotacionAbierta(!abierta);
      setAbierta(r.abierta);
    } catch (e) {
      setError(e.message);
    } finally {
      setCambiandoVot(false);
    }
  }
  useEffect(() => {
    recargar();
  }, []);

  const cuenta = (e) => diablos.filter((d) => d.estado === e).length;

  async function cambiarEstado(id, estado) {
    await patchDiablo(id, { estado });
    recargar();
  }

  async function eliminar(id) {
    if (!confirm(`¿Eliminar el diablo ${String(id).padStart(3, "0")}? El ID quedará libre para reasignarlo.`))
      return;
    await borrarDiablo(id);
    recargar();
  }

  // Guarda cambios del modal de edición: ID (reasignar) y/o nombre.
  async function guardarEdicion(diablo, { nuevoId, nombre }) {
    if (nuevoId !== diablo.id) await reasignarDiablo(diablo.id, nuevoId);
    if (nombre !== (diablo.nombre || "")) await patchDiablo(nuevoId, { nombre });
    setEditando(null);
    recargar();
  }

  // puesto en el ranking (1 = más votado) solo para el top 9, y solo si ya hay
  // votos (si no, los "puestos" serían arbitrarios con score 0).
  const puestoDe = new Map(
    (votosTotales > 0 ? ranking.slice(0, 9) : []).map((d, i) => [d.id, i + 1])
  );

  // puntos para la gráfica de abandono: x = minutos, y = diablos votados
  const puntos = (stats?.puntos || []).map((p) => ({
    x: Number((p.seg / 60).toFixed(1)),
    y: p.diablos,
    nombre: p.nombre || "anónimo",
  }));

  return (
    <div>
      <h2>Panel</h2>
      {error && <p className="err">{error}</p>}

      <div className="card row">
        <span>
          <strong>{diablos.length}</strong>/100 digitalizados
        </span>
        <span>
          <span className="badge pendiente">{cuenta("pendiente")} pendientes</span>{" "}
          <span className="badge activo">{cuenta("activo")} activos</span>{" "}
          <span className="badge archivado">{cuenta("archivado")} archivados</span>
        </span>
        <span>{votosTotales} votos emitidos</span>
        {abierta !== null && (
          <span>
            Votación:{" "}
            <span className={`badge ${abierta ? "activo" : "archivado"}`}>
              {abierta ? "ABIERTA" : "CERRADA"}
            </span>{" "}
            <button onClick={toggleVotacion} disabled={cambiandoVot}>
              {cambiandoVot ? "…" : abierta ? "🔒 Cerrar votación" : "🔓 Reabrir votación"}
            </button>
          </span>
        )}
        <button
          className="btn-primary"
          disabled={abriendo}
          onClick={async () => {
            if (!confirm("¿Pasar todos los pendientes a ACTIVO y abrir la votación?")) return;
            setAbriendo(true);
            setError("");
            try {
              const { activados } = await activarTodos();
              await recargar();
              alert(
                activados > 0
                  ? `Votación abierta: ${activados} diablos activados.`
                  : "No había diablos pendientes (ya estaban todos activos)."
              );
            } catch (e) {
              setError(`No se pudo abrir la votación: ${e.message}`);
            } finally {
              setAbriendo(false);
            }
          }}
        >
          {abriendo ? "Abriendo…" : "Abrir votación (activar pendientes)"}
        </button>
        <button
          onClick={async () => {
            setBajando(true);
            try {
              await descargarBackup();
            } catch (e) {
              setError(e.message);
            } finally {
              setBajando(false);
            }
          }}
          disabled={bajando}
          title="Descarga un ZIP con la DB + todos los SVG e imágenes"
        >
          {bajando ? "Preparando…" : "💾 Copia de seguridad"}
        </button>
        <button
          onClick={async () => {
            if (!confirm("⚠️ Esto BORRA todos los votos y votantes y pone los contadores a cero. Los diablos NO se tocan. ¿Continuar?"))
              return;
            if (!confirm("¿Seguro del todo? No se puede deshacer.")) return;
            await reiniciarVotos();
            recargar();
          }}
          title="Borra todos los votos para empezar limpio (no toca los diablos)"
        >
          🧹 Reiniciar votación
        </button>
      </div>

      {stats && stats.total_votantes > 0 && (
        <div className="card">
          <h3>Abandono</h3>
          <small>Cada punto es un votante: cuántos diablos hizo (eje Y) y cuánto tardó (eje X).</small>
          <div style={{ width: "100%", height: 280, marginTop: "0.5rem" }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 24, bottom: 24, left: 0 }}>
                <XAxis
                  type="number" dataKey="x" name="tiempo" unit=" min"
                  tick={{ fontSize: 10, fill: "#f4ead2" }} stroke="#f4ead2"
                  label={{ value: "minutos", position: "insideBottom", offset: -10, fill: "#f4ead2", fontSize: 11 }}
                />
                <YAxis
                  type="number" dataKey="y" name="diablos" allowDecimals={false}
                  domain={[0, stats.total_activos || "auto"]}
                  tick={{ fontSize: 10, fill: "#f4ead2" }} stroke="#f4ead2"
                  label={{ value: "diablos", angle: -90, position: "insideLeft", fill: "#f4ead2", fontSize: 11 }}
                />
                <ZAxis range={[90, 90]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v, n) => (n === "tiempo" ? [`${v} min`, "tiempo"] : [v, "diablos"])}
                  labelFormatter={() => ""}
                />
                <ReferenceLine
                  y={stats.media_por_persona} stroke="#cb3747" strokeDasharray="5 4"
                  label={{ value: `media ${stats.media_por_persona.toFixed(0)}`, fill: "#cb3747", fontSize: 11, position: "insideTopRight" }}
                />
                <Scatter data={puntos} fill="#feff9c" stroke="#1f1e1e" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <small>
            Sesión media: {fmtDur(stats.duracion_media_seg)} · {stats.seg_por_diablo.toFixed(1)} s/diablo
          </small>
        </div>
      )}

      {stats && stats.total_votantes > 0 && (
        <div className="card">
          <h3 style={{ margin: 0 }}>Participación</h3>
          <div className="stats-grid">
            <div className="stat">
              <b>{stats.total_votantes}</b>
              <span>votantes</span>
            </div>
            <div className="stat">
              <b>{stats.media_por_persona.toFixed(1)}</b>
              <span>diablos / persona</span>
            </div>
            <div className="stat">
              <b>{Math.round((1 - stats.tasa_abandono) * 100)}%</b>
              <span>finalizados</span>
            </div>
            <div className="stat">
              <b>{stats.completaron}</b>
              <span>completaron los {stats.total_activos}</span>
            </div>
            <div className="stat">
              <b>{stats.con_nombre}</b>
              <span>con nombre</span>
            </div>
            <div className="stat">
              <b>{stats.anonimos}</b>
              <span>anónimos</span>
            </div>
          </div>

          <details className="votantes-det">
            <summary>Ver votantes ({stats.total_votantes})</summary>
            <ul className="votantes-lista">
              {stats.votantes.map((v, i) => (
                <li key={i}>
                  <span className={v.nombre ? "vn-nombre" : "vn-anon"}>
                    {v.nombre || "anónimo"}
                  </span>
                  <span className="vn-votos">
                    {v.votos}/{stats.total_activos}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.1rem" }}>
          <h3 style={{ margin: 0 }}>Diablos</h3>
          <div className="row">
            <button onClick={() => setVerCuadro(true)} title="Vista previa del cuadro 3×3">
              Top 9
            </button>
            <button onClick={() => setVista("galeria")}>Ver galería</button>
          </div>
        </div>

        <div className="grid">
          {diablos.map((d) => {
            const puesto = puestoDe.get(d.id); // 1 = más votado (solo top 9)
            return (
            <div className="tile" key={d.id}>
              <div className="tile-img">
                {puesto && (
                  <span className={`rank ${puesto <= 3 ? "top3" : ""}`}>{puesto}</span>
                )}
                <img src={d.imagen_svg_url} alt={`Diablo ${d.id}`} />
              </div>
              <div className="meta">
                <strong>{String(d.id).padStart(3, "0")}</strong>
                {d.nombre ? ` · ${d.nombre}` : ""}
                <br />
                <span className={`badge ${d.estado}`}>{d.estado}</span>
                <br />
                <span className="tile-votos">
                  😈 <strong>{d.votos_positivos}</strong> votos
                </span>
                <br />
                {d.estado !== "activo" && (
                  <button onClick={() => cambiarEstado(d.id, "activo")}>activar</button>
                )}{" "}
                <button onClick={() => setEditando(d)} title="Editar">
                  ✏️
                </button>{" "}
                <button onClick={() => eliminar(d.id)} title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {editando && (
        <EditarDiablo
          diablo={editando}
          onGuardar={(cambios) => guardarEdicion(editando, cambios)}
          onCancel={() => setEditando(null)}
        />
      )}

      {/* Vista previa del cuadro: top 9 enmarcados 3×3 */}
      {verCuadro && (
        <div className="cuadro-full" onClick={() => setVerCuadro(false)}>
          <button
            className="gallery-close"
            onClick={() => setVerCuadro(false)}
            aria-label="Cerrar cuadro"
          >
            ✕
          </button>
          <div className="cuadro-marco" onClick={(e) => e.stopPropagation()}>
            <div className="cuadro-mat">
              <div className="cuadro-grid">
                {ranking.slice(0, 9).map((d) => (
                  <div className="cuadro-cell" key={d.id}>
                    <img src={d.imagen_svg_url} alt="" />
                  </div>
                ))}
              </div>
            </div>
            <div className="cuadro-placa">Cada cual con sus diablos · Top 9</div>
          </div>
        </div>
      )}

      {/* Galería a pantalla completa */}
      {vista === "galeria" && (
        <div className="gallery-full">
          <button
            className="gallery-close"
            onClick={() => setVista("detalle")}
            aria-label="Cerrar galería"
          >
            ✕
          </button>
          <div className="gallery">
            {diablos.map((d) => (
              <figure key={d.id} className="g-item">
                <img src={d.imagen_svg_url} alt={`Diablo ${d.id}`} />
                <figcaption className="g-id">
                  #{String(d.id).padStart(3, "0")}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
