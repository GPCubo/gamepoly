---
id: SPEC-012
title: Centralizar animación fichas salto y crecimiento
created_at: 2026-06-10T12:00:00
status: done
---

# SPEC-012: Centralizar animación fichas salto y crecimiento

## Description

Centralizar y mejorar la funcionalidad de animación de fichas (salto al moverse y crecimiento al aterrizar) para que pueda ser reutilizada tanto en el modo single-player (`pages/game.vue`) como en el modo multiplayer (`pages/multiplayer/game.vue`). Actualmente la animación está implementada en `composables/usePieceAnimation.ts` pero necesita mejoras para ser más flexible y reutilizable.

## Context and Motivation

Actualmente ambas páginas de juego implementan animaciones de fichas de forma similar pero con ligeras diferencias en su uso. Esto crea duplicación de lógica y dificulta mantener las animaciones consistentes entre ambos modos. Centralizar esta funcionalidad permitirá:
- Mantener una única fuente de verdad para las animaciones
- Facilitar futuras mejoras y correcciones
- Asegurar consistencia visual entre modos single-player y multiplayer
- Reducir la complejidad del código en ambas páginas

## Technical Analysis

La animación actual se encuentra en `composables/usePieceAnimation.ts` y ya es utilizada por ambas páginas. Sin embargo, necesita mejoras para ser más robusta y flexible:
- Actualmente depende de `Y_SUELO` y `GAME_CONFIG` que están en otros composables
- La lógica de `startHop` y `startGrow` podría ser más configurable
- Se debe asegurar que la API sea consistente y bien documentada
- Se debe verificar que no haya conflictos con los diferentes stores (`useGameStore` vs `useMultiplayerStore`)

## Implementation Plan

### Files to create

- `spec/player/SPEC-012-centralizar-animacion-fichas-salto-y-crecimiento.md` - Este archivo de especificación

### Files to modify

- `composables/usePieceAnimation.ts` - Mejorar la API y hacerla más flexible para diferentes contextos
- `pages/game.vue` - Actualizar el uso para aprovechar las mejoras
- `pages/multiplayer/game.vue` - Actualizar el uso para aprovechar las mejoras

### Ordered Steps

1. Analizar el uso actual de `usePieceAnimation` en ambas páginas para identificar diferencias
2. Mejorar `usePieceAnimation.ts` para hacerlo más genérico y configurable
3. Actualizar `pages/game.vue` para usar la nueva API mejorada
4. Actualizar `pages/multiplayer/game.vue` para usar la nueva API mejorada
5. Probar ambas implementaciones para asegurar consistencia

## Acceptance Criteria

- [x] La animación de salto funciona correctamente en ambas páginas
- [x] La animación de crecimiento funciona correctamente en ambas páginas
- [x] No hay regresiones en el comportamiento actual de las animaciones
- [x] El código es más limpio y mantenible en ambas páginas
- [x] La API del composable es consistente y bien documentada

## Notes

Esta mejora no cambia el comportamiento visual actual, solo centraliza y mejora la reutilización del código. Las animaciones existentes deben mantenerse idénticas, solo se mejora la arquitectura para facilitar futuras mejoras.