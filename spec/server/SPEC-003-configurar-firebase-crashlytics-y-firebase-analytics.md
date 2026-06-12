---
id: SPEC-003
title: Configurar Firebase Crashlytics y Firebase Analytics
created_at: 2026-06-12T13:41:29
status: done
---

# SPEC-003: Configurar Firebase Crashlytics y Firebase Analytics

## Description

Configurar Firebase Analytics para medir el comportamiento de usuarios en la aplicacion web Nuxt y documentar la configuracion necesaria para Firebase Crashlytics. La spec debe dejar claro que Firebase Analytics tiene SDK web oficial, mientras que Firebase Crashlytics, segun la documentacion oficial de Firebase, esta orientado a Apple, Android, Flutter y Unity, no a aplicaciones web Nuxt puras.

Para el proyecto actual se debe implementar Analytics en frontend web y el reporte de errores web debe guardarse en PostgreSQL a traves del backend. Crashlytics debe quedar documentado como una integracion futura para una app nativa o empaquetada, por ejemplo Android/iOS con Capacitor, Flutter o React Native, si el producto evoluciona a mobile.

Referencias oficiales:

- Firebase Crashlytics docs: `https://firebase.google.com/docs/crashlytics`
- Firebase Analytics Web docs: `https://firebase.google.com/docs/analytics/web/get-started`
- Firebase Analytics general docs: `https://firebase.google.com/docs/analytics/get-started`

## Context and Motivation

El juego necesita observabilidad real para entender errores, caidas, embudos de entrada y eventos importantes de gameplay. En multiplayer, esto ayuda a detectar problemas de conexion, desconexiones, pantallas de lobby incompletas, errores de websocket, abandono de mesas, subastas, bancarrota, tarjetas y finalizacion de partida.

Actualmente no se encontro integracion de Firebase, Analytics, Crashlytics, gtag, Sentry u otra capa de observabilidad en el repo. `nuxt.config.ts` ya usa `runtimeConfig.public`, y `utils/env.ts` ya centraliza algunas variables del cliente, por lo que la implementacion debe seguir ese patron. Para errores web, el backend debe exponer un endpoint seguro que reciba eventos sanitizados del cliente y los guarde en una tabla PostgreSQL.

## Technical Analysis

Firebase Analytics para web requiere crear un proyecto Firebase, registrar una Web App y obtener el objeto `firebaseConfig`. Para Analytics web es especialmente importante tener `measurementId`, aunque la documentacion indica que versiones modernas del SDK pueden buscarlo dinamicamente al inicializar Analytics. Para mantener despliegues reproducibles, se debe configurar explicitamente por variables de entorno.

Datos necesarios de Firebase Web App:

```env
NUXT_PUBLIC_FIREBASE_ENABLED=true
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Datos opcionales/recomendados para frontend:

```env
NUXT_PUBLIC_ANALYTICS_DEBUG=false
NUXT_PUBLIC_ANALYTICS_SAMPLE_RATE=1
NUXT_PUBLIC_ANALYTICS_ENVIRONMENT=production
NUXT_PUBLIC_CLIENT_ERROR_REPORTING_ENABLED=true
NUXT_PUBLIC_CLIENT_ERROR_SAMPLE_RATE=1
NUXT_PUBLIC_APP_RELEASE_VERSION=
```

Variables de entorno backend necesarias para guardar errores web:

```env
ENABLE_CLIENT_ERROR_PERSISTENCE=true
CLIENT_ERROR_MAX_BODY_BYTES=32768
CLIENT_ERROR_MAX_STACK_CHARS=12000
CLIENT_ERROR_RATE_LIMIT_PER_MINUTE=30
```

Crashlytics para una app nativa o empaquetada necesita datos y archivos por plataforma:

- Android: `google-services.json`, `applicationId`, SHA-1/SHA-256 si se usan servicios relacionados, plugin Gradle de Google Services y plugin de Crashlytics.
- iOS: `GoogleService-Info.plist`, Bundle ID, configuracion de Xcode, dSYM upload para simbolicar crashes.
- Flutter: `firebase_core`, `firebase_crashlytics`, configuracion con FlutterFire CLI y plataformas nativas.
- React Native: `@react-native-firebase/app`, `@react-native-firebase/crashlytics` y configuracion nativa.

Para este repo Nuxt web, no se debe prometer Crashlytics web nativo. El flujo de errores web debe ser propio:

- Usar Google Analytics para metricas agregadas de error (`exception`, `websocket_error`, `game_error`).
- Crear un endpoint backend `POST /api/v1/client-errors` para guardar errores web en PostgreSQL.
- Guardar stack, mensaje, ruta, version de app y contexto seguro en una tabla `client_error_events`.

Tabla PostgreSQL sugerida para errores web:

```sql
CREATE TABLE client_error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  environment TEXT NOT NULL,
  release_version TEXT,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  error_name TEXT,
  stack TEXT,
  route TEXT,
  user_agent TEXT,
  table_id TEXT,
  player_id_hash TEXT,
  session_id_hash TEXT,
  event_name TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_error_events_occurred_at ON client_error_events (occurred_at DESC);
