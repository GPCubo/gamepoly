# Despliegue del backend — GamePoly

Guía completa para subir el servidor Go a producción. Cubre tres escenarios en orden de complejidad: VPS propio, Railway/Fly.io, y Docker Compose.

---

## Requisitos

| Servicio | Versión mínima | Notas |
|---|---|---|
| Go | 1.21+ | Solo en el build step; el binario final no necesita Go instalado |
| Redis | 7+ | Para estado de partidas activas y sesiones |
| PostgreSQL | 16+ | Solo para Fase 2 (persistencia al finalizar partidas) |

---

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8080` | Puerto HTTP del servidor |
| `REDIS_ADDR` | `localhost:6379` | Dirección Redis |
| `REDIS_PASSWORD` | _(vacío)_ | Contraseña Redis (requerida en prod) |
| `JWT_SECRET` | `dev-secret-change-in-production` | **Cambiar siempre en producción** |
| `ENVIRONMENT` | _(no definido)_ | Poner `production` para deshabilitar CORS abierto |

---

## Opción 1 — VPS propio (Ubuntu 22.04 / Debian 12)

### 1a. Preparar el servidor

```bash
# Instalar dependencias del sistema
sudo apt update && sudo apt install -y git curl redis-server

# Instalar Go 1.21
curl -Lo /tmp/go.tar.gz https://go.dev/dl/go1.21.13.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf /tmp/go.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc

# Verificar
go version   # go version go1.21.x linux/amd64
redis-cli ping   # PONG
```

### 1b. Clonar y compilar

```bash
# En el servidor
git clone https://github.com/TU_USUARIO/gamepolyweb.git
cd gamepolyweb/backend

# Descargar dependencias y compilar binario estático
go mod download
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /usr/local/bin/gamepoly-server ./cmd/server
```

### 1c. Configurar variables de entorno

```bash
sudo nano /etc/gamepoly.env
```

```env
PORT=8080
REDIS_ADDR=127.0.0.1:6379
REDIS_PASSWORD=TU_PASSWORD_REDIS
JWT_SECRET=GENERA_UN_SECRET_LARGO_AQUI_64_CHARS
ENVIRONMENT=production
```

Generar un JWT secret seguro:
```bash
openssl rand -hex 32
```

### 1d. Configurar Redis con contraseña

```bash
sudo nano /etc/redis/redis.conf
# Descomentar y editar:
# requirepass TU_PASSWORD_REDIS
# bind 127.0.0.1 -::1   ← solo localhost
sudo systemctl restart redis
```

### 1e. Crear servicio systemd

```bash
sudo nano /etc/systemd/system/gamepoly.service
```

```ini
[Unit]
Description=GamePoly Backend
After=network.target redis.service

[Service]
Type=simple
User=www-data
EnvironmentFile=/etc/gamepoly.env
ExecStart=/usr/local/bin/gamepoly-server
Restart=on-failure
RestartSec=5s

# Limits
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable gamepoly
sudo systemctl start gamepoly
sudo systemctl status gamepoly   # debe mostrar "active (running)"
```

### 1f. Proxy inverso con Nginx + HTTPS (Certbot)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/gamepoly
```

```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket headers — imprescindible
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts permisivos para WebSocket
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gamepoly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# HTTPS automático
sudo certbot --nginx -d api.tudominio.com
```

### 1g. Actualizar el frontend

```env
# .env.production en el proyecto Nuxt
VITE_API_URL=https://api.tudominio.com
VITE_WS_URL=wss://api.tudominio.com
```

---

## Opción 2 — Railway (recomendado para MVP rápido)

Railway detecta Go automáticamente y provee Redis como addon con un click.

### 2a. Preparar el repositorio

Crea `backend/Procfile` (Railway lo usa como fallback):
```
web: ./gamepoly-server
```

Crea `backend/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "go build -o gamepoly-server ./cmd/server"
  },
  "deploy": {
    "startCommand": "./gamepoly-server",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 2b. Desplegar

```bash
# Instalar Railway CLI
npm install -g @railway/cli
railway login

# Desde backend/
cd backend
railway init        # crear nuevo proyecto
railway up          # despliega el código

# Añadir Redis
railway add         # seleccionar "Redis"

