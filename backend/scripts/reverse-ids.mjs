// Invierte el orden de los IDs de los diablos (el primero pasa a ser el ultimo,
// etc.). Uso:
//   node scripts/reverse-ids.mjs        -> SIMULACION (solo imprime el plan)
//   node scripts/reverse-ids.mjs go     -> EJECUTA
//
// Hace el cambio en dos fases con un rango temporal (+1000) para no chocar con
// la clave primaria, y renombra tambien los archivos de Storage + URLs.
import "dotenv/config";
import { supabase, BUCKET } from "../src/db/supabase.js";

// Rango temporal: debe caber en el check (id entre 1 y 100) y no solaparse con
// los IDs actuales. Con 19 diablos (1–19), +20 da 21–39, libre y valido.
const OFFSET = 20;
const go = process.argv[2] === "go";

const pad = (id) => String(id).padStart(3, "0");

async function moveFiles(oldId, newId) {
  for (const [dir, ext] of [["svg", "svg"], ["originales", "jpg"]]) {
    await supabase.storage
      .from(BUCKET)
      .move(`${dir}/${pad(oldId)}.${ext}`, `${dir}/${pad(newId)}.${ext}`)
      .catch(() => {}); // ignora si falta el archivo
  }
}

function urls(id) {
  const svg = supabase.storage.from(BUCKET).getPublicUrl(`svg/${pad(id)}.svg`).data.publicUrl;
  const orig = supabase.storage.from(BUCKET).getPublicUrl(`originales/${pad(id)}.jpg`).data.publicUrl;
  return { imagen_svg_url: svg, imagen_original_url: orig };
}

async function setRow(fromId, toId) {
  await moveFiles(fromId, toId);
  const { error } = await supabase
    .from("diablos")
    .update({ id: toId, ...urls(toId) })
    .eq("id", fromId);
  if (error) throw new Error(`(${fromId}→${toId}) ${error.message}`);
}

const { data, error } = await supabase.from("diablos").select("id").order("id");
if (error) throw error;
const ids = data.map((d) => d.id);
const n = ids.length;

// mapa de inversion: i-esimo <-> (n-1-i)-esimo
const plan = ids.map((id, i) => ({ from: id, to: ids[n - 1 - i] }));

console.log("Plan de inversion:");
for (const { from, to } of plan) console.log(`  ${pad(from)} -> ${pad(to)}`);

if (!go) {
  console.log("\n(SIMULACION) No se ha tocado nada. Ejecuta con 'go' para aplicar.");
  process.exit(0);
}

console.log("\nFase 1: mover a rango temporal (+" + OFFSET + ")…");
for (const { from } of plan) await setRow(from, from + OFFSET);

console.log("Fase 2: del temporal al ID definitivo…");
for (const { from, to } of plan) await setRow(from + OFFSET, to);

console.log("Hecho. IDs invertidos.");
