# SPEC-001 — Despliegue servidor Tarragona (gamepoly.chamvea.dev)

**Estado:** ✅ done  
**Servidor:** Tarragona_server (`65.109.171.106`)  
**Dominio:** `gamepoly.chamvea.dev` (Certbot SSL)  
**OS:** Debian 10 (buster)  
**Última actualización:** 2026-06-12

---

## Datos del servidor

| Campo | Valor |
|---|---|
| Host SSH | `Tarragona_server` (en `~/.ssh/config`) |
| IP | `65.109.171.106` |
| Usuario | `root` |
| Clave SSH | `~/.ssh/id_ed25519` |
| OS | Debian GNU/Linux 10 (buster) |
| Go | 1.21.13 (`/usr/local/go/bin/go`) |
| Node | 20.20.2 (nvm) |
| Redis | 7+ (`127.0.0.1:6379`, sin contraseña) |
| Nginx | 1.14.2 |
| Backend binario | `/usr/local/bin/gamepoly-server` |
| Frontend estático | `/var/www/gamepoly/dist/` |
| Repo en servidor | `/home/gamepoly/` |

---

## Variables de entorno

Archivo: `/etc/gamepoly.env`

```env
PORT=8080
REDIS_ADDR=127.0.0.1:6379
REDIS_PASSWORD=
JWT_SECRET=gamepoly-dev-secret-change-in-prod-2024
ENVIRONMENT=production
```

> ⚠️ Cambiar `JWT_SECRET` por un secret largo generado con `openssl rand -hex 32`.

---

## Comandos de despliegue

### Backend + Frontend (completo)

```bash
ssh Tarragona_server "cd /home/gamepoly && git pull && cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /usr/local/bin/gamepoly-server ./cmd/server && systemctl restart gamepoly && cd /home/gamepoly && source ~/.nvm/nvm.sh && nvm use 20 && npm run generate 2>&1 | tail -5 && rsync -a --delete .output/public/ /var/www/gamepoly/dist/ && echo 'ALL DEPLOYED'"
```

### Solo backend

```bash
ssh Tarragona_server "cd /home/gamepoly && git pull && cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /usr/local/bin/gamepoly-server ./cmd/server && systemctl restart gamepoly && echo 'BACKEND DEPLOYED'"
```

### Solo frontend

```bash
ssh Tarragona_server "cd /home/gamepoly && git pull && source ~/.nvm/nvm.sh && nvm use 20 && npm run generate 2>&1 | tail -5 && rsync -a --delete .output/public/ /var/www/gamepoly/dist/ && echo 'FRONTEND DEPLOYED'"
```

### Verificar estado

```bash
# Backend
ssh Tarragona_server "systemctl status gamepoly --no-pager | head -10"

# Health check
curl -s https://gamepoly.chamvea.dev/health

# Logs en tiempo real
ssh Tarragona_server "journalctl -u gamepoly -f"

# Logs del bot
ssh Tarragona_server "journalctl -u gamepoly -f | grep '\\[bot\\]'"
```

### Reiniciar servicios

```bash
# Backend
ssh Tarragona_server "systemctl restart gamepoly"

# Nginx
ssh Tarragona_server "systemctl reload nginx"

# Redis
ssh Tarragona_server "systemctl restart redis"
```

---

## Nginx

Archivo: `/etc/nginx/sites-available/gamepoly`  
Habilitado en: `/etc/nginx/sites-enabled/gamepoly`  
SSL: Let's Encrypt (`gamepoly.chamvea.dev`), renew automático vía certbot cron.

```nginx
server {
    listen 80;
    server_name gamepoly.chamvea.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name gamepoly.chamvea.dev;

    root /var/www/gamepoly/dist;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/gamepoly.chamvea.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gamepoly.chamvea.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

### Renovar SSL manualmente

```bash
ssh Tarragona_server "certbot renew --nginx"
```

---

## Systemd

Archivo: `/etc/systemd/system/gamepoly.service`

```ini
[Unit]
Description=GamePoly Backend
After=network.target redis.service

