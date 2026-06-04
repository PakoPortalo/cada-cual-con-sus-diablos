import sharp from "sharp";
import { normalizeImage } from "./normalize.js";
import { closeMask } from "./morph.js";
import { detectBorder } from "./detectBorder.js";
import { separateColors } from "./separateColors.js";
import { tracePath } from "./vectorize.js";
import { buildSvg } from "./buildSvg.js";
import { POTRACE } from "./config.js";

// Pipeline completo: foto del post-it -> SVG de dos capas con color fijo.
//
// Devuelve { svg, previewPng, masks } donde:
//   - svg:        string SVG final (2 grupos forma/detalles, colores fijos)
//   - previewPng: render PNG del SVG para previsualizar
//   - masks:      { forma, detalle } PNGs intermedios (utiles para depurar el spike)
//
// opts: { crop } para recorte manual; { thresholds } para ajustar por foto
// cuanta tinta se queda en cada capa (blackMax / redMinR / redDelta).
export async function vectorizePostit(inputBuffer, opts = {}) {
  const normalized = await normalizeImage(inputBuffer); // HEIC -> JPEG si hace falta
  const cropped = await detectBorder(normalized, opts);
  let { forma, detalle, width } = await separateColors(cropped, opts.thresholds);

  // Redondez: cierre morfologico SOLO en la forma -> entiende el cuerpo del
  // diablo, rellena dientes/entrantes y lo redondea, sin tocar los cuernos.
  const shapeClose = opts.thresholds?.shapeClose ?? 8;
  forma = await closeMask(forma, shapeClose);

  // Suavizado: desenfoque leve antes de trazar -> linea mas limpia (menos
  // "grumos"/vibracion). La forma ya viene cerrada; el detalle se suaviza solo.
  const smooth = opts.thresholds?.smooth ?? 1.5;
  if (smooth > 0) {
    [forma, detalle] = await Promise.all([
      sharp(forma).blur(smooth).png().toBuffer(),
      sharp(detalle).blur(smooth).png().toBuffer(),
    ]);
  }

  const [formaD, detalleD] = await Promise.all([
    tracePath(forma, POTRACE.forma),
    tracePath(detalle, POTRACE.detalle),
  ]);

  const svg = buildSvg(formaD, detalleD, width);
  const previewPng = await sharp(Buffer.from(svg)).png().toBuffer();

  // `original` = imagen lista para navegador (JPEG), ya convertida si era HEIC.
  return { svg, previewPng, original: normalized, cropped, masks: { forma, detalle } };
}
