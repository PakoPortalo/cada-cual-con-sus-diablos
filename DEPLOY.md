# 🚀 Despliegue de diablos.es (Hetzner CX23 + Caddy)

Un único servidor sirve **frontend** (estático) y **backend** (Node), con HTTPS
automático vía **Caddy**. Mismo dominio para todo → sin CORS.

```
Internet ──HTTPS──> Caddy ──/api/*──> Node (Express) :3001 ──> Supabase
                      └────────────── frontend (Vite build)
```

---

## 0. Lo que necesitas a mano
- IP del servidor (Hetzner CX23, Ubuntu 24.04).
- Acceso al DNS de **loading.es**.
- Los valores de `backend/.env` (SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET)
  y `frontend/.env` (VITE_API_URL=/api, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).

---

## 1. DNS (en loading.es)
Crea dos registros apuntando a la IP del servidor:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `@`   | IP_DEL_SERVIDOR | 300 |
| A | `www` | IP_DEL_SERVIDOR | 300 |

(Tarda de minutos a un par de horas en propagar.)

---

## 2. Preparar el servidor (una sola vez)
SSH como root:
```bash
ssh root@IP_DEL_SERVIDOR
```

Usuario sin privilegios para la app + dependencias:
```bash
adduser --disabled-password --gecos "" diablos
apt update && apt -y upgrade
apt -y install git ca-certificates curl

# Node 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt -y install nodejs

# Caddy (repo oficial)
apt -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy
```

---

## 3. Traer el código
```bash
mkdir -p /opt/diablos && chown diablos:diablos /opt/diablos
# como usuario diablos:
sudo -u diablos -H bash
cd /opt
git clone https://github.com/TU_USUARIO/cada-cual-con-sus-diablos.git diablos
cd diablos
```
> Si aún no está en GitHub, ver §7 (subir el repo) — o copia los archivos con `scp`.

---

## 4. Variables de entorno (secretas, NO van en git)
```bash
# backend
cp /opt/diablos/backend/.env.example /opt/diablos/backend/.env
nano /opt/diablos/backend/.env     # pega SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET, PORT=3001

# frontend
cp /opt/diablos/frontend/.env.example /opt/diablos/frontend/.env
nano /opt/diablos/frontend/.env    # VITE_API_URL=/api  + VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

---

## 5. Instalar y construir
```bash
cd /opt/diablos/backend  && npm ci --omit=dev
cd /opt/diablos/frontend && npm ci && npm run build   # genera frontend/dist
```

---

## 6. Servicios (como root)
```bash
# Backend como servicio
cp /opt/diablos/deploy/diablos-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now diablos-api
systemctl status diablos-api      # debe poner active (running)

# Caddy
cp /opt/diablos/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl restart caddy
```

Abre **https://diablos.es** 🎉 (Caddy saca el certificado solo en el primer acceso).

---

## 7. Subir el repo a GitHub (recomendado, para backup + updates)
En tu Mac, en la carpeta del proyecto:
```bash
git add -A
git commit -m "Despliegue: Caddy + systemd + guía"
gh repo create cada-cual-con-sus-diablos --private --source . --push   # con gh CLI
# o crea el repo en github.com y luego: git remote add origin URL && git push -u origin main
```
> `.gitignore` ya excluye los `.env` con las claves. No se suben.

---

## 8. Actualizar tras cambios
En tu Mac haces `git push`; en el servidor:
```bash
bash /opt/diablos/deploy/update.sh
```

---

## Comprobaciones rápidas
```bash
systemctl status diablos-api          # backend vivo
journalctl -u diablos-api -f          # logs del backend
curl -s localhost:3001/health         # {"ok":true}
curl -s localhost:3001/votacion       # {"abierta":true}
caddy validate --config /etc/caddy/Caddyfile
```