[Service]
Type=simple
User=root
EnvironmentFile=/etc/gamepoly.env
ExecStart=/usr/local/bin/gamepoly-server
Restart=on-failure
RestartSec=5s
WorkingDirectory=/home/gamepoly/backend

LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

---

## Frontend — URLs de conexión

Archivo: `.env.development` y `.env.production` (en la raíz del repo)

```env
VITE_API_URL=https://gamepoly.chamvea.dev
VITE_WS_URL=wss://gamepoly.chamvea.dev
```

El composable `utils/env.ts` usa estas variables:

```ts
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || window.location.origin
}

export function getWsBaseUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}
```

---

## Debugging en el navegador

Activar logs de WebSocket en la consola:

```js
localStorage.mpDebug = '1'
```

Recargar la página. Se verán todos los mensajes `↓ recv` y `↑ send` con tipo y payload.

Para desactivar:

```js
localStorage.mpDebug = '0'
```

---

## Estructura del backend en el servidor

```
/home/gamepoly/                  ← Repo git (main branch)
/home/gamepoly/backend/          ← Go backend
/home/gamepoly/backend/cmd/server/ ← Entry point (main.go)
/usr/local/bin/gamepoly-server   ← Binario compilado
/var/www/gamepoly/dist/          ← Frontend estático (Nuxt generate)
/etc/gamepoly.env                ← Variables de entorno
/etc/nginx/sites-available/gamepoly ← Nginx config
/etc/systemd/system/gamepoly.service ← Systemd service
```

---

## WebSocket — Eventos principales

| Evento | Dirección | Descripción |
|---|---|---|
| `game_snapshot` | ↓ server→client | Estado completo del juego |
| `dice_rolled` | ↓ | Resultado de tirar dados |
| `player_moved` | ↓ | Animación de movimiento (con `path`) |
| `bot_thinking` | ↓ | Bot está "pensando" + delay |
| `bot_action` | ↓ | Acción que ejecuta el bot |
| `property_purchased` | ↓ | Propiedad comprada |
| `house_built` | ↓ | Casa construida |
| `hotel_built` | ↓ | Hotel construido |
| `property_mortgaged` | ↓ | Propiedad hipotecada |
| `auction_started` | ↓ | Subasta iniciada |
| `bid_placed` | ↓ | Puja realizada |
| `auction_ended` | ↓ | Subasta terminada |
| `card_drawn` | ↓ | Carta robada |
| `rent_collected` | ↓ | Alquiler cobrado |
| `tax_paid` | ↓ | Impuesto pagado |
| `player_jailed` | ↓ | Jugador enviado a la cárcel |
| `player_connected` | ↓ | Jugador conectado |
| `player_disconnected` | ↓ | Jugador desconectado |
| `game_over` | ↓ | Partida terminada |
| `roll_dice` | ↑ client→server | Tirar dados |
| `buy_property` | ↑ | Comprar propiedad |
| `pass_buy` | ↑ | Pasar compra |
| `next_turn` | ↑ | Siguiente turno |
| `pay_bail` | ↑ | Pagar fianza |
| `place_bid` | ↑ | Pujar en subasta |
| `pass_bid` | ↑ | Pasar en subasta |
| `build_house` | ↑ | Construir casa |
| `build_hotel` | ↑ | Construir hotel |
| `mortgage` | ↑ | Hipotecar |
| `heartbeat` | ↑ | Keepalive |

---

## Notas operativas

- **Mono-goroutine**: Cada mesa corre en una goroutine dedicada en el backend. No hay race conditions entre acciones de la misma mesa.
- **Redis**: Usado para estado de mesas activas y sesiones. Sin contraseña en dev, configurar en prod.
- **SSL**: Certificado Let's Encrypt renueva automáticamente. Expira el 2026-09-10.
- **Node en servidor**: Se usa nvm con Node 20 para build del frontend. El v14 del sistema no sirve para Nuxt 3.
- **Logs del bot**: Filtrar con `journalctl -u gamepoly -f | grep '\[bot\]'` para ver decisiones del bot.