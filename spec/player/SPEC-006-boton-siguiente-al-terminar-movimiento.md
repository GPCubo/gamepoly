---
id: SPEC-006
title: Boton Siguiente — Aparece al Terminar Movimiento
created_at: 2026-05-18T19:00:00
status: done
---

# SPEC-006: Boton Siguiente — Aparece al Terminar Movimiento

## Description

Agregar un boton "Siguiente" en `GameOverlay.vue` que aparece automaticamente cuando el jugador termina de moverse despues de tirar dados. El boton se posiciona:

1. Debajo del contenedor `.status-badge` (Casilla Actual)
2. Encima de los 2 botones existentes ("Tirar Dados" y "Camara Libre")
3. Alineado horizontalmente (centrado en su propia fila)

El boton solo es visible cuando el turno esta completo: dados tirados y movimiento finalizado. Al hacer click, emite un evento `next-turn` para que el componente padre maneje la logica del siguiente turno.

## Context and Motivation

Actualmente el flujo de juego no tiene transicion explicita entre turnos. Despues de tirar dados y moverse, el jugador queda en estado pasivo sin indicacion visual de que el turno termino. Se necesita un boton "Siguiente" que:

- Solo aparezca cuando `isMoving` pasa de `true` a `false` despues de una tirada
- No aparezca en el estado inicial (antes de la primera tirada)
- Desaparezca al hacer click (para ceder el turno)
- Se ubique visualmente entre el badge de estado y los botones de accion

## Technical Analysis

### Estado actual

- **`components/GameOverlay.vue`**: Contiene `.overlay-container` con `.status-badge` y `.action-buttons` (Tirar Dados + Camara). No existe boton "Siguiente".
- **`stores/gameStore.ts`**: Tiene `isMoving`, `isDiceRolling`, `isDiceVisible`. No hay estado de "turno completo".
- **`pages/index.vue`**: Escucha `@roll` de GameOverlay y llama `store.movePlayer(value)`.

### Flujo de estados deseado

```
Estado inicial:
  - Tirar Dados: habilitado
  - Siguiente: oculto

Tirando dados (click):
  - Tirar Dados: deshabilitado ("Rodando..." / "Moviendo...")
  - Siguiente: oculto

Movimiento terminado (isMoving -> false tras tirada):
  - Tirar Dados: deshabilitado
  - Siguiente: visible

Click en Siguiente:
  - Emite evento "next-turn"
  - Siguiente: oculto
  - Tirar Dados: habilitado
```

### Propuesta de estado

Agregar `isTurnComplete: boolean` al store:

- `false` inicialmente y despues de click en "Siguiente"
- `true` cuando `isMoving` cambia de `true` a `false` tras una tirada

Esto se logra seteando `isTurnComplete = true` al final de `movePlayer()` / `movePlayer2()` y reseteandolo con una nueva accion `finishTurn()`.

### Layout visual resultante

```
[  Casilla Actual: 5 | Estado: ¡Todo listo!  ]   <- status-badge
[              Siguiente                        ]   <- NUEVO (solo tras movimiento)
[  Tirar Dados ]  [ Cámara: Libre ]             ]   <- action-buttons
```

## Implementation Plan

### Files to create

- (Ninguno)

### Files to modify

- `stores/gameStore.ts` — Agregar `isTurnComplete: boolean` al estado. Set `isTurnComplete = true` al final de `movePlayer()` y `movePlayer2()`. Agregar accion `finishTurn()` que reset `isTurnComplete = false`.
- `components/GameOverlay.vue` — Agregar boton "Siguiente" con `v-if="store.isTurnComplete"` entre `.status-badge` y `.action-buttons`. Emitir evento `next-turn` al hacer click. Agregar deshabilitacion de "Tirar Dados" mientras `isTurnComplete === true`. Agregar estilos del boton.

### Ordered Steps

1. Modificar `stores/gameStore.ts`: agregar `isTurnComplete` al estado y `GameState`, set `isTurnComplete = true` al final de `movePlayer()` y `movePlayer2()`, agregar accion `finishTurn()` que resetea `isTurnComplete = false`
2. Modificar `components/GameOverlay.vue`: agregar boton "Siguiente" con `v-if="store.isTurnComplete"` entre `.status-badge` y `.action-buttons`, emitir `next-turn` al hacer click, agregar `store.isTurnComplete` como condicion adicional de deshabilitacion en "Tirar Dados", agregar estilos del boton

## Acceptance Criteria

- [x] `gameStore.ts` tiene `isTurnComplete` que es `true` cuando el jugador termino de moverse tras una tirada
- [x] `gameStore.ts` tiene accion `finishTurn()` que resetea `isTurnComplete` a `false`
- [x] El boton "Siguiente" aparece debajo de `.status-badge` y encima de `.action-buttons`
- [x] El boton "Siguiente" solo es visible cuando `store.isTurnComplete === true`
- [x] Al hacer click en "Siguiente" se emite el evento `next-turn`
- [x] El boton "Siguiente" desaparece tras hacer click (llamando `store.finishTurn()`)
- [x] El boton "Tirar Dados" permanece deshabilitado mientras `isTurnComplete === true`
- [x] No se instalaron dependencias nuevas

## Notes

- Por ahora "Siguiente" solo resetea el estado del turno. La logica de cambio de jugador (player1 -> player2) se implementara en un spec futuro.
- Color sugerido para el boton: azul (#3b82f6) para diferenciarlo de "Tirar Dados" (verde #10b981) y "Camara" (gris #4b5563).
- El boton usa el mismo estilo base `.action-btn` para mantener consistencia visual.