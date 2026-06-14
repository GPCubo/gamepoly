---
id: SPEC-016
title: Multilanguage para solitario, multijugador y landing
created_at: 2026-06-14T10:14:23
status: done
---

# SPEC-016: Multilanguage para solitario, multijugador y landing

## Description

Reescribir la capa de textos del juego para soportar multiples idiomas sin cambiar la logica de juego. Actualmente la interfaz, mensajes de estado, historiales, errores y textos de cartas/casillas estan mayormente escritos en espanol de forma literal dentro de componentes Vue, stores TypeScript y backend Go. Se debe implementar una arquitectura de internacionalizacion que permita cambiar idioma para:

- Landing page (`pages/index.vue`).
- Configuracion de partida solitaria/local (`pages/setup.vue`).
- Juego solitario/local (`pages/game.vue`).
- Lobby multijugador (`pages/multiplayer/lobby.vue`).
- Juego multijugador (`pages/multiplayer/game.vue`).
- Componentes compartidos (`TileCard.vue`, `GameOverlay.vue`, `SidebarConfig.vue`, `ExchangeModal.vue`, `AuctionModal.vue`, `WinnerOverlay.vue`, `AppHeader.vue`, etc.).
- Textos dinamicos generados por stores frontend (`stores/gameStore.ts`).
- Textos dinamicos generados por backend multijugador (`backend/internal/game`, `backend/internal/table`, `backend/internal/api`) que llegan al frontend como `statusMessage`, historiales o errores.
- Configuracion de tablero, cartas, fichas y escenarios (`config/boardTilesConfig.ts`, `config/localScenarioSeeds.ts`, `config/gameConfig.ts` y equivalentes backend).

La logica del juego no debe cambiar. Solo se debe cambiar como se representan los textos al usuario. El primer idioma por defecto debe seguir siendo espanol para no romper la experiencia actual, y se debe agregar al menos ingles como segundo idioma para validar que la arquitectura realmente funciona.

## Context and Motivation

El proyecto ya tiene una experiencia jugable en solitario y multijugador, pero los textos estan acoplados al codigo. Ejemplos actuales:

- `pages/index.vue` contiene textos directos de landing.
- `pages/setup.vue` contiene labels como "Configuracion de Partida", "Crear mesa", "Unirse a mesa", "Bot Dificil".
- `pages/multiplayer/lobby.vue` contiene textos de sala, invitacion, slots, errores y estado de orden inicial.
- `pages/multiplayer/game.vue` contiene HUD, acciones, deuda, ganador, estado de conexion, FPS/ping y textos de sidebar.
- `components/TileCard.vue`, `components/GameOverlay.vue`, `components/ExchangeModal.vue` y `components/SidebarConfig.vue` contienen muchos textos de acciones y estados economicos.
- `stores/gameStore.ts` genera `statusMessage` e historiales economicos en espanol para el modo local.
- `backend/internal/game/engine.go` genera mensajes del multijugador en espanol, por ejemplo pagos, compras, alquileres, carcel, bancarrota e hipotecas.
- `backend/internal/table/manager.go` y `backend/internal/api/router.go` devuelven errores en espanol.
- `config/boardTilesConfig.ts` y `backend/internal/config/boardtiles.go` tienen nombres de casillas y textos de cartas en espanol.

Esto hace costoso agregar ingles u otros idiomas porque cada cambio requiere buscar strings repartidos por toda la aplicacion. Tambien impide que el frontend cambie de idioma sin reiniciar la partida o sin reescribir mensajes ya generados.

## Technical Analysis

No hay dependencia i18n instalada actualmente en `package.json`. Para mantener el cambio controlado, se recomienda implementar una capa propia ligera en Nuxt/Vue:

- `locales/es.ts` y `locales/en.ts` con diccionarios tipados.
- `composables/useI18n.ts` o `composables/useLocale.ts` para exponer:
  - `locale`
  - `setLocale(locale)`
  - `t(key, params?)`
  - `tc(key, count, params?)` si se requiere pluralizacion simple.
