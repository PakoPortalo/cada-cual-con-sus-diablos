import { Router } from "express";
import { supabase } from "../db/supabase.js";

export const votantesRouter = Router();

// GET /votante/:id -> ¿ya se registro este navegador? (para saltar la pantalla
// de nombre en visitas siguientes)
votantesRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("votantes")
    .select("votante_id, nombre")
    .eq("votante_id", req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ registrado: !!data, nombre: data?.nombre ?? null });
});

// POST /votante  body: { votante_id, nombre? }  (sin nombre o vacio => anonimo)
votantesRouter.post("/", async (req, res) => {
  const { votante_id, nombre } = req.body || {};
  if (!votante_id) return res.status(400).json({ error: "Falta votante_id" });
  const limpio = (nombre || "").trim();
  const { error } = await supabase
    .from("votantes")
    .upsert({ votante_id, nombre: limpio || null });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