# Variables de entorno en Railway Dashboard > Variables:
# JWT_SECRET=<tu secret>
# REDIS_ADDR=${{Redis.REDIS_URL}}   ← Railway lo inyecta automáticamente
```

Railway expone automáticamente HTTPS y el dominio `*.railway.app`.  
WebSocket funciona sin configuración adicional.

---

## Opción 3 — Fly.io

Fly.io es ideal si quieres instancias en múltiples regiones (preparación para SPEC-004 Fase 3).

### 3a. Crear `backend/Dockerfile`

```dockerfile
# Stage 1: build
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Stage 2: imagen mínima
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### 3b. Desplegar

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh
fly auth login

# Desde backend/
cd backend
fly launch              # genera fly.toml automáticamente
fly secrets set JWT_SECRET=$(openssl rand -hex 32)

# Añadir Redis (Upstash — serverless Redis compatible)
fly ext upstash redis create
# Copia UPSTASH_REDIS_REST_URL y úsala como REDIS_ADDR

fly deploy
```

`fly.toml` generado (editar si es necesario):
```toml
app = "gamepoly-backend"
primary_region = "mad"   # Madrid — más cercano a tus usuarios

[http_service]
  internal_port = 8080
  force_https = true
  [http_service.concurrency]
    type = "connections"
    hard_limit = 1000

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

---

## Opción 4 — Docker Compose (servidor propio con todo incluido)

Ideal para tener backend + Redis + (futuro) PostgreSQL en un solo `docker-compose.yml`.

Crea `backend/Dockerfile` (mismo que en la Opción 3).

Crea `docker-compose.yml` en la raíz del repositorio:

```yaml
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      PORT: "8080"
      REDIS_ADDR: "redis:6379"
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ENVIRONMENT: production
    depends_on:
      redis:
        condition: service_healthy

volumes:
  redis_data:
```

Crea `.env` en la raíz (nunca commitear):
```env
REDIS_PASSWORD=elige_una_password_fuerte
JWT_SECRET=genera_con_openssl_rand_hex_32
```

```bash
# Levantar todo
docker compose up -d

# Ver logs
docker compose logs -f backend

# Actualizar después de un git pull
docker compose build backend && docker compose up -d backend
```

---

## CI/CD — GitHub Actions (deploy automático en push a main)

Crea `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [master]
    paths:
      - "backend/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build binary
        working-directory: backend
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o gamepoly-server ./cmd/server

      - name: Upload binary to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "backend/gamepoly-server"
          target: "/usr/local/bin/"
          strip_components: 1

      - name: Restart service
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: sudo systemctl restart gamepoly
```

Secrets necesarios en GitHub → Settings → Secrets:
- `VPS_HOST` — IP o dominio del servidor
- `VPS_USER` — usuario SSH (ej: `ubuntu`)
- `VPS_SSH_KEY` — clave privada SSH

---

## Verificación post-deploy

```bash
# Health check
curl https://api.tudominio.com/health
# → "ok"

# Crear mesa de prueba
curl -X POST https://api.tudominio.com/api/v1/tables \
  -H "Content-Type: application/json" \
  -d '{
    "creatorName": "Test",
    "config": { "startingCash": 1500, "goSalary": 200, "jailBailCost": 50, "doublesGiveExtraTurn": true },
    "slots": [
      { "type": "human", "name": "Test" },
      { "type": "bot", "difficulty": "regular", "name": "Bot 1" }
    ]
  }'
# → { "tableId": "T-xxxxxxxx", "playerId": "xxxxxxxx" }

# Conectar WebSocket (desde la consola del navegador)
# const ws = new WebSocket('wss://api.tudominio.com/ws?tableId=T-xxx&playerId=yyy')
# ws.onmessage = e => console.log(JSON.parse(e.data))
```

---

## Monitoreo básico

```bash
# Ver logs en tiempo real (systemd)
journalctl -u gamepoly -f

# Ver logs (Docker)
docker compose logs -f backend

# Conexiones WebSocket activas
ss -tnp | grep 8080 | wc -l

# Memoria Redis
redis-cli -a TU_PASSWORD info memory | grep used_memory_human
```

---

## Preparación para SPEC-004 Fase 3 (escalado horizontal)

Cuando se implemente Redis pub/sub multi-servidor:

1. Levantar 2+ instancias del backend detrás de un load balancer con **sticky sessions** (Nginx `ip_hash` o cookie-based).
2. Todas las instancias apuntan al **mismo Redis**.
3. Nginx config para sticky sessions:

```nginx
upstream gamepoly_backend {
    ip_hash;                          # sticky por IP del cliente
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
}
```

4. Una vez implementado el pub/sub en `table/broadcast.go`, se puede quitar `ip_hash` y usar round-robin normal.
