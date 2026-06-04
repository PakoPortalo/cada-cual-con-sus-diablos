#!/usr/bin/env bash
# Redespliegue: trae cambios, reinstala, reconstruye el front y reinicia el back.
# Uso (en el servidor): bash /opt/diablos/deploy/update.sh
set -euo pipefail

cd /opt/diablos
git pull

# Backend
cd backend
npm ci --omit=dev
sudo systemctl restart diablos-api

# Frontend
cd ../frontend
npm ci
npm run build

echo "✓ Actualizado. Front reconstruido y backend reiniciado."
