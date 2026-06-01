// Parametros del pipeline de vectorizacion.
// Pensados para fotos tomadas con el JIG (post-it bajo cristal + aro de luz +
// encuadre fijo). Con luz uniforme estos umbrales deberian ser estables; si el
// spike muestra que no, se ajustan aqui en un solo sitio.

export const COLORS = {
  // Color fijo identico para TODOS los diablos (decision de proyecto):
  // el SVG solo guarda la forma, el color se impone aqui.
  forma: "#C0392B", // rojo
  detalle: "#1A1A1A", // negro
};

export const THRESHOLDS = {
  // Un pixel es NEGRO (detalle) si su canal mas brillante esta por debajo de esto.
  blackMax: 85,
  // Un pixel es ROJO (forma) si el rojo domina con este margen sobre verde y azul...
  redMinR: 110,
  redDelta: 40,
};

// Lado del SVG de salida en unidades de usuario (post-it ~74mm). Coordenadas 1:1.
export const SVG_SIZE = 74;

// Opciones de potrace por capa. turdSize elimina motas de ruido (puntos sueltos).
export const POTRACE = {
  forma: { turdSize: 30, optTolerance: 0.4 },
  detalle: { turdSize: 15, optTolerance: 0.3 },
};
