import sharp from "sharp";
// diablo con TRAZO negro bordeando la cara (anillo), interior rojo
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <rect width="600" height="600" fill="#F4D03F"/>
  <circle cx="300" cy="320" r="170" fill="#111111"/>   <!-- borde negro -->
  <circle cx="300" cy="320" r="150" fill="#C0392B"/>   <!-- relleno rojo dentro -->
  <circle cx="250" cy="300" r="18" fill="#111111"/>    <!-- ojo -->
  <circle cx="350" cy="300" r="18" fill="#111111"/>    <!-- ojo -->
</svg>`;
await sharp(Buffer.from(svg)).jpeg().toFile("spike/input/outline-diablo.jpg");
console.log("outline-diablo.jpg creado");
