---
id: SPEC-004
title: Agregar Dedal al Tablero
created_at: 2026-05-18T18:00:00
status: done
---

# SPEC-004: Agregar Dedal al Tablero

## Description

Agregar el modelo 3D `dedal.glb` (thimble/dedal) como ficha de un segundo jugador en el tablero. Actualmente solo existe un jugador (`sombrero.glb`). El dedal debe posicionarse en el tablero con coordenadas reactivas independientes del sombrero, permitiendo que ambas fichas coexistan visualmente.

## Context and Motivation

El juego actualmente soporta un solo jugador (`sombrero.glb`) con una posicion (`currentPosition`). Para avanzar hacia un juego multijugador tipo monopolio, se necesita al menos una segunda ficha (`dedal.glb`) con su propio estado de posicion ymovimiento. El modelo `dedal.glb` ya existe en `public/models/` pero nunca se ha cargado.

## Technical Analysis

### Estado actual

- **`pages/index.vue`**: Carga `tablero.glb` y `sombrero.glb` via `GLTFLoader`. Renderiza un `<primitive>` con `playerPosition` reactivo.
- **`stores/gameStore.ts`**: `currentPosition: number` (una sola posicion), `movePlayer(steps)` anima casilla por casilla.
- **`composables/useBoardGeometry.ts`**: `getCasillaCoordinates(index)` mapea casilla → `{x, y, z}`. Cuando dos fichas estan en la misma casilla, se superponen.
- **Modelos disponibles**: `sombrero.glb` (en uso), `dedal.glb` (no cargado).

### Cambios necesarios

1. **`pages/index.vue`**: Cargar `dedal.glb` junto con los otros modelos. Agregar `shallowRef` para la escena del dedal y un segundo `<primitive>` con posicion reactiva independiente.
2. **`stores/gameStore.ts`**: Agregar `player2Position`, `isPlayer2Moving`, `movePlayer2(steps)` para estado independiente del jugador 2.
3. **`composables/useBoardGeometry.ts`**: Agregar soporte de offset para que dos fichas en la misma casilla no se superpongan (offset lateral pequeno).
4. **`pages/index.vue`**: Agregar `watch` en `store.player2Position` para mover el dedal reactivamente.

## Implementation Plan

### Files to create

- (Ninguno — solo se modifican archivos existentes)

### Files to modify

- `pages/index.vue` — Cargar dedal.glb, agregar shallowRef, segundo `<primitive>`, watch de player2Position
- `stores/gameStore.ts` — Agregar estado para player 2 (player2Position, isPlayer2Moving, movePlayer2)
- `composables/useBoardGeometry.ts` — Agregar parametro de offset para evitar superposicion de fichas

### Ordered Steps

1. Modificar `stores/gameStore.ts`: agregar `player2Position`, `isPlayer2Moving`, `movePlayer2(steps)`
2. Modificar `composables/useBoardGeometry.ts`: agregar soporte de offset por jugador para evitar superposicion
3. Modificar `pages/index.vue`: cargar `dedal.glb`, crear `dedalScene` shallowRef, renderizar segundo `<primitive>`, agregar `watch` para `store.player2Position`
4. Verificar que ambas fichas se renderizan y se mueven independientemente

## Acceptance Criteria

- [x] `dedal.glb` se carga correctamente en `onMounted` junto con los otros modelos
- [x] `gameStore.ts` tiene estado independiente para player 2 (`player2Position`, `isPlayer2Moving`, `movePlayer2`)
- [x] El dedal se renderiza en el tablero como segundo `<primitive>` con posicion reactiva propia
- [x] `useBoardGeometry.ts` soporta offset para evitar superposicion cuando ambas fichas comparten casilla
- [x] Una ficha se puede mover sin afectar la posicion de la otra
- [x] No se instalaron dependencias nuevas

## Notes

- El dedal es una fase inicial de multijugador: por ahora solo se posiciona en casilla 0 (SALIDA). El movimiento del jugador 2 se activara via UI en specs futuros.
- Los offsets de superposicion seran pequenos (~0.1 unidades) para que ambas fichas sean visibles en la misma casilla.
- El sombrero se considera player 1 y el dedal player 2. Los nombres siguen la convencion Monopoly clasica.