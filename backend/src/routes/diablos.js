import { Router } from "express";
import { supabase } from "../db/supabase.js";

export const diablosRouter = Router();

// GET /diablos?votante=<votante_id>
// Modo Publico: devuelve los diablos `activo` que ese votante AUN no ha votado.
// Sin contadores ni score — los votantes no ven resultados. Tambien informa de
// cuantos quedan y si ya estan todos (para la pantalla final).
diablosRouter.get("/", async (req, res) => {
  const votante = req.query.votante;
  if (!votante) return res.status(400).json({ error: "Falta votante" });

  // ids ya votados por este votante
  const { data: votados, error: e1 } = await supabase
    .from("votos")
    .select("diablo_id")
    .eq("votante_id", votante);
  if (e1) return res.status(500).json({ error: e1.message });
  const votadosIds = votados.map((v) => v.diablo_id);

  // diablos activos pendientes de votar por este votante
  let q = supabase
    .from("diablos")
    .select("id, nombre, imagen_svg_url")
    .eq("estado", "activo")
    .order("id");
  if (votadosIds.length) q = q.not("id", "in", `(${votadosIds.join(",")})`);

  const { data: pendientes, error: e2 } = await q;
  if (e2) return res.status(500).json({ error: e2.message });

  const { count: totalActivos } = await supabase
    .from("diablos")
    .select("id", { count: "exact", head: true })
    .eq("estado", "activo");

  res.json({
    diablos: pendientes,
    restantes: pendientes.length,
    total: totalActivos ?? 0,
    completado: pendientes.length === 0 && (totalActivos ?? 0) > 0,
  });
});