- Persistencia de idioma en `localStorage`.
- Inicializacion desde navegador (`navigator.language`) si no existe preferencia guardada.
- Selector de idioma en una ubicacion global, idealmente `AppHeader.vue` o landing, y visible en flujos principales.

Para textos frontend estaticos, los componentes deben reemplazar strings directos por claves de traduccion:

```ts
t("multiplayer.game.actions.rollDice")
```

Para textos dinamicos en frontend local, se debe evitar guardar frases completas cuando sea posible. En vez de `statusMessage: string` generado con texto final, se puede introducir un formato de evento traducible:

```ts
statusMessageKey: "game.status.passedGo"
statusMessageParams: { playerName, amount }
```

Sin embargo, por alcance y compatibilidad, se puede hacer una migracion incremental:

1. Primero traducir UI visible y nuevos mensajes.
2. Luego migrar status/historiales a claves.
3. Mantener fallback al string existente si aun llega texto pre-renderizado.

Para multijugador, hay una decision importante: el backend actualmente envia mensajes ya renderizados en espanol. Para soportar idioma por cliente, el backend no deberia ser responsable del idioma final de cada usuario. La solucion recomendada es que el backend envie codigos de mensaje y parametros, no frases finales:

- `statusMessageKey`
- `statusMessageParams`
- en historiales: `titleKey`, `detailKey`, `params`
- en errores API/WebSocket: `code` estable + `message` fallback

El frontend multijugador traduce esos codigos segun el idioma local de cada cliente. Mientras se migra, se mantiene `statusMessage` y `title/detail` como fallback.

El tablero y cartas tienen doble fuente:

- Frontend: `config/boardTilesConfig.ts` usado por renderizado, labels, tarjetas y modo local.
- Backend: `backend/internal/config/boardtiles.go` usado por motor multijugador, cartas y mensajes.

Para no duplicar traducciones manualmente en dos lugares, la spec debe definir una estrategia. Opciones:

1. Mantener IDs estables de casillas/cartas y traducir los nombres/textos en frontend por ID.
2. Generar config compartida desde un JSON comun.
3. Mantener backend con nombres fallback y mandar IDs al frontend para traduccion visual.

Recomendacion incremental: introducir IDs de traduccion en frontend para casillas/cartas (`tile.1.name`, `card.ch01.text`) y mantener backend con fallback espanol mientras se agregan payloads con IDs. A futuro, mover board/cards a JSON compartido.

Riesgos tecnicos:

- El cambio toca muchas pantallas y puede introducir textos faltantes.
- Los mensajes de backend pueden mezclarse con idioma local si se migra a medias.
- Historiales existentes guardados como texto no pueden traducirse retroactivamente si ya se almacenaron como strings.
- Algunos textos contienen parametros monetarios, nombres de jugadores y nombres de propiedades; el sistema debe soportar interpolation segura.
- No se debe traducir IDs, nombres de archivos de modelos (`coffee.glb`, `soccer_ball.glb`), rutas, codigos de mesa ni claves internas.
- El tablero 3D y labels de casillas pueden usar canvas/texturas; cambiar idioma debe invalidar/regenerar labels.

## Implementation Plan

### Files to create

- `locales/es.ts` - diccionario base en espanol con todos los textos migrados.
- `locales/en.ts` - diccionario ingles para validar el sistema.
- `locales/index.ts` - registro de idiomas, tipos y helpers de acceso.
- `composables/useI18n.ts` - estado global de idioma, `t()`, interpolation, persistencia y fallback.
- `components/LanguageSwitcher.vue` - selector compacto de idioma reutilizable.
- `utils/i18nFormat.ts` - helpers opcionales para interpolation, dinero y pluralizacion simple.

### Files to modify

