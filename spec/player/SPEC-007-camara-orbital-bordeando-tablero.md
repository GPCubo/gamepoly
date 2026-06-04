---
id: SPEC-007
title: Camara Orbital Bordeando el Tablero
created_at: 2026-05-19T13:00:00
status: done
---

# SPEC-007: Camara Orbital Bordeando el Tablero

## Description

La camara de seguimiento actual se posiciona directamente encima y detras del jugador activo (`position.x = player.x`, `position.y = player.y + 1.61`, `position.z = player.z + 3.66`), lo que resulta en una vista donde la camara "se monta" sobre el tablero en vez de bordearlo. Se necesita un sistema de camara que orbite entorno al borde del tablero, manteniendo al jugador activo como foco pero permitiendo ver el centro del tablero de fondo, como si la camara caminara alrededor del perimetro del tablero siguiendo al jugador.

## Context and Motivation

El modulo GAME del flujo de tablero. Cuando el jugador se mueve por las casillas del perimetro, la camara deberia acompanarlo desde afuera del tablero, no desde arriba. Actualmente el efecto es como ver el tablero desde arriba en primera persona sobre la ficha, lo cual oculta la perspectiva global del tablero y las otras fichas. Una camara orbital que rodea el tablero daria una experiencia mas similar a un juego de mesa real.

player/SPEC-004 ya implemento el cambio de camara al jugador activo con lerp suave. Este spec refactoriza la logica de posicion de camara para que en vez de montarse sobre el jugador, orbite alrededor del borde del tablero.

## Technical Analysis

### Estado actual de la camara

En `pages/index.vue`, funcion `onRenderTick`:

```typescript
controls.target.x = activePosition.x;
controls.target.y = activePosition.y;
controls.target.z = activePosition.z;

const targetCamX = activePosition.x;
const targetCamY = activePosition.y + 1.61;
const targetCamZ = activePosition.z + 3.66;
```

Problemas:
1. La camara esta en la misma X que el jugador → mira de frente, se monta sobre el tablero
2. El offset `+3.66` en Z es fijo → no rota cuando el jugador esta en otro lado del tablero
3. `position.y + 1.61` es muy bajo → vista casi cenital, pierde profundidad
4. No hay relacion entre la posicion de la camara y el lado del tablero donde esta el jugador

### Geometria del tablero

El tablero es un cuadrado con casillas en el perimetro. `useBoardGeometry.ts` define:

| Lado | Casillas | Direccion desde centro | Camara ubicada |
|---|---|---|---|
| Inferior | 0-9 | +Z | Fuera en +Z, mirando hacia -Z |
| Derecho | 10-19 | +X | Fuera en +X, mirando hacia -X |
| Superior | 20-29 | -Z | Fuera en -Z, mirando hacia +Z |
| Izquierdo | 30-39 | -X | Fuera en -X, mirando hacia +X |

Centro del tablero aprox: `x ≈ 2.1`, `z ≈ -2.1` (basado en `inicioX=0.1`, `inicioZ=-0.1`, `pasoCasilla=0.4`, 10 casillas por lado).

### Enfoque propuesto: camara orbital al borde

Para cada lado del tablero, la camara se posiciona fuera del tablero, mirando hacia adentro:

1. Determinar en que lado del tablero esta la casilla del jugador
2. Alinear la coordenada paralela al lado con la del jugador (para acompanar lateralmente)
3. La coordenada perpendicular se fija a una distancia constante del centro del tablero
4. Altura fija `CAM_HEIGHT` sobre el tablero para perspectiva consistente
5. `controls.target` apunta al jugador activo (no al centro), para que la ficha permanezca centrada

Constantes propuestas:

```typescript
const BOARD_CENTER_X = 2.1;
const BOARD_CENTER_Z = -2.1;
const CAM_DISTANCE = 6.0;
const CAM_HEIGHT = 4.5;
const CAM_LERP = 0.04;
```

### Logica de posicion por lado

```typescript
function getCameraPosition(casillaIndex: number, playerPos: {x: number, z: number}) {
  const normalizedIndex = casillaIndex % 40;

  if (normalizedIndex < 10) {
    // Lado inferior: camara afuera en +Z, acompana en X
    return { x: playerPos.x, y: CAM_HEIGHT, z: BOARD_CENTER_Z + CAM_DISTANCE };
  } else if (normalizedIndex < 20) {
    // Lado derecho: camara afuera en +X, acompana en Z
    return { x: BOARD_CENTER_X + CAM_DISTANCE, y: CAM_HEIGHT, z: playerPos.z };
  } else if (normalizedIndex < 30) {
    // Lado superior: camara afuera en -Z, acompana en X
    return { x: playerPos.x, y: CAM_HEIGHT, z: BOARD_CENTER_Z - CAM_DISTANCE };
  } else {
    // Lado izquierdo: camara afuera en -X, acompana en Z
    return { x: BOARD_CENTER_X - CAM_DISTANCE, y: CAM_HEIGHT, z: playerPos.z };
  }
}
```

El lerp existente se mantiene para transiciones suaves entre posiciones de camara.

## Implementation Plan

### Files to create

- `composables/useCameraOrbit.ts` — Composable que calcula la posicion de camara orbital segun la casilla activa. Contiene:
  - Constantes: `BOARD_CENTER_X`, `BOARD_CENTER_Z`, `CAM_DISTANCE`, `CAM_HEIGHT`, `CAM_LERP`
  - `getCameraPosition(casillaIndex, playerPosition)`: devuelve `{x, y, z}` posicion objetivo de la camara
  - `getSideIndex(casillaIndex)`: devuelve 0-3 segun el lado del tablero

### Files to modify

- `pages/index.vue` — Reemplazar la logica de posicion de camara en `onRenderTick` con llamadas a `useCameraOrbit`. Mantener `controls.target` apuntando al jugador activo y el lerp existente, pero cambiar como se calcula `targetCamX/Y/Z`.

### Ordered Steps

1. Crear `composables/useCameraOrbit.ts` con la logica de posicion orbital
2. Modificar `pages/index.vue` para importar y usar `useCameraOrbit` en `onRenderTick`, reemplazando los calculos actuales de `targetCamX/Y/Z`
3. Ajustar constantes `CAM_DISTANCE`, `CAM_HEIGHT` y `CAM_LERP` visualmente hasta lograr la perspectiva deseada

## Acceptance Criteria

- [x] La camara se posiciona fuera del tablero, no sobre el tablero
- [x] El jugador activo permanece como foco (centro de pantalla)
- [x] El centro del tablero es visible de fondo en la escena
- [x] La camara orbita suavemente alrededor del tablero acompanando al jugador
- [x] Las transiciones entre lados del tablero son suaves (lerp)
- [x] El comportamiento de OrbitControls manual se mantiene desactivado durante cam follow
- [x] No se agregan dependencias nuevas

## Notes

- Se descarta una camara completamente libre (sin follow) porque el usuario ya tiene el toggle de camara libre/fija
- Se descarta una camara que siga al jugador 1:1 desde arriba por ser el problema actual
- Las constantes `BOARD_CENTER_X` y `BOARD_CENTER_Z` se pueden calcular dinamicamente a partir de `useBoardGeometry`, pero se prefieren constantes para rendimiento
- `CAM_DISTANCE` y `CAM_HEIGHT` se ajustaran visualmente. Valores iniciales: 6.0 y 4.5 respectivamente
- Los limites de `OrbitControls` (minDistance, maxDistance, minPolarAngle, maxPolarAngle) podrian necesitar ajuste para evitar que el usuario vuelva a montarse sobre el tablero en modo libre. Esto queda como mejora futura fuera de este spec