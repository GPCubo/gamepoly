---
id: SPEC-004
title: Mejoras del bot dificil e intercambios multiplayer
created_at: 2026-06-12T12:03:10
status: done
---

# SPEC-016: Mejoras del bot dificil e intercambios multiplayer

## Description

Mejorar el comportamiento del bot dificil en multiplayer para que sea mas estrategico en subastas e intercambios, y agregar acceso al flujo de intercambio desde el sidebar de configuracion de `pages/multiplayer/game.vue`.

La mejora de subasta debe contemplar la casuistica donde se subasta una propiedad que completa un grupo de color para el bot dificil o para otro jugador. Si al bot dificil le falta solo esa propiedad para poder construir casas/hoteles, debe intentar un poco mas por obtenerla. Si la propiedad le completa grupo a un rival, el bot dificil tambien debe considerar pujar mas para bloquear esa ventaja, sin sobrepagar de forma irracional.

Ademas, en multiplayer falta un boton dentro del panel de configuracion para abrir intercambio. Se debe reutilizar la vista/modal existente de intercambio usada en `pages/game.vue` y `components/ExchangeModal.vue`, adaptandola a IDs string y eventos websocket de multiplayer.

Finalmente, los bots deben poder proponer intercambios sin hacer spam. Deben detectar oportunidades de intercambio utiles, proponerlas con una frecuencia limitada y respetar estados activos como subastas, cartas, turno en movimiento o una propuesta ya abierta.

## Context and Motivation

El modo local ya tiene un flujo de intercambio conectado desde `pages/game.vue`, `GameOverlay.vue`, `SidebarConfig.vue` y `components/ExchangeModal.vue`. Multiplayer ya tiene estructuras backend para intercambios (`ExchangeProposal`, `CanProposeExchange`, `ExecuteExchange`, eventos `propose_trade` y `respond_trade`), pero la vista multiplayer no expone el boton ni el modal para que los usuarios lo usen.

El bot dificil actualmente toma mejores decisiones que el regular, pero puede quedarse corto en subastas de propiedades estrategicas. En Monopoly-like games, completar un grupo de color cambia drasticamente el valor de una propiedad porque habilita casas y hoteles. Tambien es valioso bloquear a un rival cuando esa propiedad le completa el grupo.

Los intercambios entre bots pueden hacer la partida mas viva, pero si se ejecutan sin restricciones pueden saturar la UI y el historial. Por eso se requiere una politica anti-spam.

## Technical Analysis

Archivos y piezas relevantes:

- `backend/internal/game/bot.go` contiene la heuristica de compra/subasta (`DecideBotAuctionAction`, `difficultAuctionBid`, `difficultDecideBuy`).
- `backend/internal/game/state.go` define `ExchangeProposal` y estado `ExchangeProposal`.
- `backend/internal/game/validators.go` valida `CanProposeExchange`.
- `backend/internal/game/engine.go` ejecuta `ExecuteExchange`.
- `backend/internal/table/table.go` procesa `propose_trade`, `respond_trade` y orquesta pasos de bot.
- `pages/game.vue` muestra el flujo local de `ExchangeModal`, con handlers `onOpenExchange`, `onExchangePropose`, `onExchangeAccept`, `onExchangeReject`, `onExchangeCancel`.
- `components/ExchangeModal.vue` usa tipos del store local (`PlayerState`, `ExchangeProposal`, `PropertyDevelopmentState`), por lo que requiere adaptacion o tipos compartidos para multiplayer.
- `pages/multiplayer/game.vue` ya tiene sidebar de configuracion y estado `mpStore.exchangeProposal`, pero no renderiza el modal ni tiene boton de intercambio.
- `stores/multiplayerStore.ts` ya define `MPExchangeProposal`, aunque debe revisarse compatibilidad con `ExchangeModal`.

Para subastas, la heuristica debe aumentar el `maxBid` del bot dificil cuando:

- La propiedad subastada completa grupo al bot dificil.
- La propiedad subastada completa grupo a un rival y el bot dificil tiene efectivo suficiente para bloquear.
- La propiedad es ferrocarril/servicio y mejora una coleccion relevante, con menor agresividad que un grupo de color.

Para intercambios de bots, se necesita un sistema que:

- Detecte si un bot puede completar grupo pidiendo una propiedad a otro jugador.
- Ofrezca dinero o propiedades equivalentes sin romper reglas.
- No proponga si ya hay `ExchangeProposal`, subasta activa, carta activa, movimiento pendiente o turno critico.
- Use cooldown por bot y por par de jugadores.
- Limite renegociaciones.
- Registre o emita eventos suficientes para que todos los usuarios vean la propuesta.

Riesgos:

- `ExchangeModal.vue` actualmente importa tipos desde `stores/gameStore`, cuyos IDs son number; multiplayer usa IDs string. Habra que generalizar tipos o crear un adaptador.
- Si los bots proponen en cualquier tick, podrian interrumpir demasiado la partida. Debe integrarse con `executeBotStep` y cooldowns.
- Intercambios con propiedades desarrolladas pueden vender mejoras segun reglas actuales; la UI debe mostrar advertencias como en modo local.
- La IA de bloqueo en subastas no debe dejar al bot sin liquidez para rentas/impuestos.

