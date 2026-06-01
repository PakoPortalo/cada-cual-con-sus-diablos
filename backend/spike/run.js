// Spike de vectorizacion — Fase 0 (go/no-go del proyecto).
//
// Uso:
//   node spike/run.js <foto.jpg> [...mas fotos]
//   node spike/run.js spike/input          (procesa todas las imagenes de la carpeta)
//
// Por cada foto genera en spike/output/<nombre>/:
//   - 1-cropped.png     foto recortada (lo que ve el pipeline)
//   - 2-mask-forma.png  mascara de la silueta (lo que vectoriza la capa roja)
//   - 3-mask-detalle.png mascara de detalles (capa negra)
//   - 4-resultado.svg   SVG final de 2 capas con color fijo
//   - 5-preview.png     render del SVG para comparar a ojo con la foto
//
// Revision visual: abrir 1-cropped.png junto a 5-preview.png. Si se parecen en
// >=80% de las muestras, Fase 0 pasa. Si no, ajustar THRESHOLDS en
// src/pipeline/config.js (o el recorte en detectBorder.js) y repetir.

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { vectorizePostit } from "../src/pipeline/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "output");
const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

async function collectImages(args) {
  const files = [];
  for (const arg of args) {
    const s = await stat(arg).catch(() => null);
    if (s?.isDirectory()) {
      for (const f of await readdir(arg)) {
        if (IMG_EXT.has(extname(f).toLowerCase())) files.push(join(arg, f));
      }
    } else if (s?.isFile()) {
      files.push(arg);
    } else {
      console.warn(`! no existe: ${arg}`);
    }
  }
  return files;
}

async function processOne(file) {
  const name = basename(file, extname(file));
  const dir = join(OUT_DIR, name);
  await mkdir(dir, { recursive: true });

  const input = await readFile(file);
  const { svg, previewPng, cropped, masks } = await vectorizePostit(input);

  await Promise.all([
    writeFile(join(dir, "1-cropped.png"), cropped),
    writeFile(join(dir, "2-mask-forma.png"), masks.forma),
    writeFile(join(dir, "3-mask-detalle.png"), masks.detalle),
    writeFile(join(dir, "4-resultado.svg"), svg),
    writeFile(join(dir, "5-preview.png"), previewPng),
  ]);

  const kb = (svg.length / 1024).toFixed(1);
  console.log(`✓ ${name}  ->  ${dir}  (SVG ${kb} KB)`);
}

const args = process.argv.slice(2);
const files = await collectImages(
  args.length ? args : [join(__dirname, "input")]
);

if (files.length === 0) {
  console.log(
    "No hay imagenes. Pon fotos en spike/input/ o pasa rutas:\n  node spike/run.js foto.jpg"
  );
  process.exit(0);
}

console.log(`Procesando ${files.length} foto(s)...\n`);
let ok = 0;
for (const f of files) {
  try {
    await processOne(f);
    ok++;
  } catch (e) {
    console.error(`✗ ${basename(f)}: ${e.message}`);
  }
}
console.log(`\nHecho: ${ok}/${files.length}. Revisa spike/output/ a ojo.`);
