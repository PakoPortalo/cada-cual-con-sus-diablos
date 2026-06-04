import "dotenv/config";
import express from "express";
import cors from "cors";
import { diablosRouter } from "./routes/diablos.js";
import { votosRouter } from "./routes/votos.js";
import { votantesRouter } from "./routes/votantes.js";
import { adminRouter } from "./routes/admin.js";
import { getVotacion } from "./lib/votacion.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Estado público de la votación (abierta/cerrada) para el modo Público.
app.get("/votacion", async (_req, res) => res.json(await getVotacion()));

// Publico
app.use("/votante", votantesRouter); // registro nombre/anonimo
app.use("/diablos", diablosRouter); // GET /diablos?votante=...
app.use("/diablos", votosRouter); // POST /diablos/:id/voto
// Dev (protegido)
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
