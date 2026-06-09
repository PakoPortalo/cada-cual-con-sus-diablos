import { Router } from "express";
import multer from "multer";
import { createRequire } from "module";
import { supabase, uploadToBucket, BUCKET, selectAll } from "../db/supabase.js";

const require = createRequire(import.meta.url);
const JSZip = require("jszip"); // CommonJS
import { requireAuth } from "../lib/requireAuth.js";
import { vectorizePostit } from "../pipeline/index.js";
import { getVotacion, setVotacion } from "../lib/votacion.js";

export const adminRouter = Router();

// Para el backup: centra el diablo dentro del cuadrado (su bounding box no está
// centrada) y deja el tamaño físico del post-it (7,5×7,5 cm). Así el SVG abierto
// suelto se ve cuadrado, centrado y al tamaño real. No toca el viewBox (0 0 74 74).
function centrarSvg(svg) {
  const VB = 74; // lado del viewBox
  const m = svg.match(/scale\(([0-9.]+)\)/);
  const s = m ? parseFloat(m[1]) : 1;
  const ds = [...svg.matchAll(/ d="([^"]+)"/g)].map((x) => x[1]).join(" ");
  const nums = (ds.match(/-?\d+\.?\d*/g) || []).map(Number);
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  if (!Number.isFinite(minx)) return svg; // sin paths: dejar igual
  const tx = (VB / 2 - ((minx + maxx) / 2) * s).toFixed(3);
  const ty = (VB / 2 - ((miny + maxy) / 2) * s).toFixed(3);
  return svg
    .replace(/transform="scale\(([0-9.]+)\)"/, `transform="translate(${tx} ${ty}) scale($1)"`)
    .replace(/width="[^"]+" height="[^"]+"/, 'width="75mm" height="75mm"');
}
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

