import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// HTTPS (cert autofirmado) para que la cámara dentro de la web (getUserMedia)
// funcione también desde el móvil por la IP de la red local. El frontend habla
// con el backend a través del proxy /api → evita "mixed content" (página HTTPS
// llamando a un backend HTTP).
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // expone en la red local (acceso desde el móvil)
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
