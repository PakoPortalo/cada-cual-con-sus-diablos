import sharp from "sharp";
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
  const cropped = await detectBorder(inputBuffer, opts);
  const { forma, detalle, width } = await separateColors(cropped, opts.thresholds);

  const [formaD, detalleD] = await Promise.all([
    tracePath(forma, POTRACE.forma),
    tracePath(detalle, POTRACE.detalle),
  ]);

  const svg = buildSvg(formaD, detalleD, width);
  const previewPng = await sharp(Buffer.from(svg)).png().toBuffer();

  return { svg, previewPng, cropped, masks: { forma, detalle } };
}
