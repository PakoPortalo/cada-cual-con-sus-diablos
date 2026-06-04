import { useState } from "react";

// Modal para editar atributos de un diablo: ID (reasignar) y nombre.
export default function EditarDiablo({ diablo, onGuardar, onCancel }) {
  const [id, setId] = useState(String(diablo.id));
  const [nombre, setNombre] = useState(diablo.nombre || "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const nuevoId = Number(id);
    if (!Number.isInteger(nuevoId) || nuevoId < 1 || nuevoId > 100) {
      setError("El ID debe ser 1–100");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ nuevoId, nombre });
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Editar diablo {String(diablo.id).padStart(3, "0")}</h3>
        <img
          src={diablo.imagen_svg_url}
          alt=""
          style={{ width: 120, height: 120, objectFit: "contain", background: "var(--crema)" }}
        />
        <p>
          <label>
            ID&nbsp;
            <input
              type="number"
              min="1"
              max="100"
              value={id}
              onChange={(e) => setId(e.target.value)}
              style={{ width: 80 }}
            />
          </label>
        </p>
        <p>
          <label>
            Nombre&nbsp;
            <input
              type="text"
              value={nombre}
              placeholder="opcional"
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
        </p>
        {error && <p className="err">{error}</p>}
        <div className="row">
          <button onClick={onCancel} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
