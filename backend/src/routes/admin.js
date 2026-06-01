import { Router } from "express";
import multer from "multer";
import { supabase, uploadToBucket, BUCKET } from "../db/supabase.js";
import { requireAuth } from "../lib/requireAuth.js";
import { vectorizePostit } from "../pipeline/index.js";

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

adminRouter.use(requireAuth); // todo el modo Dev requiere login

// Procesa una foto con el pipeline y devuelve el SVG SIN guardar (para la
// pantalla "Foto -> ver ID/foto/vectorizacion -> Repetir/Guardar").
// body: opcional crop manual { left, top, width, height }
adminRouter.post("/preview", upload.single("foto"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Falta foto" });
  try {
    const crop = req.body.crop ? JSON.parse(req.body.crop) : undefined;
    const thresholds = req.body.thresholds ? JSON.parse(req.body.thresholds) : undefined;
    const { svg, previewPng, masks } = await vectorizePostit(req.file.buffer, {
      crop,
      thresholds,
    });
    res.json({
      svg,
      preview_png_base64: previewPng.toString("base64"),
      // mascaras para que la UI muestre exactamente que se queda en cada capa
      mask_forma_base64: masks.forma.toString("base64"),
      mask_detalle_base64: masks.detalle.toString("base64"),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Guarda definitivamente: vectoriza, sube original+SVG a Storage e inserta la
// fila con el ID (001–100) que asigna Pako. estado = pendiente.
// multipart: foto (file) + id (text) + nombre? (text) + crop? (text json)
adminRouter.post("/diablos", upload.single("foto"), async (req, res) => {
  const id = Number(req.body.id);
  if (!req.file) return res.status(400).json({ error: "Falta foto" });
  if (!Number.isInteger(id) || id < 1 || id > 100) {
    return res.status(400).json({ error: "id debe ser 1–100" });
  }
  try {
    const crop = req.body.crop ? JSON.parse(req.body.crop) : undefined;
    const thresholds = req.body.thresholds ? JSON.parse(req.body.thresholds) : undefined;
    const { svg, original } = await vectorizePostit(req.file.buffer, { crop, thresholds });
    const pad = String(id).padStart(3, "0");

    const [originalUrl, svgUrl] = await Promise.all([
      // `original` ya es JPEG apto para navegador (HEIC convertido si hacia falta)
      uploadToBucket(`originales/${pad}.jpg`, original, "image/jpeg"),
      uploadToBucket(`svg/${pad}.svg`, Buffer.from(svg), "image/svg+xml"),
    ]);

    const { data, error } = await supabase
      .from("diablos")
      .upsert({
        id,
        nombre: req.body.nombre || null,
        imagen_original_url: originalUrl,
        imagen_svg_url: svgUrl,
        estado: "pendiente",
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lista todos los diablos (con contadores y score) — solo Dev.
adminRouter.get("/diablos", async (_req, res) => {
  const { data, error } = await supabase
    .from("diablos")
    .select("*")
    .order("id");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Cambia el estado de un diablo (p.ej. pendiente -> activo para abrir votacion).
adminRouter.patch("/diablos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const patch = {};
  if (req.body.estado) patch.estado = req.body.estado;
  if (req.body.nombre !== undefined) patch.nombre = req.body.nombre;
  const { data, error } = await supabase
    .from("diablos")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Pasa TODOS los pendientes a activo (abrir la votacion de golpe).
adminRouter.post("/activar-todos", async (_req, res) => {
  const { data, error } = await supabase
    .from("diablos")
    .update({ estado: "activo" })
    .eq("estado", "pendiente")
    .select("id");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ activados: data.length });
});

// Borra un diablo: fila en DB (los votos caen por ON DELETE CASCADE) y sus
// archivos en Storage. El ID queda LIBRE para reasignarlo a otro post-it.
adminRouter.delete("/diablos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const pad = String(id).padStart(3, "0");
  await supabase.storage.from(BUCKET).remove([`originales/${pad}.jpg`, `svg/${pad}.svg`]);
  const { error } = await supabase.from("diablos").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, liberado: id });
});

// Ranking + datos para graficas (solo Dev). Ordena por Wilson score.
adminRouter.get("/ranking", async (req, res) => {
  const top = req.query.top ? Number(req.query.top) : null;
  let q = supabase
    .from("diablos")
    .select("id, nombre, votos_positivos, votos_negativos, score, imagen_svg_url")
    .order("score", { ascending: false });
  if (top) q = q.limit(top);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const { count: votantes } = await supabase
    .from("votos")
    .select("votante_id", { count: "exact", head: true });

  res.json({ ranking: data, votos_totales: votantes ?? 0 });
});
