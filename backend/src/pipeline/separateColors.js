import sharp from "sharp";
import { THRESHOLDS } from "./config.js";

// Separa la foto recortada en dos mascaras 1-bit listas para potrace:
//   - forma:   silueta completa de la cabeza = pixeles ROJOS ∪ NEGROS
//              (los detalles negros van DENTRO de la silueta roja)
//   - detalle: solo pixeles NEGROS (ojos, boca, lineas)
//
// En cada mascara el "tinta" (lo que potrace vectoriza) se pinta NEGRO (0) sobre
// fondo BLANCO (255), que es lo que potrace espera.
//
// `overrides` permite ajustar los umbrales por foto desde la UI de captura:
//   blackMax  ↑  => mas pixeles cuentan como NEGRO (mas detalle)
//   redMinR   ↓  /  redDelta ↓  => mas pixeles cuentan como ROJO (mas forma)
//
// Devuelve { forma, detalle } como buffers PNG en escala de grises.
export async function separateColors(croppedBuffer, overrides = {}) {
  const { data, info } = await sharp(croppedBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels = 3 (RGB)
  const n = width * height;
  const forma = Buffer.alloc(n, 255);
  const detalle = Buffer.alloc(n, 255);

  const { blackMax, redMinR, redDelta } = { ...THRESHOLDS, ...overrides };

  for (let i = 0, p = 0; i < n; i++, p += channels) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];

    const isBlack = Math.max(r, g, b) < blackMax;
    const isRed = r > redMinR && r - g > redDelta && r - b > redDelta;

    if (isBlack) {
      detalle[i] = 0; // negro = tinta
      forma[i] = 0; // el negro tambien forma parte de la silueta
    } else if (isRed) {
      forma[i] = 0;
    }
    // resto (amarillo/fondo) queda blanco en ambas
  }

  const toPng = (buf) =>
    sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer();

  return {
    forma: await toPng(forma),
    detalle: await toPng(detalle),
    width,
    height,
  };
}
