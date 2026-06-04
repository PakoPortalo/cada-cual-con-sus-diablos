import { supabase, BUCKET } from "../db/supabase.js";

// Estado de la votación (abierta/cerrada). Lo guardamos como un JSON en el
// Storage para no tocar el esquema de la DB. Cache en memoria para no descargar
// el archivo en cada voto; se actualiza al alternar el interruptor.
const PATH = "config/votacion.json";
let cache = null; // { abierta }

export async function getVotacion() {
  if (cache) return cache;
  const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
  if (!error && data) {
    try {
      cache = JSON.parse(Buffer.from(await data.arrayBuffer()).toString("utf8"));
      return cache;
    } catch {
      /* json corrupto: caer al valor por defecto */
    }
  }
  cache = { abierta: true }; // por defecto, abierta
  return cache;
}

export async function setVotacion(abierta) {
  cache = { abierta: !!abierta };
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(PATH, Buffer.from(JSON.stringify(cache)), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw new Error(error.message);
  return cache;
}
