---
id: SPEC-003
title: Casilla Normalizada — Posicion 1-40 en la UI
created_at: 2026-05-18T20:30:00
status: done
---

# SPEC-003: Casilla Normalizada — Posicion 1-40 en la UI

## Description

La posicion de los jugadores (`currentPosition`, `player2Position`) incrementa sin limite a medida que avanzan por el tablero. Despues de dar una vuelta completa (40 casillas), la posicion sigue contando (41, 42, etc.) cuando lo que importa al jugador es saber en que casilla del tablero esta (1-40). Se necesita mostrar la casilla normalizada (`position % 40 + 1`) en la UI en vez del numero absoluto.

## Context and Motivation

`useBoardGeometry` ya usa `% 40` para calcular coordenadas visuales, pero el `GameOverlay` y `statusMessage` muestran el numero absoluto. En un juego de monopolio, dar la vuelta al tablero es parte normal del juego, y el jugador necesita saber que esta en la casilla 5, no en la 45. Sin esta correccion, la UI muestra numeros confusos despues de la primera vuelta.

## Technical Analysis

### Estado actual

- **`stores/gameStore.ts`**: `currentPosition` y `player2Position` incrementan sin limite. `movePlayer(steps)` suma directamente. No hay getter de casilla normalizada.
- **`components/GameOverlay.vue`**: Muestra `currentPosition` (prop) directamente en el status badge.
- **`pages/index.vue`**: Pasa `store.activePlayer === 1 ? store.currentPosition : store.player2Position` como `:current-position`.

### Cambios necesarios

1. **`gameStore.ts`**: Agregar getters `casillaActual` que devuelva `currentPosition % 40 + 1` (casilla 1-40) y `casilla2Actual` que devuelva `player2Position % 40 + 1`.
2. **`pages/index.vue`**: Pasar `store.activePlayer === 1 ? store.casillaActual : store.casilla2Actual` en vez de la posicion absoluta.
3. **`components/GameOverlay.vue`**: Asegurar que el status badge usa la prop `currentPosition` (que ahora sera normalizada).
4. **`stores/gameStore.ts`**: Actualizar `statusMessage` en los watchers para usar casilla normalizada.

## Implementation Plan

### Files to create

- (Ninguno)

### Files to modify

- `stores/gameStore.ts` — Agregar getters `casillaActual` y `casilla2Actual` que normalicen la posicion a 1-40
- `pages/index.vue` — Pasar `casillaActual` o `casilla2Actual` segun jugador activo como `:current-position`
- `components/GameOverlay.vue` — Actualizar status badge para mostrar "Casilla X/40" en vez de solo "Casilla X"

### Ordered Steps

1. Modificar `stores/gameStore.ts`: agregar getters `casillaActual` y `casilla2Actual` que devuelvan posicion normalizada (`% 40 + 1`)
2. Modificar `pages/index.vue`: cambiar `:current-position` para usar los getters normalizados
3. Modificar `components/GameOverlay.vue`: actualizar texto del status badge para mostrar casilla normalizada

## Acceptance Criteria

- [x] `gameStore.ts` tiene getter `casillaActual` que devuelve `currentPosition % 40 + 1` (rango 1-40)
- [x] `gameStore.ts` tiene getter `casilla2Actual` que devuelve `player2Position % 40 + 1` (rango 1-40)
- [x] `GameOverlay` muestra la casilla normalizada (1-40) en vez de la posicion absoluta
- [x] Despues de dar una vuelta completa, la casilla mostrada vuelve a 1 (no 41)
- [x] No se instalaron dependencias nuevas

## Notes

- Se usa `% 40 + 1` para que la casilla vaya de 1 a 40 (mas intuitivo para el jugador) en vez de 0 a 39.
- `useBoardGeometry` ya normaliza internamente con `% 40`, asi que las coordenadas 3D son correctas. Este spec solo afecta la UI.
- Los valores absolutos se conservan en `currentPosition` y `player2Position` porque se necesitan para calcular coordenadas y animaciones.