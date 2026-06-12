# Firebase Analytics & Observabilidad — GamePoly

## Qué está implementado

| Capa | Tecnología | Estado |
|---|---|---|
| Analytics web | Firebase Analytics (Web SDK) | ✅ implementado |
| Error reporting web | Backend propio → PostgreSQL | ✅ implementado |
| Crashlytics mobile | Firebase Crashlytics (Android/iOS) | 📋 documentado para app nativa futura |

---

## Firebase Analytics — Configuración

### 1. Crear proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com).
2. **Add project** → nombre `gamepoly-prod`.
3. Activa **Google Analytics** al crear el proyecto.
4. Ve a **Project settings → Your apps → Add app → Web**.
5. Registra la app con nombre `GamePoly Web`.
6. Copia el objeto `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "....firebaseapp.com",
  projectId: "...",
  storageBucket: "....appspot.com",
  messagingSenderId: "...",
  appId: "1:...",
  measurementId: "G-..."
};
```

### 2. Variables de entorno (en el servidor de build)

```bash
# En /etc/systemd/system/gamepoly.service.d/firebase.conf
# (o en el entorno del proceso de build: npm run generate)
NUXT_PUBLIC_FIREBASE_ENABLED=true
NUXT_PUBLIC_FIREBASE_API_KEY=AIza...
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gamepoly-prod.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=gamepoly-prod
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gamepoly-prod.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NUXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NUXT_PUBLIC_ANALYTICS_ENVIRONMENT=production
VITE_APP_RELEASE_VERSION=2026.06.12
```

**Importante:** estas variables se leen en build time (`npm run generate`). Deben estar disponibles en el servidor cuando se ejecuta el build.

### 3. Verificar en Firebase DebugView

```bash
# En el navegador (DevTools Console) agrega el parámetro:
# ?debug_mode=1  en la URL de la app

# O en Chrome DevTools:
# Application → Storage → Cookies → añadir cookie: _ga_debug=1
```

Luego ve a Firebase Console → Analytics → DebugView para ver eventos en tiempo real.

---

## Eventos instrumentados

| Evento | Dónde se emite |
|---|---|
| `lobby_opened` | `pages/multiplayer/lobby.vue` — al montar |
| `table_created` | `pages/multiplayer/lobby.vue` — tras crear mesa |
| `table_joined` | `pages/multiplayer/lobby.vue` — tras unirse |
| `multiplayer_game_started` | `pages/multiplayer/game.vue` — al montar |
| `dice_rolled` | `pages/multiplayer/game.vue` — socket `dice_rolled` |
| `property_bought` | `pages/multiplayer/game.vue` — al confirmar compra |
| `auction_started` | `pages/multiplayer/game.vue` — socket `auction_started` |
| `trade_proposed` | `pages/multiplayer/game.vue` — al enviar propuesta |
| `trade_accepted` | `pages/multiplayer/game.vue` — al aceptar intercambio |
| `bankruptcy_triggered` | `pages/multiplayer/game.vue` — watch `isMyDebtPending` |
| `game_finished` | `pages/multiplayer/game.vue` — watch `mpStore.winner` |
| `websocket_connected` | `composables/useGameSocket.ts` |
| `websocket_disconnected` | `composables/useGameSocket.ts` |
| `websocket_error` | `composables/useGameSocket.ts` |
| `client_exception` | `composables/useClientErrors.ts` — captura automática |

### Privacidad

- **No se envían** nombres, tokens, JWTs, IPs, emails ni stacks a Analytics.
- Los eventos de `client_exception` solo contienen `source`, `severity` y `error_name` (sin stack).
- Los stacks y mensajes completos van al backend propio, no a Firebase.

---

## Error Reporting Web — Backend propio

### Cómo funciona

1. El plugin `plugins/firebase.client.ts` captura errores de Vue, `window.onerror` y `unhandledrejection`.
2. `composables/useClientErrors.ts` envía el error a `POST /api/v1/client-errors`.
3. El backend valida, trunca y guarda en la tabla `client_error_events` de PostgreSQL.

### Verificar errores guardados

```bash
ssh Tarragona_server "psql 'postgres://gamepoly:Gp2026xTarragonaDb9@127.0.0.1:5432/gamepoly?sslmode=disable'"
```

```sql
-- Ver últimos 5 errores
SELECT id, occurred_at, source, severity, message, route
FROM client_error_events
ORDER BY occurred_at DESC
LIMIT 5;

-- Ver errores de Vue
SELECT occurred_at, message, error_name, route
FROM client_error_events
WHERE source = 'vue'
ORDER BY occurred_at DESC
LIMIT 10;

-- Contar por fuente
SELECT source, COUNT(*) FROM client_error_events GROUP BY source;
```

### Probar manualmente el endpoint

```bash
curl -X POST https://api.tudominio.com/api/v1/client-errors \
  -H "Content-Type: application/json" \
  -d '{
    "occurredAt": "2026-06-12T20:00:00Z",
    "environment": "production",
    "releaseVersion": "web-2026.06.12",
    "source": "manual",
    "severity": "error",
    "message": "Test error desde curl",
    "errorName": "TestError",
    "route": "/multiplayer/game",
    "eventName": "client_exception",
    "context": { "component": "test" }
  }'
# Debe responder 204 No Content
```

---

## Firebase Crashlytics — Solo para app nativa

Firebase Crashlytics **no tiene SDK web oficial** para aplicaciones Nuxt/web puras. Está orientado a:

| Plataforma | Archivos requeridos |
|---|---|
| Android | `google-services.json`, `applicationId`, plugin Gradle |
| iOS | `GoogleService-Info.plist`, Bundle ID, Xcode config, dSYM upload |
| Flutter | `firebase_core`, `firebase_crashlytics`, FlutterFire CLI |
| React Native | `@react-native-firebase/app`, `@react-native-firebase/crashlytics` |

### Si en el futuro se crea una app Android (Capacitor)

1. En Firebase Console → Add app → Android.
2. Ingresa el `applicationId` (ej: `com.gamepoly.app`).
3. Descarga `google-services.json` y colócalo en `android/app/`.
4. En `android/build.gradle`:
   ```gradle
   classpath 'com.google.gms:google-services:4.4.0'
   classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
   ```
5. En `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   apply plugin: 'com.google.firebase.crashlytics'
   ```
6. Instalar: `npm install @capacitor-firebase/crashlytics`

---

## Seguridad y privacidad

- Los valores `NUXT_PUBLIC_*` son **visibles en el cliente** (son public por diseño en Firebase Web).
- Nunca colocar secretos de servidor en variables `NUXT_PUBLIC_*`.
- El rate limit del endpoint de errores es 30 req/min por IP.
- El payload máximo aceptado es 32 KB.
- Los campos `context` con claves `token`, `jwt`, `password`, `secret`, `auth`, `session` son eliminados antes de guardar.
