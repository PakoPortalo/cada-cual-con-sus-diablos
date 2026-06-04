import sharp from "sharp";

// Cierre morfológico (dilatar + erosionar) sobre una máscara PNG con
// tinta=0 (negro) y fondo=255 (blanco). Rellena concavidades y huecos más
// pequeños que ~radius y redondea el contorno, SIN perder los salientes
// (cuernos): la dilatación rellena los entrantes y la erosión devuelve el
// tamaño. Aproximación con desenfoque + umbral (rápida y suficiente).
//   radius ↑ => rellena dientes/entrantes más grandes y redondea más.
export async function closeMask(png, radius) {
  if (!radius || radius <= 0) return png;
  const sigma = Math.max(0.3, radius);

  // threshold(t): valor < t -> 0 (tinta), >= t -> 255 (fondo). Con tinta=0 da
  // directamente la máscara, sin invertir.
  // Dilatar: umbral alto -> más píxeles grisáceos (cerca de la tinta) -> tinta.
  const dilatada = await sharp(png).blur(sigma).threshold(210).png().toBuffer();
  // Erosionar: umbral bajo -> solo el núcleo sólido queda como tinta.
  const cerrada = await sharp(dilatada).blur(sigma).threshold(45).png().toBuffer();

  return cerrada;
}
