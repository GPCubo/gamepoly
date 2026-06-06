---
id: SPEC-011
title: Color por ficha y badge de moneda en TileCard
created_at: 2026-06-05T08:30:00
status: done
---

# SPEC-011: Color por ficha y badge de moneda en TileCard

## Description

Asociar un color a cada ficha de `TOKEN_MODELS` en `gameConfig.ts` y agregar un símbolo de moneda configurable (`CURRENCY_SYMBOL`) que se muestra como badge en la esquina inferior derecha de la tarjeta de TileCard cuando una propiedad/railroad/utility tiene dueño. El badge usa el color del jugador dueño.

Colores por ficha (en orden): rojo, azul, rosado, amarillo.

## Context and Motivation

Visualmente no hay forma de identificar al dueño de una propiedad directamente en la tarjeta TileCard sin leer el texto. Un badge con el símbolo de moneda del color del dueño permite identificar rápidamente quién compró cada casilla.

## Technical Analysis

### Estado actual

- **`config/gameConfig.ts:9-14`**: `TOKEN_MODELS` define `{ file, name, icon }` sin propiedad `color`
- **`components/TileCard.vue`**: Recibe `ownerId?: number` y `ownerName?: string`. Calcula `ownerState` ("own" | "other" | "free"). No muestra ningún indicador de color del dueño.
- **`pages/game.vue:189`**: Calcula `tileOwnerId` a partir de `store.propertyOwners[tile.index]` y lo pasa a TileCard como `:owner-id`
- **`stores/gameStore.ts:49`**: `propertyOwners: Record<number, number>` mapea `tileIndex → playerId`
- **No existe `CURRENCY_SYMBOL`** en la configuración
- **No existe `color`** en `TOKEN_MODELS` ni en `PlayerState`

### Flujo de datos propuesto

```
GAME_CONFIG.TOKEN_MODELS[id].color
  → game.vue: ownerId → players[ownerId].tokenModel → TOKEN_MODELS.find(t => t.file === tokenModel).color
  → prop ownerColor
  → TileCard: badge con CURRENCY_SYMBOL coloreado
```

## Implementation Plan

### Files to create

(Ninguno)

### Files to modify

- `config/gameConfig.ts` — Añadir `color` a cada entrada de `TOKEN_MODELS` y agregar `CURRENCY_SYMBOL`
- `components/TileCard.vue` — Añadir prop `ownerColor`, renderizar badge de moneda en esquina inferior derecha cuando la propiedad tiene dueño
- `pages/game.vue` — Calcular y pasar `ownerColor` como prop a `<TileCard>`

### Ordered Steps

1. Modificar `config/gameConfig.ts`: agregar `color` a cada TOKEN_MODELS entry y agregar `CURRENCY_SYMBOL`
2. Modificar `pages/game.vue`: calcular `ownerColor` y pasarlo como prop a `<TileCard>`
3. Modificar `components/TileCard.vue`: agregar prop `ownerColor`, renderizar badge de moneda en la tarjeta

## Acceptance Criteria

- [x] `TOKEN_MODELS` tiene propiedad `color` en cada entrada (rojo, azul, rosado, amarillo)
- [x] `GAME_CONFIG.CURRENCY_SYMBOL` existe con valor `"$"` por defecto
- [x] `TileCard` muestra un badge con el símbolo de moneda en la esquina inferior derecha cuando una propiedad/railroad/utility tiene dueño
- [x] El badge usa el color del jugador dueño
- [x] El badge no aparece en casillas sin dueño (ownerState === "free")
- [x] El badge no aparece en casillas tipo corner, tax, card (solo property/railroad/utility)

## Notes

- Los colores elegidos: `#ef4444` (rojo), `#3b82f6` (azul), `#ec4899` (rosado), `#eab308` (amarillo)
- El símbolo de moneda es configurable globalmente, no por ficha
- El badge es tipo pill/cápsula, no un banner completo
- Por ahora no se modifica GameOverlay ni el tablero 3D — solo TileCard