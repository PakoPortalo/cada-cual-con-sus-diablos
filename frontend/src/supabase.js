import { createClient } from "@supabase/supabase-js";

// Cliente Supabase SOLO para el login del modo Dev (Auth). Usa la ANON key
// (publica). Toda la logica de datos pasa por el backend, no por aqui.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
