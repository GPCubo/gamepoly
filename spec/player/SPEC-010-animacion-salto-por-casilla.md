---
id: SPEC-010
title: Animacion de Salto por Casilla para Fichas
created_at: 2026-05-19T12:00:00
status: done
---

# SPEC-010: Animacion de Salto por Casilla para Fichas

## Description

Actualmente, cuando una ficha se mueve de una casilla a otra, el movimiento es un **teleporte instantaneo**: el `watch` en `index.vue` asigna directamente las coordenadas destino sin interpolacion. Se necesita implementar una **animacion de salto por casilla** donde cada paso produzca un hop parabolico: la ficha se eleva, recorre horizontalmente, y aterriza en la casilla siguiente.

## Context and Motivation

El flujo actual:
1. `gameStore.movePlayer(steps)` itera casilla por casilla con `setTimeout(300ms)` 
2. Cada iteracion muta `store.currentPosition`
3. El `watch` reacciona y asigna instantaneamente coordenadas finales
4. Resultado: teleporte abrupto sin vida

## Technical Analysis

### Estado actual
- **`stores/gameStore.ts`**: Loop async con `await setTimeout(300)` por casilla
- **`pages/index.vue`**: `watch` asigna `playerPosition.x/y/z` directamente — sin interpolacion
- **`composables/useBoardGeometry.ts`**: `getCasillaCoordinates(casilla, playerIndex)` devuelve coordenadas 3D
- **Sin libreria de tweening** instalada como dependencia directa

### Recursos disponibles
- **`useLoop()`** de `@tresjs/core` o el `@loop` existente en `<TresCanvas>` para per-frame updates
- **`THREE.Vector3.lerp()`** para interpolacion lineal horizontal
- Interpolacion parabolica manual con `sin(PI * t)` para el arco Y

### Enfoque propuesto
1. El `watch` detecta cambio de casilla y calcula coordenadas destino, pero en lugar de asignarlas directamente, las almacena como **animacion activa**
2. En `onRenderTick`, se avanza la animacion frame a frame:
   - **Horizontal (X, Z)**: interpolacion lineal desde posicion actual hacia destino
   - **Vertical (Y)**: arco parabolico `ySuelo + HOP_HEIGHT * sin(PI * t)` donde `t` va de 0 a 1
3. Cuando `t = 1.0`, se fija la posicion destino y se marca como completada
4. Duracion del hop: `HOP_DURATION_MS = 250` (dejando 50ms de margen vs 300ms del store)

## Implementation Plan

### Files to create
- `composables/usePieceAnimation.ts` — Composable que gestiona animaciones pendientes:
  - `startHop(playerIndex, from, to)`: inicia un hop
  - `tick(deltaMs)`: avanza animaciones activas, actualiza posiciones
  - `getCurrentPosition(playerIndex)`: devuelve posicion animada actual
  - `isAnimating(playerIndex)`: flag de animacion en curso

### Files to modify
- `composables/useBoardGeometry.ts` — Exportar `ySuelo` como constante accesible
- `pages/index.vue` — Reemplazar asignacion directa en `watch` por `startHop()`, agregar `tick(delta)` en `onRenderTick`

### Ordered Steps
1. Crear `composables/usePieceAnimation.ts` con interfaz de animacion de hops
2. Modificar `useBoardGeometry.ts` para exportar `ySuelo`
3. Modificar `pages/index.vue`: importar `usePieceAnimation`, usar `startHop` en watches, llamar `tick` en `onRenderTick`
4. Ajustar `HOP_DURATION_MS` y `HOP_HEIGHT` para movimiento natural

## Acceptance Criteria

- [x] Cada paso entre casillas se anima con arco parabolico visible
- [x] La ficha sube, recorre horizontalmente y aterriza suavemente
- [x] Duracion < 300ms por casilla para no retrasar el store
- [x] No hay teleporte instantaneo — movimiento suave frame a frame
- [x] Ambas fichas (sombrero y dedal) se animan correctamente
- [x] Camara follow sigue funcionando durante la animacion
- [x] No se agregan dependencias nuevas

## Notes

- Se descarta gsap/tween.js para mantener el proyecto ligero
- `HOP_HEIGHT` sugerido: `0.15` (~18% de `ySuelo = 0.82`)
- `sin(PI * t)` produce: `t=0` → Y=ySuelo, `t=0.5` → Y=ySuelo+HOP_HEIGHT, `t=1` → Y=ySuelo
- El `gameStore` no se modifica: el loop de `setTimeout(300)` sigue igual