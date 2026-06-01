# 👿 Cada cual con sus diablos

App web del proyecto de arte: digitalizar 100 post-its de diablos → vectorizar →
votar ("Tinder de diablos") → exportar ranking.

Visión y alcance completos en [`CLAUDE.md`](CLAUDE.md). Plan técnico en
`~/.claude/plans/parallel-wiggling-muffin.md`.

## Estructura

```
backend/   Node.js + Express — API + pipeline de vectorización (sharp + potrace)
  src/pipeline/   foto post-it → SVG 2 capas (forma roja + detalles negros), color fijo
  spike/          Fase 0: validar la vectorización con fotos reales (ver spike/README.md)
frontend/  React + Vite — modo Dev (Pako) + modo Público (amigos votan)  [pendiente]
```

## Estado

- ✅ **Fase 0** — pipeline de vectorización funcionando. Falta validarlo con
  **fotos reales del jig** (cristal + aro de luz). Ver [`backend/spike/README.md`](backend/spike/README.md).
- ⏳ Fase 1 — Supabase (DB + Storage + Auth) + API REST.
- ⏳ Fase 2 — integrar pipeline en el backend.
- ⏳ Fase 3 — modo Dev (frontend).
- ⏳ Fase 4 — modo Público (votación).
- ⏳ Fase 5 — deploy.

## Arranque rápido

```bash
cd backend && npm install
npm run spike        # tras poner fotos en spike/input/
```

## Decisiones clave

- **Vectorización** en backend (sharp + potrace). Color **fijo** idéntico para los 100
  (rojo `#C0392B`, negro `#1A1A1A`).
- **Supabase** free (DB + Storage + Auth).
- **Voto**: botones 👿/💀; identidad por `localStorage`; resultados **solo** en modo Dev.
- **Ranking**: Wilson score (pares/Elo como mejora futura sobre los finalistas).
