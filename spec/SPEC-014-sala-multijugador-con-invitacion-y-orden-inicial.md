---
id: SPEC-014
title: Sala multijugador con invitacion y orden inicial
created_at: 2026-06-13T08:17:09
status: done
---

# SPEC-014: Sala multijugador con invitacion y orden inicial

## Description

Corregir el flujo de creacion de mesas multijugador para que crear una mesa con slots humanos abiertos no envie directamente al juego. Al crear una mesa para jugar con otra persona, el usuario debe permanecer en una sala previa donde pueda compartir una invitacion copiable con la URL de la mesa, ver los participantes, ver las casillas/slots disponibles y resolver quien juega primero.

La excepcion es el modo de partida compuesto unicamente por bots, o una mesa donde todos los slots no humanos ya esten ocupados por bots al momento de crearla. En ese caso, la mesa puede entrar directamente a la partida porque no hay humanos externos que esperar.

Para mesas con mas de un humano, el orden inicial se decide tirando dados antes de comenzar. Cada jugador humano conectado debe tirar dados desde la sala. El jugador con mayor total va primero. Si hay empate en el mayor total, solo los jugadores empatados vuelven a tirar hasta que exista un ganador unico. La UI debe mostrar claramente quien va primero, las tiradas hechas, quienes faltan por tirar y los empates pendientes.

La sala tambien debe mostrar una invitacion con boton para copiar una URL de union, incluyendo una presentacion visual clara con favicon/icono de la app, codigo de mesa y estado de copiado. La persona invitada debe poder abrir esa URL, ver el contexto de la sala y unirse con su nombre.

## Context and Motivation

Actualmente `pages/multiplayer/lobby.vue` llama `POST /api/v1/tables` en `createTable()` y, si la respuesta es exitosa, ejecuta inmediatamente:

`navigateTo(/multiplayer/game?tableId=...&playerId=...)`

Ese comportamiento sirve para partidas contra bots, pero es incorrecto para una mesa que espera jugadores humanos. El creador pierde el contexto de sala, no tiene una invitacion lista para compartir y el juego comienza con `ActivePlayerIndex = 0` por defecto en `backend/internal/game/orchestrator.go`, sin resolver el orden inicial de forma justa.

El flujo pertenece al modulo multijugador:

- `pages/multiplayer/lobby.vue` para crear/unirse y mostrar sala previa.
- `pages/multiplayer/game.vue` para la partida una vez iniciada.
- `backend/internal/api/router.go` para crear, consultar y unirse a mesas.
- `backend/internal/table/manager.go` y `backend/internal/table/table.go` para administrar mesas, slots y websocket.
- `backend/internal/game/state.go` y `backend/internal/game/orchestrator.go` para reflejar fase, jugadores y jugador activo.

## Technical Analysis

El backend ya distingue `PhaseSetup` y `PhasePlaying` en `backend/internal/game/state.go`, pero `SetupGame()` cambia inmediatamente `gs.Phase = PhasePlaying`. La especificacion requiere aprovechar o extender esa fase de setup para una sala previa real.

La creacion de mesa se hace en `backend/internal/api/router.go` mediante `handleCreateTable`, que devuelve solo `tableId` y `playerId`. El frontend necesita conservar al creador en una vista de sala cuando existan slots humanos abiertos. La respuesta deberia incluir suficiente metadata para saber si la mesa puede autoiniciar, o el frontend puede inferirlo desde los slots enviados. La fuente de verdad debe quedar en backend para evitar que un cliente navegue al juego antes de que la mesa este lista.

La union actual usa `POST /api/v1/tables/{id}/join` y luego navega al juego. Para el nuevo flujo, si la mesa sigue en sala, debe navegar o permanecer en `pages/multiplayer/lobby.vue` con `tableId`/`playerId` y modo sala. Solo cuando el backend marque la mesa como iniciada debe ir a `pages/multiplayer/game.vue`.

El websocket actual envia snapshots con `proto.NewSnapshot(t.State)` y eventos de juego. Conviene reutilizar esta conexion tambien para la sala, o crear endpoints de polling simples si se prefiere un cambio menor. Reutilizar websocket permite que todos vean en vivo:

