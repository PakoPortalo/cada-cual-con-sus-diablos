import { supabase } from "./supabase.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Publico ────────────────────────────────────────────────────────────────

// Identidad persistente del votante (localStorage). Decision: sin login, sin
// links unicos; basta para amigos de confianza.
export function getVotanteId() {
  let id = localStorage.getItem("votante_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("votante_id", id);
  }
  return id;
}

export async function getVotante() {
  const r = await fetch(`${API}/votante/${getVotanteId()}`);
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json(); // { registrado, nombre }
}

// nombre vacio/omitido => anonimo
export async function registrarVotante(nombre) {
  const r = await fetch(`${API}/votante`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ votante_id: getVotanteId(), nombre: nombre || "" }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function fetchPendientes() {
  const r = await fetch(`${API}/diablos?votante=${getVotanteId()}`);
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function votar(diabloId, valor) {
  const r = await fetch(`${API}/diablos/${diabloId}/voto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ votante_id: getVotanteId(), valor }),
  });
  if (!r.ok && r.status !== 409) throw new Error((await r.json()).error || "Error");
  return r.json();
}

// ─── Dev (con token de Supabase Auth) ─────────────────────────────────────────

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Previsualiza la vectorizacion (no guarda). thresholds = { blackMax, redMinR, redDelta }
export async function previewDiablo(file, thresholds) {
  const fd = new FormData();
  fd.append("foto", file);
  if (thresholds) fd.append("thresholds", JSON.stringify(thresholds));
  const r = await fetch(`${API}/admin/preview`, {
    method: "POST",
    headers: await authHeaders(),
    body: fd,
  });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function guardarDiablo(file, { id, nombre, thresholds }) {
  const fd = new FormData();
  fd.append("foto", file);
  fd.append("id", String(id));
  if (nombre) fd.append("nombre", nombre);
  if (thresholds) fd.append("thresholds", JSON.stringify(thresholds));
  const r = await fetch(`${API}/admin/diablos`, {
    method: "POST",
    headers: await authHeaders(),
    body: fd,
  });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function listarDiablos() {
  const r = await fetch(`${API}/admin/diablos`, { headers: await authHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function patchDiablo(id, patch) {
  const r = await fetch(`${API}/admin/diablos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function activarTodos() {
  const r = await fetch(`${API}/admin/activar-todos`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}

export async function fetchRanking(top) {
  const url = top ? `${API}/admin/ranking?top=${top}` : `${API}/admin/ranking`;
  const r = await fetch(url, { headers: await authHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Error");
  return r.json();
}