CREATE INDEX idx_client_error_events_environment ON client_error_events (environment);
CREATE INDEX idx_client_error_events_source ON client_error_events (source);
CREATE INDEX idx_client_error_events_table_id ON client_error_events (table_id);
```

Payload permitido para `POST /api/v1/client-errors`:

```json
{
  "occurredAt": "2026-06-12T13:41:29Z",
  "environment": "production",
  "releaseVersion": "web-2026.06.12",
  "source": "vue",
  "severity": "error",
  "message": "Cannot read properties of undefined",
  "errorName": "TypeError",
  "stack": "TypeError: ...",
  "route": "/multiplayer/game",
  "tableId": "T-12345678",
  "playerIdHash": "sha256:...",
  "sessionIdHash": "sha256:...",
  "eventName": "client_exception",
  "context": {
    "component": "pages/multiplayer/game.vue",
    "socketState": "connected"
  }
}
```

El backend debe limitar tamano de payload, truncar `message`/`stack` si exceden el maximo definido, validar `severity` y `source`, aplicar rate limit basico por IP o sesion, y nunca aceptar tokens/JWT ni datos personales en `context`.

Eventos sugeridos de Analytics:

- `page_view` para rutas principales.
- `lobby_opened`.
- `table_created`.
- `table_joined`.
- `multiplayer_game_started`.
- `dice_rolled`.
- `property_bought`.
- `auction_started`.
- `auction_bid`.
- `auction_won`.
- `card_drawn`.
- `player_jailed`.
- `bankruptcy_triggered`.
- `debt_resolution_started`.
- `trade_proposed`.
- `trade_accepted`.
- `game_finished`.
- `websocket_connected`.
- `websocket_disconnected`.
- `websocket_error`.
- `client_exception`.

Se debe cuidar privacidad: no enviar nombres reales, tokens, IDs de websocket completos, JWT, IPs, emails ni datos sensibles. Para jugadores se deben usar IDs anonimizados o hashes locales si hace falta correlacion.

## Implementation Plan

### Files to create

- `plugins/firebase.client.ts` - inicializa Firebase solo en cliente y solo si `NUXT_PUBLIC_FIREBASE_ENABLED=true`.
- `composables/useAnalytics.ts` - wrapper central para `logEvent`, `setUserProperties` y tracking seguro sin datos sensibles.
- `composables/useClientErrors.ts` - captura errores de Vue/window y los envia al backend para guardarlos en PostgreSQL; opcionalmente registra un evento agregado en Analytics.
- `backend/internal/store/client_errors.go` - repositorio PostgreSQL para insertar errores web sanitizados.
- `backend/internal/store/migrations/002_client_error_events.sql` - migracion de tabla e indices `client_error_events`.
- `docs/firebase-observability.md` - guia de configuracion Firebase, datos requeridos, comandos y pasos por entorno.

### Files to modify

- `package.json` - agregar dependencia `firebase`.
- `nuxt.config.ts` - exponer variables Firebase en `runtimeConfig.public` si se prefiere centralizarlas desde Nuxt.
- `.env.example` - documentar variables `NUXT_PUBLIC_FIREBASE_*`, flags de Analytics y flags de reporte de errores cliente.
- `pages/index.vue` - registrar eventos de entrada, seleccion de modo y creacion/inicio de flujo.
- `pages/multiplayer/lobby.vue` - registrar eventos de lobby, creacion de mesa, union y errores.
- `pages/multiplayer/game.vue` - registrar eventos de gameplay multiplayer, subastas, tarjetas, jail, intercambios, bancarrota y fin de partida.
- `composables/useGameSocket.ts` - registrar conexion, desconexion y errores de websocket.
- `backend/internal/api/router.go` - agregar `POST /api/v1/client-errors` con validacion y limite de tamano.
- `backend/cmd/server/main.go` - inicializar repositorio de errores cliente si Postgres esta habilitado.
- `backend/internal/store/postgres.go` - reutilizar la conexion PostgreSQL para insertar errores web.
- `backend/internal/store/migrations.go` - incluir la migracion nueva en el runner.
- `backend/DEPLOY.md` - agregar seccion de variables frontend Firebase, variables backend de errores cliente y aclaracion sobre Crashlytics web vs mobile.

### Ordered Steps

1. Crear proyecto Firebase en Firebase Console o usar uno existente.
2. Habilitar Google Analytics dentro del proyecto Firebase.
3. Registrar una Web App para el frontend Nuxt.
4. Copiar los datos de configuracion: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` y `measurementId`.
5. Agregar variables `NUXT_PUBLIC_FIREBASE_*` en `.env.development`, `.env.production` y en el entorno del servidor/build.
6. Instalar SDK web: `npm install firebase`.
7. Crear plugin cliente `plugins/firebase.client.ts` usando imports modulares: `initializeApp`, `getAnalytics`, `isSupported`.
8. Proteger la inicializacion para que no corra en SSR ni en navegadores donde Analytics no este soportado.
9. Crear `useAnalytics.ts` para no llamar Firebase directamente desde paginas/componentes.
10. Definir lista permitida de eventos y parametros para evitar enviar datos sensibles.
11. Instrumentar `pages/index.vue`, `pages/multiplayer/lobby.vue`, `pages/multiplayer/game.vue` y `composables/useGameSocket.ts`.
12. Crear migracion `client_error_events` en PostgreSQL.
13. Implementar `ClientErrorRepository` para guardar errores con insert parametrizado.
14. Agregar `POST /api/v1/client-errors` en el backend con limite de body, validacion, truncado de campos y respuesta `204`.
15. Agregar captura de errores web con `window.onerror`, `window.onunhandledrejection` y `vueApp.config.errorHandler`.
16. Enviar errores web al backend usando `getApiBaseUrl()` y respetando `NUXT_PUBLIC_CLIENT_ERROR_REPORTING_ENABLED`.
17. Enviar tambien un evento agregado Analytics `client_exception` sin stack ni datos sensibles.
18. Documentar que Firebase Crashlytics no aplica directamente al web actual y dejar pasos para Android/iOS si se crea app empaquetada.
19. Verificar en Firebase DebugView/Realtime que los eventos llegan.
20. Verificar con `psql` que los errores web quedan guardados en `client_error_events`.
21. Validar build de Nuxt y revisar que no se rompa SSR por referencias a `window`.

