import { supabase } from "./supabase.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Lee el mensaje de error de una respuesta fallida sin asumir que el cuerpo es
// JSON. Si el backend está reiniciando, el proxy puede devolver HTML; en ese
// caso mostramos "Error <status>" en vez de un críptico "JSON.parse...".
async function leerError(r) {
  const txt = await r.text();
  try {
    return JSON.parse(txt).error || `Error ${r.status}`;
  } catch {
    return `Error ${r.status}`;
  }
}

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
  if (!r.ok) throw new Error(await leerError(r));
  return r.json(); // { registrado, nombre }
}

// nombre vacio/omitido => anonimo
export async function registrarVotante(nombre) {
  const r = await fetch(`${API}/votante`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ votante_id: getVotanteId(), nombre: nombre || "" }),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

// Estado de la votación (público): { abierta }
export async function fetchVotacion() {
  const r = await fetch(`${API}/votacion`);
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function fetchPendientes() {
  const r = await fetch(`${API}/diablos?votante=${getVotanteId()}`);
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function votar(diabloId, valor) {
  const r = await fetch(`${API}/diablos/${diabloId}/voto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ votante_id: getVotanteId(), valor }),
  });
  if (!r.ok && r.status !== 409) throw new Error(await leerError(r));
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
  if (!r.ok) throw new Error(await leerError(r));
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
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function listarDiablos() {
  const r = await fetch(`${API}/admin/diablos`, { headers: await authHeaders() });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function patchDiablo(id, patch) {
  const r = await fetch(`${API}/admin/diablos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function reasignarDiablo(id, nuevoId) {
  const r = await fetch(`${API}/admin/diablos/${id}/reasignar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ nuevoId }),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function borrarDiablo(id) {
  const r = await fetch(`${API}/admin/diablos/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function reiniciarVotos() {
  const r = await fetch(`${API}/admin/reset-votos`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function activarTodos() {
  const r = await fetch(`${API}/admin/activar-todos`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

// Descarga el ZIP de copia de seguridad y dispara la descarga en el navegador.
export async function descargarBackup() {
  const r = await fetch(`${API}/admin/export`, { headers: await authHeaders() });
  if (!r.ok) {
    const txt = await r.text();
    let msg = txt;
    try {
      msg = JSON.parse(txt).error || txt;
    } catch {
      /* respuesta no-JSON: usar texto crudo */
    }
    throw new Error(msg || `Error ${r.status}`);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-diablos-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Interruptor de la votación (Dev): abre/cierra
export async function setVotacionAbierta(abierta) {
  const r = await fetch(`${API}/admin/votacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ abierta }),
  });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function fetchStats() {
  const r = await fetch(`${API}/admin/stats`, { headers: await authHeaders() });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}

export async function fetchRanking(top) {
  const url = top ? `${API}/admin/ranking?top=${top}` : `${API}/admin/ranking`;
  const r = await fetch(url, { headers: await authHeaders() });
  if (!r.ok) throw new Error(await leerError(r));
  return r.json();
}
