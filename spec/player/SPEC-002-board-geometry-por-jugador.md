---
id: SPEC-002
title: Board Geometry por Jugador — Cada Jugador con su useBoardGeometry
created_at: 2026-05-18T18:30:00
status: done
---

# SPEC-002: Board Geometry por Jugador — Cada Jugador con su useBoardGeometry

## Description

Refactorizar `useBoardGeometry` para que cada jugador tenga su propia instancia del composable, eliminando el parametro `playerIndex` de `getCasillaCoordinates`. En lugar de `getCasillaCoordinates(casilla, playerIndex)`, cada jugador obtendra su instancia con `useBoardGeometry(playerIndex)` y llamara `getCasillaCoordinates(casilla)` sin segundo argumento. El offset entre fichas se resuelve internamente por instancia.

## Context and Motivation

En player/SPEC-001 se agrego soporte para un segundo jugador (dedal) pasando `playerIndex` como segundo parametro a `getCasillaCoordinates`. Este enfoque escala mal: cada nuevo jugador agrega complejidad al punto de llamada y obliga a indexar manualmente. Al tener cada jugador su propia instancia de `useBoardGeometry`, la logica de offset se encapsula dentro del composable, y el codigo consumidor (`pages/index.vue`) queda mas limpio y escalable.

## Technical Analysis

### Estado actual

- **`composables/useBoardGeometry.ts`**: Retorna `getCasillaCoordinates(casillaIndex, playerIndex = 0)`. El offset se aplica via `applyOffset()` cuando `playerIndex !== 0`.
- **`pages/index.vue`**: Llama `getCasillaCoordinates(store.currentPosition, 0)` para el sombrero y `getCasillaCoordinates(store.player2Position, 1)` para el dedal. Usa una sola instancia: `const { getCasillaCoordinates } = useBoardGeometry()`.
- **`stores/gameStore.ts`**: Tiene `currentPosition` (player1) y `player2Position` (player2) como campos separados.

### Problemas del enfoque actual

1. **Acoplamiento en el consumidor**: `index.vue` debe recordar pasar el indice correcto en cada llamada.
2. **No escala**: Agregar un jugador 3 requiere recordar usar `playerIndex = 2` en todos los puntos de llamada.
3. **Duplicacion**: Los `watch` para player1 y player2 son casi identicos, cambiando solo el store field y el indice.

### Propuesta

`useBoardGeometry(playerIndex)` retorna una instancia con `getCasillaCoordinates(casillaIndex)` que ya incorpora el offset del jugador. Consumidores:

```ts
const player1Geo = useBoardGeometry(0);
const player2Geo = useBoardGeometry(1);

// En vez de:
// getCasillaCoordinates(casilla, 0) / getCasillaCoordinates(casilla, 1)
// Ahora:
player1Geo.getCasillaCoordinates(casilla)  // offset 0
player2Geo.getCasillaCoordinates(casilla)  // offset 0.12
```

### Riesgos

- Cambio de API: todos los call sites de `getCasillaCoordinates` deben actualizarse.
- El offset actual (`PLAYER_OFFSET = 0.12`) se mantiene igual, solo cambia donde se aplica.

## Implementation Plan

### Files to create

- (Ninguno)

### Files to modify

- `composables/useBoardGeometry.ts` — Recibir `playerIndex` como parametro del composable, eliminar segundo parametro de `getCasillaCoordinates`, aplicar offset internamente en la instancia
- `pages/index.vue` — Crear dos instancias de `useBoardGeometry` (player1Geo, player2Geo), actualizar todos los `getCasillaCoordinates` calls para usar la instancia correspondiente sin segundo parametro, simplificar los `watch`

### Ordered Steps

1. Modificar `composables/useBoardGeometry.ts`: cambiar `useBoardGeometry()` para aceptar `playerIndex` como parametro del factory, mover `applyOffset` dentro de la instancia retornada, eliminar el segundo parametro de `getCasillaCoordinates`
2. Modificar `pages/index.vue`: crear `const player1Geo = useBoardGeometry(0)` y `const player2Geo = useBoardGeometry(1)`, actualizar las llamadas en `onMounted` y los dos `watch` para usar cada instancia sin segundo parametro

## Acceptance Criteria

- [x] `useBoardGeometry(playerIndex)` acepta el indice del jugador como parametro del factory
- [x] `getCasillaCoordinates(casillaIndex)` ya no requiere segundo parametro
- [x] El offset entre fichas se aplica internamente segun `playerIndex` pasado al factory
- [x] `pages/index.vue` usa `player1Geo.getCasillaCoordinates()` y `player2Geo.getCasillaCoordinates()` sin segundo argumento
- [x] Las posiciones de ambas fichas en el tablero permanecen identicas al comportamiento actual (sin regresion visual)
- [x] No se instalaron dependencias nuevas

## Notes

- El offset `PLAYER_OFFSET = 0.12` se conserva con el mismo valor, solo cambia el lugar donde se aplica (dentro de la instancia vs. en el call site).
- Este refactor prepara el terreno para agregar mas jugadores sin modificar los call sites existentes.
- El `gameStore.ts` no se modifica en este spec; los campos `currentPosition` y `player2Position` permanecen igual.