- jugadores conectados,
- slots abiertos,
- tiradas iniciales,
- empates,
- ganador del primer turno,
- estado de invitacion/listo/inicio.

El orden inicial no debe reutilizar el flujo normal `roll_dice`, porque ese flujo mueve fichas, resuelve casillas y modifica historial economico. Se necesita una accion separada, por ejemplo `roll_start_order`, con un estado dedicado en `GameState` o en `Table`.

Estado sugerido:

- `LobbyState` o campos en `GameState`: `startOrderStatus`, `startOrderRolls`, `startOrderRound`, `startOrderTiedPlayerIds`, `startOrderWinnerId`.
- Cada tirada inicial guarda `playerId`, `playerName`, `diceValues`, `total`, `round`, `rolledAt`.
- Cuando todos los participantes requeridos de la ronda han tirado, se calcula maximo.
- Si el maximo tiene un jugador, se setea `ActivePlayerIndex` al indice de ese jugador, se marca `PhasePlaying` y se emite evento/snapshot.
- Si el maximo tiene varios jugadores, solo esos jugadores quedan habilitados para la siguiente ronda.

Debe definirse si los bots participan en el sorteo. Recomendacion: todos los jugadores activos participan, incluidos bots, para mantener reglas consistentes. En una mesa mixta, los bots tiran automaticamente cuando se resuelve la ronda o cuando les toca en la sala. En una mesa solo bots, el sorteo se puede ejecutar automaticamente y entrar directo al juego.

Riesgos tecnicos:

- Evitar que `SetupGame()` deje la partida en `PhasePlaying` antes de tiempo para mesas que esperan humanos.
- Evitar que el bot scheduler (`maybeScheduleBotTurn`) empiece a jugar mientras la sala sigue en setup.
- Mantener compatibilidad con `pages/multiplayer/game.vue`, que actualmente asume que al abrir la URL ya hay partida jugable.
- Evitar exponer acciones de compra, dados normales o siguiente turno mientras `phase !== "playing"`.
- Cuidar que el link de invitacion use el origin correcto (`window.location.origin`) y preserve solo parametros necesarios (`mode=join`, `tableId` o `code`), sin filtrar `playerId` del creador.

## Implementation Plan

### Files to create

- `spec/SPEC-014-sala-multijugador-con-invitacion-y-orden-inicial.md` - especificacion del flujo de sala, invitacion y sorteo inicial.

### Files to modify

- `pages/multiplayer/lobby.vue` - agregar estado de sala creada/unida, tarjeta de invitacion con favicon, boton copiar URL, visualizacion de slots/jugadores, tiradas iniciales, empates y ganador. Evitar redireccion directa al juego salvo mesa solo bots/autoiniciada.
- `stores/multiplayerStore.ts` - extender tipos de `MPGameState` con estado de sala/sorteo inicial para que la UI pueda renderizarlo.
- `composables/useGameSocket.ts` - reutilizar conexion websocket desde lobby o exponer patron compartido para escuchar snapshots de sala.
- `pages/multiplayer/game.vue` - proteger acciones de juego cuando `phase !== "playing"` y manejar redireccion/estado si se entra antes de que la sala inicie.
- `backend/internal/game/state.go` - agregar estructura para orden inicial y metadata de sala si se decide alojarla en `GameState`.
- `backend/internal/game/orchestrator.go` - ajustar inicializacion para permitir mesas en setup y setear `ActivePlayerIndex` al ganador del sorteo antes de `PhasePlaying`.
- `backend/internal/table/table.go` - agregar acciones websocket para `roll_start_order`, calcular rondas/desempates, autotiros de bots y evento de inicio de partida. Asegurar que `maybeScheduleBotTurn` no corre turnos normales en setup.
- `backend/internal/proto/messages.go` - definir payloads de tirada inicial, actualizacion de sala, ganador de orden inicial y partida iniciada.
- `backend/internal/api/router.go` - devolver metadata de creacion/union, permitir consultar mesa en sala y mantener respuesta compatible.
- `backend/internal/table/manager.go` - revisar creacion/join para slots abiertos y criterios de mesa lista/autoinicio.
- `backend/internal/table/tokens_test.go` o nuevos tests de tabla - agregar cobertura para creacion, join, sorteo, empates y autoinicio.

