import sharp from "sharp";

// Recorte del area del post-it.
//
// Con el JIG (encuadre fijo mediante cuadro guia en la camara) el post-it cae
// siempre aprox. en el mismo sitio, asi que para v1 hacemos un recorte cuadrado
// centrado y normalizamos a un tamano de trabajo. Si en el spike vemos que el
// encuadre no es tan constante, aqui es donde entraria deteccion real de bordes
// (4 vertices + homografia) o el fallback de recorte manual de 4 puntos.
//
// opts.crop = { left, top, width, height } fuerza un recorte manual (fallback).
export async function detectBorder(inputBuffer, opts = {}) {
  const work = 1000; // lado de trabajo en px
  const img = sharp(inputBuffer).rotate(); // respeta orientacion EXIF
  const meta = await img.metadata();

  let region;
  if (opts.crop) {
    region = opts.crop;
  } else {
    // cuadrado centrado del lado menor
    const side = Math.min(meta.width, meta.height);
    region = {
      left: Math.floor((meta.width - side) / 2),
      top: Math.floor((meta.height - side) / 2),
      width: side,
      height: side,
    };
  }

  return sharp(inputBuffer)
    .rotate()
    .extract(region)
    .resize(work, work, { fit: "fill" })
    .toBuffer();
}
