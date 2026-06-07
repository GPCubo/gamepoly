---
id: SPEC-004
title: Casas con offsets locales hacia el centro
created_at: 2026-06-06T12:00:00
status: done
---

# SPEC-004: Casas con offsets locales hacia el centro

## Description

Las casas y hoteles deben poder ajustarse con offsets que entiendan la orientacion de cada lado del tablero. Un offset global `x/z` mueve igual en coordenadas del mundo, pero no significa "hacia el centro" en todos los lados. Por eso se agregan offsets locales:

- `inwardOffset` - positivo mueve hacia el centro del tablero desde cualquier lado.
- `alongOffset` - mueve a lo largo del lado de la casilla.

Se mantienen `xOffset`, `yOffset` y `zOffset` como ajustes absolutos finos.

## Context and Motivation

El tablero tiene cuatro lados con orientaciones distintas. En el lado inferior, un `z` negativo puede mover una casa hacia el centro; en otro lado, ese mismo `z` la mueve hacia un costado. Para ajustar casas/hoteles de forma intuitiva se necesita una configuracion relativa al lado de la propiedad, no solo coordenadas globales.

## Technical Analysis

### Configuracion de offsets

- `BoardHouseAssetDefinition` define offsets globales por tipo de asset:
  - `defaultInwardOffset`
  - `defaultAlongOffset`
  - `defaultXOffset`
  - `defaultYOffset`
  - `defaultZOffset`
- `BoardHouseAssetPlacement` permite offsets puntuales:
  - `inwardOffset`
  - `alongOffset`
  - `xOffset`
  - `yOffset`
  - `zOffset`
- `useBoardGeometry.ts` expone `getBoardLocalOffset(tileIndex, inwardOffset, alongOffset)`.
- `useBoardGeometry.ts` tambien define `getBuildYaw(side)` para orientar el frente de casas/hoteles segun el lado.
- La ranura base de cada propiedad usa el centro real de esa casilla, para que casas y hoteles queden centrados horizontalmente respecto a su propiedad y no respecto al grupo completo.
- Cuando hay varias casas, `getPropertyBuildingSlots` reparte hasta 4 posiciones simetricas a lo largo de la casilla para evitar superposicion y mantener el conjunto centrado.
- `pages/game.vue` calcula la posicion final sumando:
  - posicion base del slot
  - offset local convertido a X/Z segun lado
  - offset absoluto `x/y/z`

### Rotacion por lado

- Lado 1 / inferior (`side === 0`): `0`.
- Lado 2 / derecho (`side === 1`): `Math.PI / 2`.
- Lado 3 / superior (`side === 2`): `Math.PI`.
- Lado 4 / izquierdo (`side === 3`): `-Math.PI / 2`.

La puerta/frente debe mirar hacia fuera de la propiedad, no hacia el centro del tablero.

### Uso esperado

- Para mover todas las casas hacia el centro, editar `casa.defaultInwardOffset`.
- Para mover todos los hoteles hacia el centro, editar `hotel.defaultInwardOffset`.
- Para mover modelos a lo largo de su lado, editar `defaultAlongOffset`.
- Para microajustes absolutos, usar `defaultXOffset` o `defaultZOffset`.

## Implementation Plan

### Files to create

Ninguno.

### Files to modify

- `config/boardHouseAssets.ts` - Agregar offsets locales y absolutos a definiciones/placements.
- `composables/useBoardGeometry.ts` - Agregar conversion side-aware con `getBoardLocalOffset`.
- `pages/game.vue` - Sumar offsets locales y absolutos al transform final.

### Ordered Steps

1. Extender `BoardHouseAssetPlacement` con `inwardOffset` y `alongOffset`.
2. Extender `BoardHouseAssetDefinition` con `defaultInwardOffset` y `defaultAlongOffset`.
3. Agregar `getBoardLocalOffset` en `useBoardGeometry.ts`.
4. Convertir `inwardOffset` con `applyTileDepthOffset`.
5. Convertir `alongOffset` con `applySideLengthOffset`.
6. Aplicar el offset local en `pages/game.vue`.
7. Mantener `xOffset/yOffset/zOffset` para ajustes absolutos.
8. Ajustar `getBuildYaw` para que los lados 2 y 4 no miren hacia el centro.
9. Centrar `getPropertyBuildSlot` sobre la propiedad individual.
10. Separar hasta 4 casas con ranuras simetricas dentro de la propiedad.
11. Verificar build.

## Acceptance Criteria

- [x] Un `defaultInwardOffset` positivo mueve casas/hoteles hacia el centro en cualquier lado del tablero.
- [x] `defaultAlongOffset` mueve casas/hoteles a lo largo del lado correspondiente.
- [x] `defaultYOffset` sigue controlando altura.
- [x] `defaultXOffset` y `defaultZOffset` siguen disponibles como offsets absolutos.
- [x] El cambio aplica tanto a casas como a hoteles.
- [x] Los placements individuales pueden sobrescribir offsets locales o absolutos.
- [x] Casas/hoteles del lado 2 rotan hacia fuera de la propiedad.
- [x] Casas/hoteles del lado 4 rotan hacia fuera de la propiedad.
- [x] Casas y hoteles quedan centrados horizontalmente respecto a su propiedad.
- [x] Hasta 4 casas se distribuyen sin superponerse y manteniendo el conjunto centrado.

## Notes

- Para centrar visualmente hacia el centro, usar primero `defaultInwardOffset`, no `defaultZOffset`.
- `defaultXOffset/defaultZOffset` son coordenadas del mundo y solo deben usarse como microajustes finales.
- `inwardOffset` positivo significa "hacia el centro"; negativo significa "hacia afuera del tablero".
