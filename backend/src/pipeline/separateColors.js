import sharp from "sharp";
import { THRESHOLDS } from "./config.js";

// Separa la foto recortada en dos mascaras 1-bit listas para potrace:
//   - forma:   cuerpo del diablo = ROJO ∪ NEGRO, con huecos rellenos.
//   - detalle: solo pixeles NEGROS (ojos, boca, lineas)
//
// La forma es el CUERPO completo (el negro tambien cuenta, porque los dientes/
// rasgos negros estan dentro del cuerpo). Luego, en el pipeline, un cierre
// morfologico la redondea y rellena las concavidades pequeñas (dientes) sin
// perder los cuernos. Aqui solo generamos la mascara cruda + relleno de huecos.
//
// Clasificacion en HSV (robusta a la luz):
//   NEGRO = brillo (V) < valueMax       -> detalle
//   ROJO  = saturacion (S) >= satMin y tono (H) cerca del rojo (±hueRange) -> forma
//
// Devuelve { forma, detalle } como buffers PNG en escala de grises.
export async function separateColors(croppedBuffer, overrides = {}) {
  const { data, info } = await sharp(croppedBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels = 3 (RGB)
  const n = width * height;
  const { valueMax, satMin, hueRange } = { ...THRESHOLDS, ...overrides };

  const cuerpo = new Uint8Array(n); // rojo ∪ negro (silueta del cuerpo)
  const detalle = Buffer.alloc(n, 255);

  for (let i = 0, p = 0; i < n; i++, p += channels) {
    const r = data[p] / 255;
    const g = data[p + 1] / 255;
    const b = data[p + 2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    const v = max * 100;
    const s = max === 0 ? 0 : (d / max) * 100;

    let h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }

    const black = v < valueMax;
    const red = !black && s >= satMin && (h <= hueRange || h >= 360 - hueRange);
    if (black) detalle[i] = 0; // tinta negra (capa detalle)
    if (black || red) cuerpo[i] = 1; // rojo y negro forman el cuerpo
  }

  // Forma = cuerpo + huecos interiores rellenos.
  const forma = fillHoles(cuerpo, width, height);

  const toPng = (buf) =>
    sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer();

  return {
    forma: await toPng(forma),
    detalle: await toPng(detalle),
    width,
    height,
  };
}

// Rellena los huecos de una mascara: todo pixel de fondo que NO sea alcanzable
// desde el borde (es decir, encerrado por el primer plano) pasa a primer plano.
// Devuelve buffer 1-canal: 0 = tinta (forma), 255 = fondo.
function fillHoles(mask, width, height) {
  const n = width * height;
  const outside = new Uint8Array(n); // fondo conectado al borde
  const stack = new Int32Array(n);
  let top = 0;

  const seed = (i) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1;
      stack[top++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x); // fila superior
    seed((height - 1) * width + x); // fila inferior
  }
  for (let y = 0; y < height; y++) {
    seed(y * width); // columna izq
    seed(y * width + width - 1); // columna der
  }

  while (top > 0) {
    const i = stack[--top];
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (y > 0) seed(i - width);
    if (y < height - 1) seed(i + width);
  }

  const out = Buffer.alloc(n, 255);
  for (let i = 0; i < n; i++) {
    // tinta si es rojo, o fondo encerrado (hueco interior)
    if (mask[i] || !outside[i]) out[i] = 0;
  }
  return out;
}
