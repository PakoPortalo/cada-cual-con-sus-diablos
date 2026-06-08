import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    "[supabase] Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en .env — las rutas que tocan la DB fallaran."
  );
}

// Cliente con SERVICE ROLE (solo backend): salta RLS. Nunca exponer esta key.
export const supabase = createClient(
  SUPABASE_URL || "http://localhost",
  SUPABASE_SERVICE_KEY || "missing",
  { auth: { persistSession: false } }
);

export const BUCKET = SUPABASE_BUCKET || "diablos";

// Trae TODAS las filas de una tabla paginando (Supabase limita a 1000 por
// consulta). Imprescindible para `votos`, que ya supera las 1000 filas: sin
// esto los conteos salen truncados (votantes que parecen tener 0 votos).
export async function selectAll(table, columns = "*", build) {
  const PAGE = 1000;
  let from = 0;
  const todo = [];
  for (;;) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    todo.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return todo;
}

// Sube un buffer al bucket publico y devuelve su URL publica.
export async function uploadToBucket(path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
