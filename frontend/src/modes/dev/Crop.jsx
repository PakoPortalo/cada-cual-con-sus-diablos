import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

// Recorte manual cuadrado (estilo editor de fotos): arrastrar + zoom. Se recorta
// en el cliente antes de vectorizar, para dejar fuera el fondo.
export default function Crop({ src, onDone, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState(null);

  const onComplete = useCallback((_area, areaPixels) => setAreaPx(areaPixels), []);

  async function aceptar() {
    const file = await recortar(src, areaPx);
    onDone(file);
  }

  return (
    <div className="crop">
      <div className="crop-area">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1} // cuadrado
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onComplete}
          restrictPosition={false}
        />
      </div>
      <label className="slider">
        <span>Zoom</span>
        <input
          type="range"
          min="1"
          max="4"
          step="0.01"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>
      <div className="row" style={{ justifyContent: "center" }}>
        <button onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={aceptar} disabled={!areaPx}>
          ✂️ Recortar
        </button>
      </div>
    </div>
  );
}

// Recorta la región (px del original) a un JPEG cuadrado.
function recortar(src, area) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const out = 1400;
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, out, out);
      ctx.drawImage(
        img,
        area.x, area.y, area.width, area.height,
        0, 0, out, out
      );
      canvas.toBlob(
        (blob) =>
          resolve(new File([blob], `recorte-${Date.now()}.jpg`, { type: "image/jpeg" })),
        "image/jpeg",
        0.95
      );
    };
    img.src = src;
  });
}
