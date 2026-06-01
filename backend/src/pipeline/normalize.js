import heicConvert from "heic-convert";

// Los iPhone disparan en HEIC y sharp (sin plugin HEIF por licencias) no lo
// decodifica. Detectamos HEIC por la firma del contenedor (caja "ftyp" con
// marcas heic/heix/mif1/hevc...) y lo convertimos a JPEG antes del pipeline.
function isHeic(buffer) {
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12);
  return ["heic", "heix", "heif", "mif1", "msf1", "hevc", "hevx"].includes(brand);
}

// Devuelve un buffer que sharp sí sabe leer (convierte solo si hace falta).
export async function normalizeImage(buffer) {
  if (!isHeic(buffer)) return buffer;
  const out = await heicConvert({ buffer, format: "JPEG", quality: 0.95 });
  return Buffer.from(out);
}
