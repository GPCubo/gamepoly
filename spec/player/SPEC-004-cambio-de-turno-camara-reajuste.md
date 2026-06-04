---
id: SPEC-004
title: Cambio de Turno — Camara se Reajusta al Siguiente Jugador
created_at: 2026-05-18T20:00:00
status: done
---

# SPEC-004: Cambio de Turno — Camara se Reajusta al Siguiente Jugador

## Description

Cuando el jugador hace click en el boton "Siguiente", el juego debe cambiar al turno del siguiente jugador. La camara debe reajustarse para seguir la ficha del jugador activo. Actualmente la camara siempre sigue al jugador 1 (sombrero) y no existe el concepto de "jugador activo".

## Context and Motivation

En player/SPEC-001 se agrego una segunda ficha (dedal) y en player/SPEC-002 se refactorizo useBoardGeometry para soportar multiples jugadores. En player/SPEC-003 se agrego el boton "Siguiente" que emite `next-turn` pero `index.vue` no lo escucha. Se necesita completar el ciclo: al hacer click en "Siguiente", el turno cambia al otro jugador y la camara se mueve suavemente hacia su posicion.

## Technical Analysis

### Estado actual

- **`stores/gameStore.ts`**: Tiene `activePlayer` NO definido. `finishTurn()` solo resetea `isTurnComplete = false`. No togglea jugador.
- **`pages/index.vue`**: La camara siempre sigue `playerPosition` (jugador 1) en `onRenderTick`. `onDiceRoll` siempre llama `store.movePlayer(value)`. No escucha evento `next-turn`.
- **`components/GameOverlay.vue`**: Emite `next-turn` al hacer click en "Siguiente" pero `index.vue` no lo maneja.

### Cambios necesarios

1. **`gameStore.ts`**: Agregar `activePlayer: 1 | 2` (default 1). Modificar `finishTurn()` para togglear `activePlayer`. Actualizar `GameState`.
2. **`pages/index.vue`**: Escuchar `@next-turn` de `GameOverlay`. En `onRenderTick`, hacer que la camara siga al jugador activo (`playerPosition` o `player2Position`). En `onDiceRoll`, delegar al jugador activo. Conectar `onNextTurn` que llame `store.finishTurn()`.
3. **`components/GameOverlay.vue`**: Mostrar en el `status-badge` cual jugador esta activo ("Jugador 1: Sombrero" / "Jugador 2: Dedal").

## Implementation Plan

### Files to create

- (Ninguno)

### Files to modify

- `stores/gameStore.ts` — Agregar `activePlayer: 1 | 2` al estado y `GameState`. Modificar `finishTurn()` para togglear jugador activo.
- `pages/index.vue` — Escuchar `@next-turn`, hacer camara siga jugador activo en `onRenderTick`, delegar `onDiceRoll` al jugador activo, conectar `onNextTurn`.
- `components/GameOverlay.vue` — Mostrar jugador activo en `status-badge`.

### Ordered Steps

1. Modificar `stores/gameStore.ts`: agregar `activePlayer: 1 | 2` al estado y `GameState`, modificar `finishTurn()` para togglear `activePlayer`
2. Modificar `pages/index.vue`: agregar `@next-turn="onNextTurn"` en template, hacer que `onRenderTick` siga al jugador activo, delegar `onDiceRoll` segun jugador activo, agregar `onNextTurn`
3. Modificar `components/GameOverlay.vue`: mostrar jugador activo en `status-badge`

## Acceptance Criteria

- [x] `gameStore.ts` tiene `activePlayer` (1 o 2) que indica el jugador del turno actual
- [x] `finishTurn()` togglea `activePlayer` (1->2, 2->1) y resetea `isTurnComplete`
- [x] La camara sigue al jugador activo (`playerPosition` o `player2Position`) en `onRenderTick`
- [x] `onDiceRoll` mueve la ficha del jugador activo (`movePlayer` o `movePlayer2`)
- [x] `index.vue` escucha `@next-turn` y llama `store.finishTurn()`
- [x] `GameOverlay` muestra en el `status-badge` cual jugador esta activo
- [x] Al hacer click en "Siguiente", la camara se reajusta suavemente al otro jugador
- [x] No se instalaron dependencias nuevas

## Notes

- El lerp actual (0.05) ya produce una transicion suave, asi que al cambiar de jugador la camara se movera cinematicamente hacia la nueva posicion sin necesidad de animacion adicional.
- Se usa `1 | 2` en vez de `0 | 1` para ser mas intuitivo (Jugador 1 = Sombrero, Jugador 2 = Dedal).

## Bugs encontrados y corregidos durante validacion

### Bug: finishTurn() llamado dos veces (CORREGIDO)

`finishTurn()` se llamaba desde dos sitios: `GameOverlay.onNextTurnClick()` y `index.vue.onNextTurn()`. Al toggle `activePlayer` (1→2 y luego 2→1), el resultado neto era que `activePlayer` volvia a su valor original. Se elimino la llamada redundante en `GameOverlay`, dejando solo la de `index.vue`.

### Issue conocido: statusMessage no se resetea al cambiar de turno

Despues de hacer click en "Siguiente", el `statusMessage` queda en "🏃 Moviendo a casilla N..." del jugador anterior. No se resetea al nuevo turno. Se recomienda agregar `this.statusMessage = "¡Tu turno!";` en `finishTurn()` o manejarlo en el watch de `activePlayer`.

### Issue conocido: currentPosition siempre muestra jugador 1

El prop `currentPosition` que se pasa a `GameOverlay` es siempre `store.currentPosition` (jugador 1). Deberia mostrarse la posicion del jugador activo: `store.activePlayer === 1 ? store.currentPosition : store.player2Position`.