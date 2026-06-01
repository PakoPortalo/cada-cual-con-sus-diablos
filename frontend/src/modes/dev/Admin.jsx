import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { listarDiablos, patchDiablo, activarTodos, fetchRanking } from "../../api.js";

// Panel Dev: estado de los 100 diablos + resultados/graficas (SOLO aqui, nunca
// en el modo publico). Permite abrir la votacion y revisar el ranking Wilson.
export default function Admin() {
  const [diablos, setDiablos] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [votosTotales, setVotosTotales] = useState(0);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("detalle"); // detalle | galeria

  async function recargar() {
    try {
      const [d, r] = await Promise.all([listarDiablos(), fetchRanking()]);
      setDiablos(d);
      setRanking(r.ranking);
      setVotosTotales(r.votos_totales);
    } catch (e) {
      setError(e.message);
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

  const datosGrafica = ranking.map((d) => ({
    name: String(d.id).padStart(3, "0"),
    score: Number((d.score * 100).toFixed(1)),
    pos: d.votos_positivos,
    neg: d.votos_negativos,
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
        <button
          className="btn-primary"
          onClick={async () => {
            if (confirm("¿Pasar todos los pendientes a ACTIVO y abrir la votación?")) {
              await activarTodos();
              recargar();
            }
          }}
        >
          Abrir votación (activar pendientes)
        </button>
      </div>

      {ranking.some((d) => d.votos_positivos + d.votos_negativos > 0) && (
        <div className="card">
          <h3>Ranking (Wilson score %)</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={datosGrafica}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(v, n) =>
                    n === "score" ? [`${v}%`, "Wilson"] : [v, n]
                  }
                />
                <Bar dataKey="score">
                  {datosGrafica.map((_, i) => (
                    <Cell key={i} fill={i < 9 ? "#cb3747" : "#1a1a1a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <small>En rojo, el top 9 (candidatos a serigrafía 3×3).</small>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Diablos</h3>
          <button onClick={() => setVista(vista === "detalle" ? "galeria" : "detalle")}>
            {vista === "detalle" ? "🖼️ Ver galería" : "📋 Ver detalle"}
          </button>
        </div>

        {vista === "galeria" ? (
          <div className="gallery">
            {diablos.map((d) => (
              <img key={d.id} src={d.imagen_svg_url} alt={`Diablo ${d.id}`} />
            ))}
          </div>
        ) : (
          <div className="grid">
            {diablos.map((d) => (
              <div className="tile" key={d.id}>
                <img src={d.imagen_svg_url} alt={`Diablo ${d.id}`} />
                <div className="meta">
                  <strong>{String(d.id).padStart(3, "0")}</strong>
                  {d.nombre ? ` · ${d.nombre}` : ""}
                  <br />
                  <span className={`badge ${d.estado}`}>{d.estado}</span>
                  <br />
                  👿{d.votos_positivos} 💀{d.votos_negativos}
                  <br />
                  {d.estado !== "activo" ? (
                    <button onClick={() => cambiarEstado(d.id, "activo")}>activar</button>
                  ) : (
                    <button onClick={() => cambiarEstado(d.id, "archivado")}>archivar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