// Reasigna el ID de un diablo (p.ej. lo guardaste con el numero equivocado).
// Renombra tambien sus archivos en Storage y actualiza las URLs. El nuevo ID
// debe estar libre. (Hazlo antes de que haya votos: el ID es clave foranea.)
adminRouter.post("/diablos/:id/reasignar", async (req, res) => {
  const id = Number(req.params.id);
  const nuevoId = Number(req.body.nuevoId);
  if (!Number.isInteger(nuevoId) || nuevoId < 1 || nuevoId > 100) {
    return res.status(400).json({ error: "nuevoId debe ser 1–100" });
  }
  if (nuevoId === id) return res.json({ ok: true });

  const { data: ocupado } = await supabase
    .from("diablos").select("id").eq("id", nuevoId).maybeSingle();
  if (ocupado) return res.status(409).json({ error: `El ID ${nuevoId} ya está ocupado` });

  const padOld = String(id).padStart(3, "0");
  const padNew = String(nuevoId).padStart(3, "0");
  // mover archivos (si existen) y recalcular URLs
  await supabase.storage.from(BUCKET).move(`originales/${padOld}.jpg`, `originales/${padNew}.jpg`).catch(() => {});
  await supabase.storage.from(BUCKET).move(`svg/${padOld}.svg`, `svg/${padNew}.svg`).catch(() => {});
  const origUrl = supabase.storage.from(BUCKET).getPublicUrl(`originales/${padNew}.jpg`).data.publicUrl;
  const svgUrl = supabase.storage.from(BUCKET).getPublicUrl(`svg/${padNew}.svg`).data.publicUrl;

  const { data, error } = await supabase
    .from("diablos")
    .update({ id: nuevoId, imagen_original_url: origUrl, imagen_svg_url: svgUrl })
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

// Reinicia la votacion: borra TODOS los votos y votantes y pone a cero los
// contadores/score de los diablos. NO toca los diablos ni sus imagenes.
// Util para limpiar las pruebas antes de abrir la votacion de verdad.
adminRouter.post("/reset-votos", async (_req, res) => {
  const delVotos = await supabase.from("votos").delete().neq("id", 0);
  if (delVotos.error) return res.status(500).json({ error: delVotos.error.message });
  const delVotantes = await supabase.from("votantes").delete().neq("votante_id", "");
  if (delVotantes.error) return res.status(500).json({ error: delVotantes.error.message });
  const upd = await supabase
    .from("diablos")
    .update({ votos_positivos: 0, votos_negativos: 0, score: 0 })
    .neq("id", 0);
  if (upd.error) return res.status(500).json({ error: upd.error.message });
  res.json({ ok: true });
});

// Copia de seguridad: ZIP con la base de datos (JSON) + todos los SVG e
// imagenes originales. Para migrar o restaurar si se cae todo.
adminRouter.get("/export", async (_req, res) => {
  let diablos, votantes, votos;
  try {
    // votos paginado (supera 1000 filas) para que el backup esté COMPLETO
    [diablos, votantes, votos] = await Promise.all([
      selectAll("diablos", "*", (q) => q.order("id")),
      selectAll("votantes", "*"),
      selectAll("votos", "*"),
    ]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const zip = new JSZip();

  // Base de datos como JSON
  zip.file("data/diablos.json", JSON.stringify(diablos, null, 2));
  zip.file("data/votantes.json", JSON.stringify(votantes, null, 2));
  zip.file("data/votos.json", JSON.stringify(votos, null, 2));

  // Archivos de Storage (SVG + originales) de cada diablo
  for (const d of diablos) {
    const pad = String(d.id).padStart(3, "0");
    for (const path of [`svg/${pad}.svg`, `originales/${pad}.jpg`]) {
      const { data } = await supabase.storage.from(BUCKET).download(path);
      if (!data) continue;
      let buf = Buffer.from(await data.arrayBuffer());
      // Centra el diablo en el cuadrado y deja tamaño físico 7,5×7,5 cm.
      if (path.endsWith(".svg")) buf = Buffer.from(centrarSvg(buf.toString("utf8")));
      zip.file(path, buf);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="backup-diablos-${fecha}.zip"`);
  res.send(buffer);
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

// Estado de la votación + interruptor (solo Dev).
adminRouter.get("/votacion", async (_req, res) => res.json(await getVotacion()));
adminRouter.post("/votacion", async (req, res) => {
  try {
    res.json(await setVotacion(req.body.abierta));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Estadisticas de participacion (solo Dev): abandono, media de diablos por
// persona, y quien voto con nombre / anonimo.
adminRouter.get("/stats", async (_req, res) => {
  let votantes, votos, totalActivos;
  try {
    // paginado: votos ya supera las 1000 filas; sin esto los conteos se truncan
    [votantes, votos] = await Promise.all([
      selectAll("votantes", "votante_id, nombre"),
      selectAll("votos", "votante_id, creado_en"),
    ]);
    const activosR = await supabase
      .from("diablos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo");
    if (activosR.error) throw new Error(activosR.error.message);
    totalActivos = activosR.count ?? 0;
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // por votante: nº de votos + primer/último timestamp (para duración)
  const porVotante = new Map(); // id -> count
  const tiempos = new Map(); // id -> { min, max }
  for (const v of votos) {
    porVotante.set(v.votante_id, (porVotante.get(v.votante_id) || 0) + 1);
    const t = new Date(v.creado_en).getTime();
    const e = tiempos.get(v.votante_id) || { min: t, max: t };
    e.min = Math.min(e.min, t);
    e.max = Math.max(e.max, t);
    tiempos.set(v.votante_id, e);
  }

  // lista (nombre = null => anonimo), ordenada por nº de votos desc
  const lista = votantes
    .map((vt) => ({ nombre: vt.nombre || null, votos: porVotante.get(vt.votante_id) || 0 }))
    .sort((a, b) => b.votos - a.votos);

  const totalVotantes = votantes.length;
  const totalVotos = votos.length;
  const conNombre = votantes.filter((v) => (v.nombre || "").trim()).length;
  const anonimos = totalVotantes - conNombre;
  const media = totalVotantes ? totalVotos / totalVotantes : 0;
  // completaron = votaron TODOS los diablos activos
  const completaron =
    totalActivos > 0 ? lista.filter((v) => v.votos >= totalActivos).length : 0;
  const tasaAbandono = totalVotantes ? 1 - completaron / totalVotantes : 0;

  // un punto por votante: cuántos diablos hizo y cuánto tardó (segundos)
  const puntos = votantes.map((vt) => {
    const c = porVotante.get(vt.votante_id) || 0;
    const e = tiempos.get(vt.votante_id);
    const seg = c >= 2 && e ? Math.round((e.max - e.min) / 1000) : 0;
    return { diablos: c, seg, nombre: vt.nombre || null };
  });

  // tiempos medios (solo sesiones con >=2 votos para que el hueco tenga sentido)
  let totTiempo = 0;
  let totHuecos = 0;
  const duraciones = [];
  for (const vt of votantes) {
    const c = porVotante.get(vt.votante_id) || 0;
    const e = tiempos.get(vt.votante_id);
    if (c >= 2 && e) {
      const s = (e.max - e.min) / 1000;
      duraciones.push(s);
      totTiempo += s;
      totHuecos += c - 1;
    }
  }
  const duracionMediaSeg = duraciones.length
    ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length
    : 0;
  const segPorDiablo = totHuecos ? totTiempo / totHuecos : 0;

  res.json({
    total_activos: totalActivos,
    total_votantes: totalVotantes,
    con_nombre: conNombre,
    anonimos,
    total_votos: totalVotos,
    media_por_persona: media,
    completaron,
    tasa_abandono: tasaAbandono,
    duracion_media_seg: duracionMediaSeg,
    seg_por_diablo: segPorDiablo,
    puntos,
    votantes: lista,
  });
});
