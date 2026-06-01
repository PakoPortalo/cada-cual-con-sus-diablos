import { supabase } from "../db/supabase.js";

// Protege las rutas de modo Dev. El frontend hace login con Supabase Auth y
// manda el access token como `Authorization: Bearer <token>`. Aqui se verifica
// contra Supabase. Solo Pako tiene usuario, asi que con estar autenticado basta.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Falta token" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Token invalido" });
  }
  req.user = data.user;
  next();
}
