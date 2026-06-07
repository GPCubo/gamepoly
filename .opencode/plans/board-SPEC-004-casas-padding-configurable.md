# Plan: board/SPEC-004 - Casas encima del nombre con padding configurable

## Spec File to Create

**Path:** `./spec/board/SPEC-004-casas-encima-del-nombre-con-padding-configurable.md`

```markdown
---
id: SPEC-004
title: Casas encima del nombre con padding configurable
created_at: 2026-06-06T12:00:00
status: draft
---

# SPEC-004: Casas encima del nombre con padding configurable

## Description

Las casas (modelos 3D tipo "casa" y "hotel") actualmente flotan sobre el tablero sin relación visual clara con la etiqueta del nombre de la propiedad. Deben posicionarse **encima de la etiqueta del nombre** (en el eje Y) con un padding vertical configurable que separe la parte superior de la etiqueta de la base de la casa.

## Context and Motivation

En el tablero 3D actual, las etiquetas de propiedades son planos (TresPlaneGeometry) acostados sobre la superficie del tablero en `y = Y_SUELO + LABEL_Y_OFFSET`. Las casas se posicionan en `y = Y_SUELO + BUILD_Y_OFFSET + defaultYOffset`, donde `BUILD_Y_OFFSET` es un valor fijo de `0.015` que no tiene en cuenta la altura visual de la etiqueta ni proporciona un espacio configurado. Esto hace que las casas parezcan "flotar" sobre el tablero sin apoyarse visualmente encima del nombre de la propiedad, lo cual confunde al jugador y rompe la jerarquía visual.

Este spec resuelve ese problema haciendo que el Y de las casas derive de la posición de la etiqueta más un padding configurable.

## Technical Analysis

### Y actual de etiquetas

- Las etiquetas se posicionan en `y = Y_SUELO + LABEL_Y_OFFSET` (`useBoardGeometry.ts:323`).
- `LABEL_Y_OFFSET = 0.0` en `gameConfig.ts:23`.
- `Y_SUELO = 0.82`.
- El plano de etiqueta mide `LABEL_PLANE_HEIGHT = 0.18` pero está rotado `-π/2` en X, por lo que su extensión vertical en Y es despreciable (es un plano fino acostado).

### Y actual de casas

- `BUILD_Y_OFFSET = LABEL_Y_OFFSET + 0.015 = 0.015` (`useBoardGeometry.ts:98`).
- Cada casa añade `defaultYOffset` (0.015 casa, 0.02 hotel) desde `boardHouseAssets.ts`.
- Posición final Y de una casa: `Y_SUELO + BUILD_Y_OFFSET + defaultYOffset ≈ 0.82 + 0.015 + 0.015 = 0.85`.

### Problema

- `BUILD_Y_OFFSET` no tiene en cuenta que la etiqueta tiene un área visible (ancho/alto del canvas). Aunque el plano sea fino, la etiqueta visualmente "ocupa" el espacio desde la superficie del tablero hasta `Y_SUELO` (todo el relief), y las casas deberían empezar **después** de ese espacio con un padding configurable.
- El valor `0.015` es un hardcode que no se puede ajustar sin tocar código.

### Solución propuesta

1. Agregar `HOUSE_LABEL_PADDING` a `gameConfig.ts` — un valor configurable que representa la distancia vertical entre la parte superior del nombre de la propiedad y la base de la casa.
2. Recalcular `BUILD_Y_OFFSET` en `useBoardGeometry.ts` usando `LABEL_Y_OFFSET + HOUSE_LABEL_PADDING` en lugar de `LABEL_Y_OFFSET + 0.015`.
3. Los `defaultYOffset` de los modelos GLB (`boardHouseAssets.ts`) permanecen igual — ajustan la base del modelo al plano de asentamiento.

### Dependencias

- `board/SPEC-002` — etiquetas de propiedades en tablero 3D.
- `board/SPEC-003` — modelos 3D de casas y hoteles.
- `gameConfig.ts` — configuración centralizada.

## Implementation Plan

### Files to create

Ninguno.

### Files to modify

- `config/gameConfig.ts` — Agregar constante `HOUSE_LABEL_PADDING`.
- `composables/useBoardGeometry.ts` — Cambiar `BUILD_Y_OFFSET` para que use `HOUSE_LABEL_PADDING` en lugar de `0.015` hardcodeado.

### Ordered Steps

1. Agregar `HOUSE_LABEL_PADDING: 0.02` (valor por defecto razonable) en `config/gameConfig.ts`.
2. En `composables/useBoardGeometry.ts`, reemplazar `const BUILD_Y_OFFSET = GAME_CONFIG.LABEL_Y_OFFSET + 0.015;` por `const BUILD_Y_OFFSET = GAME_CONFIG.LABEL_Y_OFFSET + GAME_CONFIG.HOUSE_LABEL_PADDING;`.
3. Verificar visualmente que las casas aparezcan encima del nombre de la propiedad con el padding esperado.
4. Ajustar `HOUSE_LABEL_PADDING` si es necesario hasta que la separación se vea correcta.

## Acceptance Criteria

- [ ] Las casas ya no flotan; se posicionan encima del nombre de la propiedad con separación visible.
- [ ] El padding vertical entre etiqueta y casa es configurable desde `GAME_CONFIG.HOUSE_LABEL_PADDING`.
- [ ] El cambio aplica tanto a casas (buildCount 1-3) como a hoteles.
- [ ] El valor `0.015` hardcodeado ya no existe en `useBoardGeometry.ts`.
- [ ] Un cambio en `HOUSE_LABEL_PADDING` se refleja inmediatamente en la posición Y de todas las casas y hoteles del tablero.

## Notes

- El valor por defecto `0.02` para `HOUSE_LABEL_PADDING` puede ajustarse tras pruebas visuales. Lo importante es que sea configurable sin cambiar código fuente.
- Este spec no modifica la posición XZ de las casas — solo el eje Y. La distribución horizontal de múltiples casas por casilla se mantiene igual.
- Si en el futuro se implementa elevación de etiquetas (Y > 0), `BUILD_Y_OFFSET` se ajustará automáticamente porque depende de `LABEL_Y_OFFSET`.
```

## Implementation Changes

### 1. `config/gameConfig.ts` — Add HOUSE_LABEL_PADDING

```typescript
// Add after LABELCorNER_INWARD_OFFSET (line 31):
HOUSE_LABEL_PADDING: 0.02,
```

### 2. `composables/useBoardGeometry.ts` — Replace hardcoded 0.015

**Current (line 98):**
```typescript
const BUILD_Y_OFFSET = GAME_CONFIG.LABEL_Y_OFFSET + 0.015;
```

**New:**
```typescript
const BUILD_Y_OFFSET = GAME_CONFIG.LABEL_Y_OFFSET + GAME_CONFIG.HOUSE_LABEL_PADDING;
```

## Verification

After implementing, run the dev server and check that:
1. Houses sit visually above property name labels
2. The gap between label and house is visible and matches `HOUSE_LABEL_PADDING` value
3. Adjusting `HOUSE_LABEL_PADDING` in `gameConfig.ts` changes the vertical position of all houses