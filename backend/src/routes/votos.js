import { Router } from "express";
import { supabase } from "../db/supabase.js";
import { wilsonScore } from "../lib/wilson.js";

export const votosRouter = Router();

// POST /diablos/:id/voto   body: { votante_id, valor }  valor: 1 (👿) | -1 (💀)
// Registra el voto (idempotente: un voto por diablo y votante) y recalcula el
// Wilson score del diablo. No devuelve resultados al votante.
votosRouter.post("/:id/voto", async (req, res) => {
  const diabloId = Number(req.params.id);
  const { votante_id, valor } = req.body || {};

  if (!votante_id) return res.status(400).json({ error: "Falta votante_id" });
  if (valor !== 1 && valor !== -1) {
    return res.status(400).json({ error: "valor debe ser 1 o -1" });
  }

  // insertar voto; si ya existe (diablo, votante) -> conflicto, ya habia votado
  const { error: insErr } = await supabase
    .from("votos")
    .insert({ diablo_id: diabloId, votante_id, valor });
  if (insErr) {
    if (insErr.code === "23505") {
      return res.status(409).json({ error: "Ya votaste este diablo" });
    }
    return res.status(500).json({ error: insErr.message });
  }

  // recontar y recalcular score (fuente de verdad = tabla votos)
  const { data: votos, error: cntErr } = await supabase
    .from("votos")
    .select("valor")
    .eq("diablo_id", diabloId);
  if (cntErr) return res.status(500).json({ error: cntErr.message });

  const pos = votos.filter((v) => v.valor === 1).length;
  const neg = votos.filter((v) => v.valor === -1).length;

  const { error: updErr } = await supabase
    .from("diablos")
    .update({
      votos_positivos: pos,
      votos_negativos: neg,
      score: wilsonScore(pos, neg),
    })
    .eq("id", diabloId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  res.json({ ok: true });
});
