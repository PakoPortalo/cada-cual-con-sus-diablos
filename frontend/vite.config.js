import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // host: true expone el dev server en la red local (para acceder desde el móvil)
  server: { host: true, port: 5173 },
});
