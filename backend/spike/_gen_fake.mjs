import sharp from "sharp";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <rect width="600" height="600" fill="#F4D03F"/>
  <polygon points="180,180 220,90 250,180" fill="#C0392B"/>
  <polygon points="420,180 380,90 350,180" fill="#C0392B"/>
  <circle cx="300" cy="320" r="160" fill="#C0392B"/>
  <circle cx="245" cy="290" r="22" fill="#111111"/>
  <circle cx="355" cy="290" r="22" fill="#111111"/>
  <path d="M230 380 Q300 440 370 380" stroke="#111111" stroke-width="16" fill="none"/>
</svg>`;
await sharp(Buffer.from(svg)).jpeg().toFile("spike/input/fake-diablo.jpg");
console.log("fake-diablo.jpg creado");
