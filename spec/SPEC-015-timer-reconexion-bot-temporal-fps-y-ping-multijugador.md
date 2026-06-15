---
id: SPEC-015
title: Timer, reconexion con bot temporal, FPS y ping multijugador
created_at: 2026-06-13T21:39:39
status: in-progress
---

# SPEC-015: Timer, reconexion con bot temporal, FPS y ping multijugador

## Description

Implementar mejoras de resiliencia y visibilidad en el modo multijugador:

- Timer de turno de 30 segundos en partida multijugador.
- Aviso visual en el listado/HUD de jugadores cuando un jugador humano esta desconectado.
- Al desconectarse un jugador humano, un bot toma su puesto automaticamente hasta que el jugador vuelva.
- Si un jugador humano no responde durante 30 segundos (AFK), un bot toma su puesto automaticamente. El jugador recupera el control en cuanto envie cualquier accion de juego.
- Al reconectarse el jugador, recupera su puesto, ficha, dinero, propiedades y turno si corresponde.
- Mostrar contador de FPS en el cliente.
- Mostrar medicion de ping/latencia websocket en el cliente.

La funcionalidad debe existir tanto a nivel de backend como de UI. El backend debe ser la fuente de verdad para estado de conexion, takeover temporal por bot y timer de turno, porque esas reglas afectan el avance real de la partida y no pueden depender solo del navegador de un jugador.

## Context and Motivation

El modo multijugador ya tiene sala, invitacion, orden inicial y conexion websocket. Tambien existe un evento de desconexion en `backend/internal/table/table.go` (`player_disconnected`) y estado local en `stores/multiplayerStore.ts` (`playerDisconnectedEvent`). Sin embargo, hoy la desconexion no queda claramente reflejada como estado persistente en el listado de jugadores, y el juego puede quedar detenido si el jugador activo se va.

Para una partida online, las desconexiones deben ser tolerables: si alguien pierde internet o cierra la pestaña, los demas jugadores no deben quedar bloqueados. Un bot temporal debe jugar por esa persona hasta que vuelva. Ademas, el timer de turno evita esperas indefinidas incluso si un jugador conectado no actua.

FPS y ping ayudan a diagnosticar problemas de rendimiento o red, especialmente porque `pages/multiplayer/game.vue` usa escena 3D, WebSocket y animaciones de movimiento. El jugador necesita saber si una mala experiencia viene de bajo rendimiento local o latencia de red.

## Technical Analysis

El backend multijugador esta centrado en:

- `backend/internal/table/table.go` - administra conexiones websocket, desconexiones, bot scheduler, acciones de jugadores y broadcast de snapshots.
- `backend/internal/table/manager.go` - crea mesas, une jugadores y mantiene slots.
- `backend/internal/game/state.go` - estado serializable que recibe el frontend.
- `backend/internal/proto/messages.go` - payloads websocket.
- `backend/internal/game/bot.go` - decisiones de bots regulares/dificiles.

Actualmente `PlayerSlot.Conn == nil` representa tanto bot como humano desconectado, y `PlayerSlot.IsBot` representa bots reales. Para esta spec conviene distinguir:

- Bot real: jugador configurado como bot desde el inicio.
- Humano conectado: jugador humano con websocket activo.
- Humano desconectado: jugador humano sin websocket activo.
- Bot temporal: modo de control activo mientras un humano esta desconectado, sin convertir permanentemente al jugador en bot.

No se debe cambiar permanentemente `PlayerState.IsBot` del humano si eso rompe identidad, UI o reconexion. Una opcion mas segura es agregar metadata de conexion/control en el snapshot, por ejemplo campos en `PlayerState`:

- `connected: boolean`
- `controlledByBot: boolean`
- `disconnectedAt?: number`
- `reconnectGraceMs?: number`

Otra opcion es alojar esta metadata en `Table` y proyectarla al snapshot antes de emitir. La primera opcion es mas simple para UI porque `stores/multiplayerStore.ts` ya refleja `MPPlayerState`.

El timer de turno debe vivir en backend para ser autoritativo. Puede implementarse con un `turnTimer` en `Table`, similar a `botTimer` e `inactiveTimer`. El timer debe reiniciarse cuando cambia el jugador activo, cuando termina una accion que completa turno o cuando inicia una subasta si se decide tener timer separado para subasta. El MVP puede cubrir turnos normales:

- Duracion configurable inicial: por ejemplo 60 segundos.
- El snapshot incluye `turnDeadlineAt` o `turnRemainingMs`.
- Si expira y el jugador activo es humano conectado, se ejecuta una accion segura: tirar dados si debe tirar, aceptar carta si hay carta pendiente, pasar compra si espera decision de compra, siguiente turno si el turno ya esta completo.
- Si expira y el humano esta desconectado, el bot temporal actua usando la logica existente de bots.

