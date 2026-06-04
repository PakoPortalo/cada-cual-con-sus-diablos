import { useEffect, useRef, useState } from "react";

// Cámara dentro de la app con cuadro guía CUADRADO en vivo. Lo que ves dentro
// del cuadrado es exactamente lo que se captura (recorte 1:1 centrado).
// Requiere contexto seguro (HTTPS o localhost) para getUserMedia.
export default function Camera({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }, // cámara trasera en móvil
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setListo(true);
        }
      } catch (e) {
        setError(
          e.name === "NotAllowedError"
            ? "Permiso de cámara denegado."
            : "No se pudo abrir la cámara (¿HTTPS?). " + e.message
        );
      }
    })();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function disparar() {
    const v = videoRef.current;
    if (!v) return;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const side = Math.min(vw, vh); // cuadrado centrado (igual que el guía)
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    const out = 1400; // resolución del recorte
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    canvas.getContext("2d").drawImage(v, sx, sy, side, side, 0, 0, out, out);
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `captura-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(file);
      },
      "image/jpeg",
      0.95
    );
  }

  if (error)
    return (
      <div className="cam">
        <p className="err">{error}</p>
        <button onClick={onCancel}>Cerrar</button>
      </div>
    );

  return (
    <div className="cam">
      <div className="cam-square">
        <video ref={videoRef} playsInline muted />
        <div className="cam-guide" />
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: "1rem" }}>
        <button onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={disparar} disabled={!listo}>
          ◉ Capturar
        </button>
      </div>
      <p style={{ textAlign: "center", opacity: 0.6, fontSize: "0.85rem" }}>
        Encaja el post-it dentro del cuadro.
      </p>
    </div>
  );
}