## Acceptance Criteria

- [x] Existe documentacion con todos los datos necesarios para configurar Firebase.
- [x] `.env.example` incluye variables `NUXT_PUBLIC_FIREBASE_*`.
- [x] `.env.example` incluye variables de reporte de errores cliente para frontend y backend.
- [x] Firebase Analytics se inicializa solo en cliente y solo cuando esta habilitado.
- [x] El build de Nuxt no falla por dependencias de navegador durante SSR.
- [x] Los eventos principales de index, lobby y multiplayer se registran mediante un composable central.
- [x] No se envian tokens, JWT, nombres sensibles, IPs ni payloads completos de websocket a Analytics.
- [x] Los errores web se capturan y se envian a `POST /api/v1/client-errors`.
- [x] Los errores web se guardan en PostgreSQL en la tabla `client_error_events`.
- [x] El backend valida, trunca y limita el payload de errores cliente.
- [x] El endpoint de errores responde correctamente aunque Analytics este deshabilitado.
- [x] La spec/documentacion aclara que Firebase Crashlytics no tiene SDK web para Nuxt puro.
- [x] La configuracion mobile de Crashlytics queda documentada con archivos requeridos por plataforma.
- [ ] Firebase DebugView o Realtime muestra al menos un evento de prueba. *(blocked: requiere proyecto Firebase creado y credenciales reales configuradas)*
- [ ] Una consulta `select * from client_error_events order by occurred_at desc limit 5;` muestra errores de prueba. *(blocked: requiere deploy con credenciales Firebase y que ocurra un error en producción)*

## Notes

Firebase Analytics puede usarse en la web actual. Firebase Crashlytics debe tratarse como una integracion mobile/futura, no como una dependencia directa de Nuxt web.

Los valores `NUXT_PUBLIC_*` son publicos por definicion en Nuxt y pueden verse en el navegador. Esto es normal para Firebase web config, pero no se deben poner secretos de servidor ahi.

Para este proyecto, el primer sistema de errores web sera propio: frontend captura, backend valida, PostgreSQL persiste. En una fase posterior se puede evaluar Sentry/Bugsnag si se necesitan agrupacion automatica, breadcrumbs avanzados, alertas y simbolicado mas completo.