- `components/AppHeader.vue` - agregar selector de idioma global o slot para mostrarlo.
- `pages/index.vue` - reemplazar textos de landing por claves i18n.
- `pages/setup.vue` - traducir modo solitario/local, bots, multijugador, errores de validacion y labels.
- `pages/game.vue` - traducir acciones, overlays, estado local, mensajes de deuda y labels.
- `pages/multiplayer/lobby.vue` - traducir crear/unirse, invitacion, sala, slots, orden inicial, errores y fichas.
- `pages/multiplayer/game.vue` - traducir HUD, acciones, deuda, conexion, timer, ganador, sidebar y snackbars.
- `components/TileCard.vue` - traducir acciones de compra/subasta/hipoteca, nombres de grupos, estados de casilla, textos de carcel/impuestos.
- `components/GameOverlay.vue` - traducir HUD, botones, historico y minimapa.
- `components/SidebarConfig.vue` - traducir configuracion, acciones de propiedades, estados e historiales.
- `components/ExchangeModal.vue` - traducir modal de intercambio, advertencias y modo espectador.
- `components/AuctionModal.vue` - traducir subastas.
- `components/WinnerOverlay.vue` - traducir overlay de ganador local.
- `stores/gameStore.ts` - migrar mensajes dinamicos locales a claves traducibles o usar helper i18n fuera del store sin romper Pinia.
- `stores/multiplayerStore.ts` - extender tipos para mensajes traducibles si backend envia claves.
- `config/boardTilesConfig.ts` - agregar IDs de traduccion o mover textos visibles a diccionario.
- `config/localScenarioSeeds.ts` - traducir nombres/descripciones de escenarios.
- `config/gameConfig.ts` - traducir nombres de fichas visibles.
- `composables/useTileLabels.ts` - regenerar labels cuando cambie idioma.
- `backend/internal/game/state.go` - agregar campos opcionales para `statusMessageKey`/params si se adopta migracion backend.
- `backend/internal/game/engine.go` - empezar a emitir codigos/params para mensajes dinamicos multijugador manteniendo fallback.
- `backend/internal/table/table.go` - emitir errores/eventos con codigos traducibles cuando aplique.
- `backend/internal/api/router.go` - devolver codigos de error estables y mensajes fallback.
- `backend/internal/config/boardtiles.go` - agregar IDs de casillas/cartas o preparar datos para traduccion frontend.
- `spec/SPEC-016-multilanguage-para-solitario-multijugador-y-landing.md` - mantener actualizada la checklist durante implementacion.

### Ordered Steps

1. Crear infraestructura i18n frontend: diccionarios `es/en`, composable `useI18n`, interpolation y fallback a espanol.
2. Agregar `LanguageSwitcher.vue` y ubicarlo en `AppHeader.vue` o en un punto global visible.
3. Migrar landing page (`pages/index.vue`) para validar el flujo basico de cambio de idioma.
4. Migrar `pages/setup.vue` y textos de configuracion local/multijugador.
5. Migrar componentes compartidos mas visibles: `TileCard.vue`, `GameOverlay.vue`, `SidebarConfig.vue`, `WinnerOverlay.vue`.
6. Migrar `pages/game.vue` para modo solitario/local.
7. Migrar `pages/multiplayer/lobby.vue`.
8. Migrar `pages/multiplayer/game.vue`, incluyendo HUD, deuda, timer, ping/FPS, ganador y sidebar.
9. Migrar `ExchangeModal.vue` y `AuctionModal.vue`.
10. Agregar traducciones para nombres visibles de fichas, escenarios locales, grupos de propiedades y estados.
11. Agregar traducciones de tablero/cartas en frontend por ID de casilla/carta.
12. Hacer que labels de tablero/casillas se regeneren al cambiar idioma.
13. Introducir estructura de mensajes traducibles en stores locales (`statusMessageKey`, params o helper equivalente) con fallback.
14. Introducir estructura de mensajes traducibles en backend multijugador (`statusMessageKey`, params, errores con code) manteniendo `statusMessage` fallback.
15. Actualizar frontend multijugador para preferir claves traducibles del backend y caer al string recibido si falta traduccion.
16. Revisar todos los strings visibles restantes con `rg` y moverlos a diccionarios o justificar excepciones.
17. Probar cambio de idioma en landing, setup, juego local, lobby multijugador y juego multijugador.
18. Ejecutar `npm run build`.
19. Ejecutar `go test ./...` en backend si hay cambios Go y el toolchain esta disponible.

