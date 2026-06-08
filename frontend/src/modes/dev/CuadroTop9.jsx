import { useState } from "react";

// Vista previa del cuadro (Top 9) con recolocación por arrastre: coges un
// diablo, lo sueltas sobre otro y se INTERCAMBIAN de posición. Para componer el
// 3×3. Usa pointer events => funciona con ratón y con dedo. El orden es local
// (no se guarda en la DB; es solo para ver la composición).
export default function CuadroTop9({ top9, onClose }) {
  const [orden, setOrden] = useState(top9);
  const [drag, setDrag] = useState(null); // índice que se arrastra
  const [over, setOver] = useState(null); // índice bajo el puntero

  function mover(e) {
    if (drag === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest?.("[data-idx]");
    setOver(cell ? Number(cell.dataset.idx) : null);
  }

  function soltar() {
    if (drag !== null && over !== null && over !== drag) {
      setOrden((prev) => {
        const a = [...prev];
        [a[drag], a[over]] = [a[over], a[drag]]; // intercambio
        return a;
      });
    }
    setDrag(null);
    setOver(null);
  }

  return (
    <div className="cuadro-full" onClick={onClose}>
      <button className="gallery-close" onClick={onClose} aria-label="Cerrar cuadro">
        ✕
      </button>
      <div className="cuadro-marco" onClick={(e) => e.stopPropagation()}>
        <div className="cuadro-grid" onPointerMove={mover} onPointerUp={soltar}>
          {orden.map((d, i) => (
            <div
              key={d.id}
              data-idx={i}
              className={`cuadro-cell ${drag === i ? "drag" : ""} ${
                over === i && drag !== null && over !== drag ? "over" : ""
              }`}
              onPointerDown={(e) => {
                setDrag(i);
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
            >
              <img src={d.imagen_svg_url} alt="" draggable="false" />
            </div>
          ))}
        </div>
        <div className="cuadro-placa">Cada cual con sus diablos</div>
        <div className="cuadro-hint">arrastra para recolocar</div>
      </div>
    </div>
  );
}
