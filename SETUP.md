# Puesta en marcha

Pasos para dejar la app funcionando en local. Lo único manual es crear el
proyecto Supabase (gratis) y pegar las credenciales.

## 1. Crear proyecto Supabase

1. Entra en https://supabase.com → New project (plan free).
2. **SQL**: abre el SQL Editor y pega/ejecuta [`backend/sql/001_init.sql`](backend/sql/001_init.sql) (crea las tablas).
3. **Storage**: Storage → New bucket → nombre `diablos`, **Public: ON**.
4. **Auth (tu usuario)**: Authentication → Users → Add user → tu email + contraseña.
   (Opcional: Authentication → Providers → Email → desactivar "Confirm email" para entrar directo.)
5. **Credenciales**: Project Settings → API. Apunta:
   - `Project URL`
   - `service_role` key (secreta → backend)
   - `anon` key (pública → frontend)

## 2. Backend

```bash
cd backend
cp .env.example .env
# rellena SUPABASE_URL y SUPABASE_SERVICE_KEY (service_role)
npm install
npm run dev        # API en http://localhost:3001
```

## 3. Frontend

```bash
cd frontend
cp .env.example .env
# rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (anon)
npm install
npm run dev        # web en http://localhost:5173
```

## 4. Probar el flujo completo

1. **Vectorización (Fase 0)**: antes de nada, valida con fotos reales del jig →
   ver [`backend/spike/README.md`](backend/spike/README.md). Ajusta umbrales si hace falta.
2. **Dev**: abre http://localhost:5173/dev → login → "📷 Foto" → ajusta sliders →
   "Guardar". Repite para varios diablos.
3. **Abrir votación**: en el Panel, "Abrir votación (activar pendientes)".
4. **Público**: abre http://localhost:5173/ → vota con 👿/💀. Recarga → solo
   aparecen los no votados. Al acabar → "¡Has votado todos los diablos!".
5. **Resultados**: vuelve a /dev/panel → ranking Wilson + gráfica (top 9 en rojo).

## 5. Deploy (cuando toque)

- **Frontend** → Vercel (apunta a `frontend/`, variables `VITE_*`).
- **Backend** → Railway o Fly.io (variables del `.env` del backend).
- **Supabase** ya es remoto.
- **Dominio**: configurarlo en Vercel. (Nota emoji: `.com` no admite; sí `.ws/.to`
  vía Punycode, pero se ve feo en Chrome/Firefox.)

> ⚠️ El proyecto free de Supabase se **pausa tras 1 semana sin actividad** y **no
> tiene backups automáticos** → tras digitalizar los 100, exporta la tabla a mano.
