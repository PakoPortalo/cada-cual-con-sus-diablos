import pkg from "potrace";
const { Potrace } = pkg;

// Vectoriza una mascara 1-bit (PNG, tinta negra sobre blanco) con potrace y
// devuelve SOLO el atributo `d` del path resultante (sin color ni envoltura),
// para que buildSvg imponga los colores fijos y el viewBox.
export function tracePath(maskPng, potraceOpts = {}) {
  return new Promise((resolve, reject) => {
    const trace = new Potrace({ threshold: 128, ...potraceOpts });
    trace.loadImage(maskPng, (err) => {
      if (err) return reject(err);
      const tag = trace.getPathTag(); // <path d="..." .../>
      const m = tag.match(/\sd="([^"]*)"/);
      resolve(m ? m[1] : "");
    });
  });
}