El bot temporal puede reutilizar `executeBotStep()` y la logica de `DecideBotTurn`, pero debe considerar que `PlayerState.IsBot` podria seguir siendo `false`. Para evitar duplicar logica, se puede introducir un helper en `Table`, por ejemplo `isBotControlled(playerID string)`, que devuelva true si el slot es bot real o si el humano esta desconectado y en control temporal. Los puntos que hoy consultan `slot.IsBot` o `p.IsBot` para automatizar turnos/subastas/compras deben usar ese helper cuando se trate de control de mesa. La UI debe seguir mostrando que el jugador es humano, pero con badge "Desconectado" y "Bot temporal".

El flujo de reconexion debe apoyarse en el mismo `playerId` que ya se pasa por query string. Cuando un websocket entra por `/ws?tableId=...&playerId=...`, `AddConn()` debe marcar al jugador como conectado, cancelar su control temporal, emitir snapshot y evento `player_reconnected`. Si ese jugador es el activo, debe recuperar el control en el siguiente punto seguro; si el bot temporal esta en medio de un delay, debe cancelarse o ignorarse si ya no aplica.

Ping puede medirse con websocket application-level messages:

- Cliente envia `ping` con timestamp local o secuencia.
- Backend responde `pong` con la misma secuencia.
- Cliente calcula RTT y actualiza promedio movil.

Aunque existe `heartbeat` en `composables/useGameSocket.ts`, actualmente parece ser un mensaje sin medicion de ida/vuelta. Se puede extender sin romper compatibilidad agregando `ping`/`pong`, o hacer que `heartbeat` responda con `heartbeat_ack`. Es preferible `ping`/`pong` para separar keepalive de metrica visible.

FPS debe medirse solo en frontend con `requestAnimationFrame`, idealmente en un composable reusable como `composables/usePerformanceStats.ts`. La UI puede mostrar FPS y ping en una esquina discreta de `pages/multiplayer/game.vue`, sin tapar HUD, dados ni acciones principales.

Riesgos tecnicos:

- Evitar carreras entre reconexion y bot temporal ejecutando una accion.
- Evitar que dos clientes puedan actuar por el mismo jugador si reconecta mientras el bot temporal estaba programado.
- No convertir un humano en bot real de forma permanente.
- No bloquear subastas, cartas o decisiones de compra cuando el jugador activo esta desconectado.
- No saturar websocket con mediciones de ping; intervalo recomendado: 2-5 segundos.
- Evitar que el timer visual se descuadre: el cliente debe derivar cuenta regresiva desde timestamp/deadline del backend.

## Implementation Plan

### Files to create

- `composables/usePerformanceStats.ts` - composable para calcular FPS con `requestAnimationFrame` y ping promedio desde eventos websocket o callbacks.
- `backend/internal/table/timer_test.go` - tests de expiracion de turno, bot temporal y reconexion, si se separa de tests existentes.

### Files to modify

- `backend/internal/game/state.go` - agregar campos serializables para conexion/control por jugador y timer de turno (`turnDeadlineAt`, `turnDurationMs` o similar).
- `backend/internal/proto/messages.go` - agregar payloads para `player_reconnected`, `ping`, `pong`, cambios de timer si no se confia solo en snapshots.
- `backend/internal/table/table.go` - marcar conexion/desconexion persistente, activar bot temporal, cancelar control temporal al reconectar, implementar timer de turno autoritativo y responder ping/pong.
- `backend/internal/table/manager.go` - asegurar que los slots preserven identidad de humanos y que join/reconnect no creen duplicados.
- `backend/internal/game/bot.go` - exponer o reutilizar decisiones para jugadores controlados temporalmente por bot sin requerir que `PlayerState.IsBot` sea true.
- `stores/multiplayerStore.ts` - extender `MPPlayerState` y `MPGameState` con `connected`, `controlledByBot`, `disconnectedAt`, `turnDeadlineAt`, `turnDurationMs`, ping/FPS local si conviene.
- `composables/useGameSocket.ts` - agregar medicion de ping o soporte para request/response `ping`/`pong`; exponer latencia actual/promedio.
- `pages/multiplayer/game.vue` - mostrar timer de turno, estado desconectado en el HUD/listado de jugadores, badge de bot temporal, contador FPS y ping.
- `pages/multiplayer/lobby.vue` - si aplica a sala previa, mostrar conectado/desconectado/reconectado en casillas de sala.

