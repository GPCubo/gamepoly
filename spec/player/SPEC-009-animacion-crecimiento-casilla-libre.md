---
id: SPEC-009
title: Animacion de Crecimiento al Llegar a Casilla Libre
created_at: 2026-05-19T15:30:00
status: done
---

# SPEC-009: Animacion de Crecimiento al Llegar a Casilla Libre

## Description

Actualmente (player/SPEC-008), cuando dos fichas comparten la misma casilla se reducen a `SHARED_TILE_SCALE` (0.5), y cuando se separan a casillas diferentes vuelven instantaneamente a `DEFAULT_SCALE` (1.0). Se necesita una **animacion de crecimiento suave** que haga que la ficha crezca de `SHARED_TILE_SCALE` a `DEFAULT_SCALE` al llegar a su nueva casilla, en vez de un cambio abrupto. La animacion debe durar un tiempo configurable y usar una curva de easing `easeOutBack` para un efecto visual de rebote suave.

## Context and Motivation

Modulo GAME del flujo de fichas. player/SPEC-008 implemento la escala reducida cuando fichas comparten casilla, pero el cambio de tamano es instantaneo (0.5 → 1.0 de un frame al otro), lo cual se ve abrupto y poco natural. Una animacion de crecimiento al llegar a la casilla destino dara una sensacion de "aterrizaje" mas pulida, complementando la animacion de hop de player/SPEC-006.

## Technical Analysis

### Estado actual

- **`pages/index.vue`** lineas 109-114: `playerScale` y `player2Scale` son `computed` que cambian instantaneamente entre `SHARED_TILE_SCALE` y `DEFAULT_SCALE` segun `isSharedTile`.
- **`config/gameConfig.ts`**: Define `SHARED_TILE_SCALE: 0.5` y `DEFAULT_SCALE: 1.0`.
- **`composables/usePieceAnimation.ts`**: Ya maneja animaciones por frame via `tick(deltaMs)`. Tiene `HOP_DURATION_MS = 250` y `HOP_HEIGHT = 0.15` para la animacion de salto.

### Enfoque propuesto

Agregar animacion de escala a `usePieceAnimation.ts`, integrandola en el sistema de tick por frame que ya existe:

1. Cuando `isSharedTile` cambia de `true` a `false` (ficha se separa), se inicia una animacion de crecimiento desde `SHARED_TILE_SCALE` hasta `DEFAULT_SCALE`.
2. La animacion usa `easeOutBack(t)` para un rebote suave al final.
3. Mientras la animacion de crecimiento esta activa, `tick()` interpola la escala frame a frame.
4. La escala se expone via `getCurrentScale(playerIndex)` y se usa en `index.vue` para bindear `:scale`.

### Funcion de easing

`easeOutBack(t) = 1 + 2.70158 * (t - 1)^3 + 1.70158 * (t - 1)^2`

Produce: t=0 → ~0.7 (empieza ligeramente arriba de SHARED_TILE_SCALE por el rebote anterior), t=1 → 1.0 exacto con un pequeno sobrepaso antes de estabilizarse.

### Flujos

- **Ficha comparte casilla** → escala cambia instantaneamente a `SHARED_TILE_SCALE` (sin animacion, se encoge de golpe)
- **Ficha se separa** → se inicia animacion de crecimiento de `SHARED_TILE_SCALE` a `DEFAULT_SCALE` con `easeOutBack`
- **Ficha ya esta sola al inicio** → escala es `DEFAULT_SCALE` (sin animacion necesaria)
- **Ficha creciendo y vuelve a compartir casilla** → animacion se cancela, escala vuelve instantaneamente a `SHARED_TILE_SCALE`

## Implementation Plan

### Files to create

- (Ninguno)

### Files to modify

- `config/gameConfig.ts` — Agregar `GROW_DURATION_MS: 300`
- `composables/usePieceAnimation.ts` — Agregar logica de animacion de escala por jugador: interfaz `GrowAnimation`, registro de scales, `startGrow(playerIndex)`, `getCurrentScale(playerIndex)`, logica de easing `easeOutBack` integrada en `tick()`
- `pages/index.vue` — Reemplazar `playerScale`/`player2Scale` computed estaticos por valores obtenidos de `getCurrentScale()` en `onRenderTick`, iniciar `startGrow()` cuando `isSharedTile` cambia de true a false via un `watch`, actualizar `:scale` en template

### Ordered Steps

1. Modificar `config/gameConfig.ts` — agregar `GROW_DURATION_MS: 300`
2. Modificar `composables/usePieceAnimation.ts` — agregar `GrowAnimation`, scales por jugador, `startGrow(playerIndex)`, `getCurrentScale(playerIndex)`, easing `easeOutBack` integrado en `tick()`
3. Modificar `pages/index.vue` — agregar `watch` sobre `isSharedTile` para iniciar `startGrow()` al separarse, usar `getCurrentScale()` en `onRenderTick` para escalar fichas, actualizar `:scale` en template

## Acceptance Criteria

- [x] Cuando una ficha se separa de una casilla compartida, crece suavemente de `SHARED_TILE_SCALE` a `DEFAULT_SCALE`
- [x] La animacion de crecimiento dura `GROW_DURATION_MS` milisegundos
- [x] La animacion usa `easeOutBack` como easing (rebote suave al final)
- [x] La escala se actualiza frame a frame sin saltos abruptos
- [x] Cuando una ficha llega a compartir casilla, se encoge instantaneamente a `SHARED_TILE_SCALE` (sin animacion)
- [x] `GROW_DURATION_MS` es configurable desde `gameConfig.ts`
- [x] No se agregan dependencias nuevas

## Notes

- Se descarta animar el encogimiento (de 1.0 a 0.5) porque el usuario pidio especificamente animacion al crecer, no al encogerse.
- `easeOutBack` fue elegido sobre `easeOutCubic` o `easeOutElastic` por dar un rebote sutil que comunica "aterrizaje" sin ser exagerado.
- La animacion de crecimiento es independiente de la animacion de hop (player/SPEC-006): pueden ocurrir simultaneamente sin interferir.
- Si una ficha ya esta creciendo y se vuelve a compartir casilla antes de terminar, la animacion se cancela y la escala vuelve instantaneamente a `SHARED_TILE_SCALE`.