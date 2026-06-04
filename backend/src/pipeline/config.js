// Parametros del pipeline de vectorizacion.
// Pensados para fotos tomadas con el JIG (post-it bajo cristal + aro de luz +
// encuadre fijo). Con luz uniforme estos umbrales deberian ser estables; si el
// spike muestra que no, se ajustan aqui en un solo sitio.

export const COLORS = {
  // Color fijo identico para TODOS los diablos (decision de proyecto):
  // el SVG solo guarda la forma, el color se impone aqui.
  forma: "#CB3747", // rojo
  detalle: "#1A1A1A", // negro
};

// Umbrales en HSV (0–100 para brillo/saturacion, 0–360 para tono).
export const THRESHOLDS = {
  valueMax: 30, // NEGRO: brillo por debajo de esto (detalle/tinta negra)
  satMin: 35, // ROJO: saturacion minima para contar como color
  hueRange: 30, // ROJO: grados alrededor del rojo puro (0/360) que se aceptan
};

// Lado del SVG de salida en unidades de usuario (post-it ~74mm). Coordenadas 1:1.
export const SVG_SIZE = 74;

// Opciones de potrace por capa:
//   turdSize     elimina motas de ruido (puntos sueltos)
//   optTolerance suaviza/optimiza las curvas (mas alto = linea mas limpia)
//   alphaMax     redondeo de esquinas (mas alto = mas curvo, menos anguloso)
export const POTRACE = {
  forma: { turdSize: 40, optTolerance: 1.2, alphaMax: 1 },
  detalle: { turdSize: 20, optTolerance: 0.8, alphaMax: 1 },
};