### Ordered Steps

1. Definir en backend el modelo de estado para conexion y control temporal por jugador.
2. Agregar campos serializables al snapshot para que frontend pueda renderizar conectado/desconectado/bot temporal.
3. En `RemoveConn()`, marcar humano como desconectado, guardar `disconnectedAt`, activar `controlledByBot` y emitir `player_disconnected` + snapshot.
4. En `AddConn()`, marcar humano como conectado, desactivar `controlledByBot`, emitir `player_reconnected` + snapshot.
5. Introducir helper backend `isBotControlled(playerID)` y usarlo en scheduler, subasta, compra, carta y turno normal donde hoy se asume bot real.
6. Implementar timer autoritativo de turno en `Table`, con deadline incluido en snapshot.
7. Al expirar timer, ejecutar una accion segura segun estado actual del jugador activo.
8. Si el jugador activo esta desconectado, permitir que bot temporal juegue automaticamente hasta que reconecte.
9. Agregar mensajes `ping`/`pong` o `heartbeat_ack` para medir RTT desde `useGameSocket.ts`.
10. Crear `usePerformanceStats.ts` para calcular FPS y exponerlo a `pages/multiplayer/game.vue`.
11. Actualizar HUD de jugadores en `pages/multiplayer/game.vue` con badges: conectado, desconectado, bot temporal, bot real y "tu".
12. Agregar UI de timer visible cerca del estado/acciones del turno, con estado critico en los ultimos segundos.
13. Agregar widget compacto de rendimiento con `FPS` y `Ping`.
14. Agregar tests backend para desconexion, reconexion, takeover temporal y expiracion de timer.
15. Verificar manualmente con dos pestañas: desconectar una, observar bot temporal, reconectar y recuperar control.

## Acceptance Criteria

- [x] El HUD/listado de jugadores en multijugador muestra cuando un humano esta desconectado.
- [x] Al desconectarse un humano, el backend marca `controlledByBot` o equivalente y el jugador no bloquea la partida.
- [x] El bot temporal puede tirar dados, aceptar cartas, pasar/comprar segun decision de bot y avanzar turno por el humano desconectado.
- [x] Al reconectarse con el mismo `playerId`, el humano recupera su puesto sin perder ficha, dinero, propiedades, posicion ni historial.
- [x] La UI muestra claramente cuando un puesto esta siendo jugado por bot temporal.
- [x] Existe timer de turno visible para todos los jugadores (duracion: 30 segundos).
- [x] El timer se reinicia al cambiar de turno o al entrar en un nuevo estado de decision relevante.
- [x] Cuando el timer expira, el backend ejecuta una accion segura y sincronizada, sin depender del cliente.
- [x] Si el jugador activo es un humano conectado al momento de expirar el timer, queda marcado como AFK (`controlledByBot = true`) y el bot toma el control de sus turnos siguientes.
- [x] El jugador recupera el control manual (AFK se limpia) en cuanto envia cualquier accion de juego real.
- [x] El contador de FPS se muestra en `pages/multiplayer/game.vue`.
- [x] El ping websocket se muestra en `pages/multiplayer/game.vue` y se actualiza periodicamente.
- [x] Ping/FPS no tapan botones principales, dados, HUD de jugadores ni modales.
- [x] La implementacion no convierte permanentemente a humanos desconectados en bots reales.
- [x] `npm run build` pasa.
- [ ] `go test ./...` pasa en un entorno con Go instalado.

## Notes

El bot temporal debe ser una capa de control, no un reemplazo de identidad. El jugador sigue siendo el mismo jugador para propiedades, dinero, bancarrota, orden de turno, ficha y reconexion.

El timer debe ser autoritativo en backend. Un contador solo en frontend seria facil de desincronizar y no resolveria el bloqueo de partida si el navegador activo se cierra.

Para el MVP, FPS y ping pueden vivir en un widget compacto siempre visible. Si luego se quiere una UI mas limpia, se puede mover a un panel de diagnostico o hacerlo configurable.

La duracion del timer es 30 segundos. Al expirar, si el jugador activo es un humano conectado (no desconectado ni bot real), se lo marca como AFK (`ControlledByBot = true`) y el bot ejecuta la accion inmediata. El flag AFK se limpia automaticamente cuando el jugador envia cualquier accion de juego real (no heartbeat/ping). La duracion puede dejarse preparada para configuracion de sala en una spec posterior.

Implementacion parcial: queda pendiente ejecutar `go test ./...` en un entorno con Go instalado. En esta maquina los comandos `go` y `gofmt` no estan disponibles, por lo que la verificacion backend no pudo completarse localmente.
