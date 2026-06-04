---
id: SPEC-008
title: Separacion de Fichas en Misma Casilla y Escala Reducida
created_at: 2026-05-19T14:00:00
status: done
---

# SPEC-008: Separacion de Fichas en Misma Casilla y Escala Reducida

## Description

Cuando dos o mas fichas comparten la misma casilla del tablero, actualmente se superponen exactamente en la misma posicion (los `PLAYER_OFFSETS` en `useBoardGeometry.ts` son identicos para ambos jugadores). Se necesita:

1. **Separacion lateral**: Cuando ambos jugadores estan en la misma casilla, cada ficha se desplaza lateralmente una distancia configurable para no superponerse.
2. **Escala reducida**: Cuando hay mas de una ficha en la misma casilla, todas las fichas en esa casilla se reducen de tamano proporcionalmente (misma escala para todas las piezas).
3. **Archivo de configuracion**: Un archivo `config/gameConfig.ts` expone las constantes ajustables: distancia de separacion entre piezas (`SAME_TILE_SPACING`), escala cuando comparten casilla (`SHARED_TILE_SCALE`), y la escala por defecto (`DEFAULT_SCALE`).

## Context and Motivation

Modulo GAME del flujo de tablero y fichas. Actualmente en player/SPEC-005 se elimino el offset entre jugadores para que ambas fichas sigan el mismo camino. Esto provoca que cuando ambas estan en la misma casilla (ej. casilla 0 / GO), se superponen completamente. Se necesita separacion visual dinamica y escala reducida cuando comparten casilla, con valores configurables centralizados.

## Technical Analysis

### Estado actual

- **`composables/useBoardGeometry.ts`**: `PLAYER_OFFSETS[1]` y `PLAYER_OFFSETS[2]` son `{ x: -2.15, z: 2.15 }` identicos. No hay separacion real entre fichas.
- **`pages/index.vue`**: Ambas fichas tienen `:scale="1"` harcodeado en los `<primitive>`. No hay escala dinamica.
- **`stores/gameStore.ts`**: Tiene `currentPosition` (jugador 1) y `player2Position` (jugador 2). No hay logica de deteccion de casilla compartida.
- **No existe `config/`**: Ningun archivo de configuracion centralizado.

### Logica de deteccion

En cada render tick, se compara `store.currentPosition % 40` con `store.player2Position % 40`. Si coinciden, ambas fichas estan en la misma casilla.

### Calculo de offset

Cuando ambas fichas comparten casilla:
- Jugador 1: offset `{ x: -SAME_TILE_SPACING/2, z: -SAME_TILE_SPACING/2 }`
- Jugador 2: offset `{ x: +SAME_TILE_SPACING/2, z: +SAME_TILE_SPACING/2 }`

Esto las separa diagonalmente sobre la casilla. Cuando NO comparten casilla, el offset es `{ x: 0, z: 0 }`.

### Calculo de escala

- Cuando comparten casilla: todas las fichas usan `SHARED_TILE_SCALE`
- Cuando no comparten: cada ficha usa `DEFAULT_SCALE` (1.0)

### Donde aplicar la logica

- **Offset**: En `index.vue`, se detecta si comparten casilla y se aplica el offset al posicion final de cada ficha (restando/sumando `SAME_TILE_SPACING/2` en x y z).
- **Escala**: En `index.vue`, tener `computed` que determine la escala segun si comparten casilla, y bindear `:scale` al valor reactivo.

### Configuracion

Crear `config/gameConfig.ts` con constantes exportadas:

```typescript
export const GAME_CONFIG = {
  SAME_TILE_SPACING: 0.12,
  SHARED_TILE_SCALE: 0.75,
  DEFAULT_SCALE: 1.0,
} as const;
```

## Implementation Plan

### Files to create

- `config/gameConfig.ts` — Archivo de configuracion con constantes ajustables: `SAME_TILE_SPACING`, `SHARED_TILE_SCALE`, `DEFAULT_SCALE`

### Files to modify

- `composables/useBoardGeometry.ts` — Eliminar `PLAYER_OFFSETS` (resetearlos a `{0,0}` o eliminar la logica de offset por jugador, ya que la separacion se maneja dinamicamente en `index.vue`).
- `pages/index.vue` — Agregar logica de deteccion de casilla compartida, calcular offsets y escalas dinamicos, bindear `:scale` reactivo en los `<primitive>`, modificar posicion de fichas cuando comparten casilla.

### Ordered Steps

1. Crear `config/gameConfig.ts` con las constantes `SAME_TILE_SPACING`, `SHARED_TILE_SCALE`, `DEFAULT_SCALE`
2. Modificar `useBoardGeometry.ts` — eliminar `PLAYER_OFFSETS` y el segundo parametro `playerIndex` de `getCasillaCoordinates`, ya que la separacion ahora se maneja en `index.vue`
3. Modificar `pages/index.vue`:
   a. Importar `GAME_CONFIG` desde `config/gameConfig`
   b. Crear `computed` que detecte si ambas fichas comparten casilla (`isSharedTile`)
   c. Crear scalas reactivas `playerScale` y `player2Scale` basados en `isSharedTile`
   d. Aplicar offset de separacion en las coordenadas cuando comparten casilla
   e. Bindear `:scale` en los `<primitive>` a las escalas reactivas
   f. Actualizar llamadas a `getCasillaCoordinates` para quitar el segundo parametro `playerIndex`
4. Verificar que separacion y escala funcionen correctamente

## Acceptance Criteria

- [x] Cuando ambas fichas estan en la misma casilla, se separan lateralmente por `SAME_TILE_SPACING`
- [x] Cuando ambas fichas estan en la misma casilla, ambas se reducen a `SHARED_TILE_SCALE`
- [x] Cuando las fichas estan en casillas diferentes, cada una usa `DEFAULT_SCALE` y sin offset
- [x] La escala es la misma para todas las piezas que comparten la casilla (no hay pieza mas grande que otra)
- [x] Existe un archivo `config/gameConfig.ts` con las constantes ajustables
- [x] Los valores de configuracion se pueden cambiar editando solo `gameConfig.ts` sin tocar otra logica
- [x] No se agregan dependencias nuevas

## Notes

- Se descarta escalado diferenciado por tipo de pieza (sombrero vs dedal): el usuario especifico "el tamano de las piezas deben ser la misma para todas".
- La separacion diagonal (x y z con signos opuestos) fue elegida sobre la separacion unidimensional porque es visualmente mas clara en un tablero visto en perspectiva.
- El offset de `PLAYER_OFFSETS` existente en `useBoardGeometry.ts` (ambos `{-2.15, 2.15}`) es un residuo que debe eliminarse para que la separacion solo se aplique dinamicamente cuando comparten casilla.
- `SAME_TILE_SPACING: 0.12` y `SHARED_TILE_SCALE: 0.75` son valores iniciales sugeridos que se ajustaran visualmente.