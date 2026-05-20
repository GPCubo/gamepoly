---
id: SPEC-009
title: Trayecto Unico — Fichas Comparten el Mismo Camino
created_at: 2026-05-18T21:00:00
status: done
---

# SPEC-009: Trayecto Unico — Fichas Comparten el Mismo Camino

## Description

Todas las fichas del tablero deben seguir exactamente el mismo trayecto. Actualmente `useBoardGeometry(playerIndex)` aplica un offset (`PLAYER_OFFSET = 0.12`) al jugador 2, desplazandolo ligeramente del camino del jugador 1. Se necesita eliminar el offset para que ambas fichas compartan las mismas coordenadas cuando estan en la misma casilla. El parametro `playerIndex` se mantiene como opcional (por defecto no recibe nada) para uso futuro, pero por ahora no afecta el resultado.

## Context and Motivation

En SPEC-005 se refactorizo `useBoardGeometry` para aceptar `playerIndex` como parametro del factory, con el objetivo de separar las coordenadas de cada jugador. Sin embargo, el usuario prefiere que todas las fichas sigan el mismo camino sin desplazamiento lateral. La superposicion visual cuando dos fichas estan en la misma casilla es aceptable por ahora.

## Technical Analysis

### Estado actual

- **`composables/useBoardGeometry.ts`**: Acepta `playerIndex: number = 0`, aplica `PLAYER_OFFSET = 0.12` cuando `playerIndex !== 0`.
- **`pages/index.vue`**: Usa dos instancias: `useBoardGeometry(0)` y `useBoardGeometry(1)`, llamando `player1Geo.getCasillaCoordinates()` y `player2Geo.getCasillaCoordinates()`.

### Cambios necesarios

1. **`useBoardGeometry.ts`**: Eliminar `PLAYER_OFFSET`, `applyOffset()`. La firma queda `useBoardGeometry(_playerIndex?: number)` — parametro opcional, por defecto sin valor, no afecta el resultado. `getCasillaCoordinates` siempre devuelve coordenadas sin offset.
2. **`pages/index.vue`**: Reemplazar las dos instancias por una sola `const { getCasillaCoordinates } = useBoardGeometry()`. Actualizar los watchers para usar la misma funcion sin segundo argumento.

## Implementation Plan

### Files to create

- (Ninguno)

### Files to modify

- `composables/useBoardGeometry.ts` — Eliminar `PLAYER_OFFSET`, `applyOffset()`, hacer `playerIndex` opcional sin efecto
- `pages/index.vue` — Usar una sola instancia `useBoardGeometry()`, actualizar llamadas a `getCasillaCoordinates()`

### Ordered Steps

1. Modificar `composables/useBoardGeometry.ts`: eliminar `PLAYER_OFFSET`, `applyOffset()`, cambiar firma a `(_playerIndex?: number)`, `getCasillaCoordinates` devuelve coords sin offset
2. Modificar `pages/index.vue`: reemplazar `player1Geo` y `player2Geo` por una sola instancia `const { getCasillaCoordinates } = useBoardGeometry()`, actualizar llamadas en `onMounted` y watchers

## Acceptance Criteria

- [x] `useBoardGeometry()` funciona sin parametros (por defecto)
- [x] No se aplica offset — ambas fichas siguen el mismo trayecto
- [x] `index.vue` usa una sola instancia de `useBoardGeometry()`
- [x] Ambas fichas se posicionan en las mismas coordenadas cuando estan en la misma casilla
- [x] No se instalaron dependencias nuevas

## Notes

- El parametro `_playerIndex?` se mantiene en la firma para compatibilidad futura, pero no tiene efecto actualmente. Se usa `_` como prefijo para indicar que no se utiliza.
- La superposicion de fichas en la misma casilla es aceptable por ahora. Un futuro spec podria reintroducir el offset si se desea separacion visual.