## Implementation Plan

### Files to create

- Ninguno inicialmente. Si la logica de intercambios bot crece demasiado, crear `backend/internal/game/bot_exchange.go` para separar heuristicas.

### Files to modify

- `backend/internal/game/bot.go` - mejorar `difficultAuctionBid` con valor estrategico por completar grupo propio o bloquear grupo rival; agregar heuristicas de propuesta de intercambio si se mantiene aqui.
- `backend/internal/table/table.go` - orquestar propuestas de intercambio de bots con cooldown y sin spam; emitir eventos/snapshots adecuados.
- `backend/internal/game/state.go` - agregar campos internos de cooldown si deben persistir dentro de la mesa, o mantenerlos en `Table` si solo son runtime.
- `backend/internal/game/validators.go` - revisar validaciones de intercambio para bots y IDs string.
- `pages/multiplayer/game.vue` - agregar boton de intercambio en configuracion; renderizar `ExchangeModal`; conectar handlers websocket `propose_trade` y `respond_trade`; cerrar/actualizar modal con eventos.
- `stores/multiplayerStore.ts` - exponer helpers o tipos compatibles para `ExchangeModal`, si hace falta.
- `components/ExchangeModal.vue` - generalizar tipos para aceptar IDs `number | string` y estados multiplayer, o crear un wrapper/adaptador en la vista multiplayer.

### Ordered Steps

1. Analizar `ExchangeModal.vue` y extraer los contratos minimos de jugadores, propiedades, desarrollos y propuestas.
2. Generalizar tipos de `ExchangeModal.vue` para que acepte IDs `number | string`, o crear props compatibles desde multiplayer.
3. Agregar en `pages/multiplayer/game.vue` un boton `Intercambio` dentro de configuracion, similar al boton de `SidebarConfig.vue` en modo local.
4. Implementar estado local `showExchange`, `exchangeIsResponding`, `exchangeSpectatorMode` y handlers `onExchangePropose`, `onExchangeAccept`, `onExchangeReject`, `onExchangeCancel` usando `socket.send`.
5. Renderizar `ExchangeModal` en multiplayer con `mpStore.players`, `mpStore.myPlayer`, `mpStore.propertyOwners`, `mpStore.propertyDevelopments` y `mpStore.exchangeProposal`.
6. Asegurar que eventos `trade_proposed` y `trade_responded` actualicen el store/snapshot y abran/cerren la UI correctamente.
7. Mejorar `difficultAuctionBid` para calcular valor estrategico:
   - bonus alto si completa grupo propio;
   - bonus medio si bloquea grupo rival;
   - limite por efectivo disponible y liquidez minima.
8. Disenar una funcion backend de propuesta de intercambio bot:
   - detectar propiedad faltante para completar grupo;
   - buscar propietario;
   - construir oferta razonable con dinero/propiedad;
   - validar con `CanProposeExchange`.
9. Agregar anti-spam:
   - cooldown global por bot;
   - cooldown por bot-target;
   - no proponer si existe intercambio activo;
   - no proponer mas de una vez por N turnos o N segundos;
   - maximo de renegociaciones.
10. Integrar propuestas de bots en `executeBotStep` solo cuando no haya subasta, carta activa, compra pendiente o movimiento.
11. Verificar manualmente el flujo usuario-usuario, usuario-bot y bot-usuario.
12. Ejecutar `npm run build` y, si Go esta disponible, `go test ./backend/internal/game ./backend/internal/table`.

## Acceptance Criteria

- [x] En multiplayer aparece un boton `Intercambio` dentro del sidebar de configuracion.
- [x] El boton abre el modal de intercambio reutilizando la experiencia del modo local.
- [x] Un usuario puede proponer intercambio a otro usuario o bot desde multiplayer.
- [x] Un usuario puede aceptar/rechazar una propuesta recibida.
- [x] Las propuestas se sincronizan para todos los usuarios conectados.
- [x] El bot dificil aumenta su disposicion a pujar si la propiedad subastada completa su grupo.
- [x] El bot dificil tambien puede pujar mas para bloquear que un rival complete grupo.
- [x] El bot dificil mantiene limites de liquidez y no sobrepuja por encima de un umbral razonable.
- [x] Los bots pueden proponer intercambios utiles para completar grupos.
- [x] Los bots no hacen spam: respetan cooldowns y no crean propuestas consecutivas molestas.
- [x] No se abre una propuesta bot si ya hay subasta, carta activa, movimiento en curso o intercambio pendiente.
- [x] `npm run build` pasa sin errores.
- [ ] Si Go esta disponible, los tests backend pasan. *(blocked: `go` y `gofmt` no estan disponibles en PATH en esta maquina)*

## Notes

La prioridad debe ser que el flujo de intercambio multiplayer reutilice la UX existente del modo local en vez de crear una UI paralela. Para la IA, conviene empezar con reglas deterministicas simples y transparentes antes de introducir aleatoriedad. El anti-spam debe vivir preferiblemente en `Table`, porque es estado runtime de la mesa y no necesariamente parte del snapshot publico.