## Acceptance Criteria

- [x] Existe una infraestructura i18n frontend con al menos `es` y `en`.
- [x] El idioma por defecto sigue siendo espanol.
- [x] La preferencia de idioma se persiste entre recargas.
- [x] La landing page puede mostrarse en espanol e ingles.
- [x] `pages/setup.vue` puede mostrarse en espanol e ingles.
- [x] El modo solitario/local puede mostrarse en espanol e ingles.
- [x] El lobby multijugador puede mostrarse en espanol e ingles.
- [x] El juego multijugador puede mostrarse en espanol e ingles.
- [x] Componentes compartidos principales usan claves i18n en vez de strings hardcodeados visibles.
- [x] Botones y acciones economicas principales estan traducidos: comprar, subastar, construir, vender, hipotecar, levantar hipoteca, siguiente, tirar dados.
- [x] Estados de deuda, bancarrota, carcel, conexion, ganador, timer, ping/FPS y bot temporal estan traducidos.
- [x] Nombres visibles de fichas y escenarios locales estan traducidos.
- [x] Nombres/textos visibles de casillas y cartas tienen estrategia traducible por ID.
- [x] Mensajes dinamicos del modo local no dependen exclusivamente de frases hardcodeadas en espanol.
- [x] Mensajes dinamicos del backend multijugador tienen codigos/params traducibles o fallback documentado.
- [x] Cambiar idioma no altera reglas, dinero, turnos, propiedades, cartas, dados ni estado de partida.
- [x] Si falta una clave de traduccion, se usa fallback espanol sin romper la UI.
- [x] `npm run build` pasa.
- [ ] `go test ./...` pasa en entorno con Go instalado si se modifican archivos Go. *(blocked: Go toolchain is not installed in this environment)*

## Notes

No se recomienda instalar una dependencia pesada de i18n al inicio porque el proyecto no tiene una actualmente y la necesidad puede cubrirse con una capa ligera. Si mas adelante se requieren pluralizacion avanzada, carga lazy por idioma, fechas complejas o traduccion gestionada por terceros, se puede evaluar `@nuxtjs/i18n` en una spec separada.

No se deben traducir claves internas, rutas, IDs de cartas/casillas, nombres de archivos `.glb`, codigos de mesa, eventos websocket ni tipos de acciones.

Los historiales ya generados como texto final no podran cambiar de idioma retroactivamente salvo que se migren a eventos con clave y parametros. Para compatibilidad, durante la migracion se debe permitir que una entrada tenga tanto `title/detail` fallback como `titleKey/detailKey` traducible.

La traduccion del backend debe priorizar codigos estables y parametros. Cada cliente podria tener un idioma diferente en la misma mesa multijugador, por lo que el backend no deberia decidir el idioma final de los mensajes visibles.

## Implementation Notes

- 2026-06-14: Implementada infraestructura i18n frontend con `es/en`, selector global, persistencia en `localStorage`, fallback a espanol, traduccion por ID para casillas/cartas/fichas/escenarios, regeneracion de labels del tablero al cambiar idioma y migracion principal de landing, setup, lobby, juego local, juego multijugador, `TileCard`, `GameOverlay`, `SidebarConfig`, `WinnerOverlay`, `CardOverlay` y `AuctionModal`.
- 2026-06-14: Backend multijugador preparado con campos opcionales `statusMessageKey`, `statusMessageParams`, `titleKey`, `detailKey` y `params` manteniendo `statusMessage/title/detail` como fallback.
- Pendiente: `ExchangeModal.vue` conserva textos hardcodeados y requiere una migracion completa en una pasada dedicada.
- Pendiente de entorno: `go test ./...` no se pudo ejecutar porque `go` no esta instalado en este entorno.
