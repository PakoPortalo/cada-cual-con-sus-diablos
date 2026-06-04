import { COLORS, SVG_SIZE } from "./config.js";

// Ensambla el SVG final de dos capas con los colores FIJOS del proyecto.
// `formaD` y `detalleD` son los atributos `d` devueltos por potrace, en el
// espacio de pixeles de la mascara (srcSize x srcSize). Se escalan al viewBox
// 0 0 SVG_SIZE SVG_SIZE mediante un transform, manteniendo proporcion 1:1.
export function buildSvg(formaD, detalleD, srcSize) {
  const s = (SVG_SIZE / srcSize).toFixed(6);
  // fill-rule="evenodd": potrace traza el contorno exterior y los huecos en el
  // mismo path; con evenodd los huecos quedan vacios (p.ej. un trazo negro que
  // bordea la cara se ve como anillo, no como disco solido).
  return `<svg viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}mm" height="${SVG_SIZE}mm" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(${s})" fill-rule="evenodd">
    <g id="forma" fill="${COLORS.forma}">
      <path d="${formaD}"/>
    </g>
    <g id="detalles" fill="${COLORS.detalle}">
      <path d="${detalleD}"/>
    </g>
  </g>
</svg>
`;
}
