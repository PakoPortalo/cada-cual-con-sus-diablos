import "dotenv/config";
import express from "express";
import cors from "cors";
import { diablosRouter } from "./routes/diablos.js";
import { votosRouter } from "./routes/votos.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Publico
app.use("/diablos", diablosRouter); // GET /diablos?votante=...
app.use("/diablos", votosRouter); // POST /diablos/:id/voto
// Dev (protegido)
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
