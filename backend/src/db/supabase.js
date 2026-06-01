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

// Sube un buffer al bucket publico y devuelve su URL publica.
export async function uploadToBucket(path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