### Ordered Steps

1. Modelar en backend el estado de sala y orden inicial con campos serializables en el snapshot.
2. Cambiar la creacion de mesa para que mesas con slots humanos abiertos permanezcan en `PhaseSetup`; mesas solo bots pueden autoiniciar.
3. Agregar accion `roll_start_order` independiente de `roll_dice`, sin movimiento de fichas ni resolucion de casillas.
4. Implementar algoritmo de mayor tirada y desempate: todos los requeridos tiran una vez; si hay empate maximo, solo los empatados repiten.
5. Al obtener ganador unico, setear `ActivePlayerIndex` al jugador ganador, marcar `PhasePlaying`, actualizar `StatusMessage` y emitir snapshot/evento.
6. Hacer que bots participen automaticamente en el sorteo cuando corresponda.
7. Actualizar endpoints de crear/unirse para devolver `tableId`, `playerId`, `phase`, `autoStarted` y/o datos iniciales de sala.
8. Cambiar `pages/multiplayer/lobby.vue` para que, tras crear mesa con humanos abiertos, muestre sala previa en vez de navegar al juego.
9. Crear URL de invitacion limpia, por ejemplo `/multiplayer/lobby?mode=join&tableId=T-xxxx`, con boton copiar, estado visual y favicon/icono.
10. En la vista join, prellenar el codigo desde `route.query.tableId` y mostrar contexto de invitacion.
11. Renderizar slots/casillas de sala con badges: creador, esperando jugador, bot, conectado, pendiente de tirar, tiro total, empatado, va primero.
12. Navegar automaticamente al juego solo cuando `phase === "playing"` o cuando la respuesta de creacion indique autoinicio.
13. Agregar tests backend para sorteo con ganador directo, empate simple, empate multiple y bots.
14. Verificar manualmente en navegador: crear mesa con slot abierto, copiar link, unirse desde link, tirar dados, resolver empate y entrar al juego con el ganador como primer turno.

## Acceptance Criteria

- [x] Crear una mesa con al menos un slot `open` no redirige inmediatamente a `/multiplayer/game`.
- [x] Crear una mesa compuesta solo por bots, o sin humanos pendientes, puede iniciar automaticamente y navegar al juego.
- [x] La sala muestra codigo de mesa, favicon/icono de la app, URL de invitacion y boton para copiar.
- [x] La URL copiada permite que otro jugador abra el lobby en modo unirse con el codigo de mesa precargado.
- [x] Los slots/casillas de la sala muestran estado claro: creador, jugador conectado, bot, abierto, pendiente de tirada, tiro realizado y ganador.
- [x] Todos los participantes requeridos pueden tirar dados para definir quien empieza.
- [x] Gana el primer turno quien obtiene el total mas alto.
- [x] Si dos o mas jugadores empatan en el total mas alto, solo esos empatados vuelven a tirar.
- [x] La partida no entra en `PhasePlaying` hasta que haya ganador unico del sorteo inicial, salvo autoinicio solo bots.
- [x] Al iniciar la partida, `ActivePlayerIndex` corresponde al ganador del sorteo.
- [x] El flujo normal `roll_dice` no se usa para el sorteo inicial y no mueve fichas durante la sala.
- [x] Los bots no ejecutan turnos normales mientras la mesa esta en setup.
- [x] `npm run build` pasa y las rutas `/multiplayer/lobby` y `/multiplayer/game` no quedan rotas.

## Notes

La alternativa de resolver el primer turno solo en frontend se descarta porque el orden inicial debe ser autoritativo y sincronizado para todos los clientes. Tambien se descarta reutilizar `roll_dice` porque tiene efectos secundarios de partida: movimiento, resolucion de casillas, historiales y posibles compras/rentas.

La invitacion no debe incluir `playerId`; solo debe incluir el identificador de mesa y parametros de UI necesarios. El `playerId` se genera al unirse.

Para la UI, la sala debe ser la primera experiencia despues de crear una mesa humana: no debe sentirse como una pantalla de marketing ni como una configuracion secundaria, sino como una mesa activa esperando jugadores y definiendo el orden de salida.
