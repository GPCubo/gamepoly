---
id: SPEC-013
title: Centralizar funcionalidad de seguimiento de cámara para ficha activa
created_at: 2026-06-11T12:00:00
status: done
---

# SPEC-013: Centralizar funcionalidad de seguimiento de cámara para ficha activa

## Description

Centralizar la funcionalidad de seguimiento de cámara que actualmente existe solo en la página de juego individual (`pages/game.vue`) para que pueda ser reutilizada en la página de juego multijugador (`pages/multiplayer/game.vue`). La funcionalidad debe permitir que la cámara siga automáticamente a la ficha del jugador activo o permitir al usuario controlar manualmente la cámara según su preferencia.

## Context and Motivation

Actualmente, la página de juego individual tiene una funcionalidad de seguimiento de cámara implementada directamente en el componente, donde la cámara sigue automáticamente a la ficha del jugador activo cuando `store.isCamFollowActive` está activo. Sin embargo, la página multijugador no tiene esta funcionalidad, lo que crea una experiencia inconsistente entre los modos de juego. Centralizar esta funcionalidad en un composable permitirá reutilizar el mismo código en ambas páginas y mantener la consistencia de la experiencia del usuario.

## Technical Analysis

La funcionalidad actual en `pages/game.vue` utiliza:
- `store.isCamFollowActive` para controlar si la cámara sigue automáticamente a la ficha activa
- `store.activePlayerIndex` para identificar al jugador activo
- `displayPositions[activeIdx]` para obtener la posición actual de la ficha activa
- `getCameraPosition(activeCasilla, activePos)` del composable `useCameraOrbit` para calcular la posición objetivo de la cámara
- Interpolación lineal con `CAM_LERP` para suavizar el movimiento de la cámara

El composable `useCameraOrbit` ya existe y contiene la lógica para calcular posiciones de cámara, pero la lógica de seguimiento automático está implementada directamente en el componente. Esta lógica debe extraerse a un nuevo composable o extender el existente.

## Implementation Plan

### Files to create

- `composables/useCameraFollow.ts` - Nuevo composable para gestionar el seguimiento automático de cámara

### Files to modify

- `pages/game.vue` - Reemplazar la lógica de seguimiento de cámara con el nuevo composable
- `pages/multiplayer/game.vue` - Agregar la funcionalidad de seguimiento de cámara usando el nuevo composable
- `stores/gameStore.ts` - Asegurar que `isCamFollowActive` esté disponible (ya existe)
- `stores/multiplayerStore.ts` - Agregar `isCamFollowActive` al store multijugador

### Ordered Steps

1. Crear el composable `useCameraFollow.ts` que encapsule la lógica de seguimiento automático
2. Actualizar `pages/game.vue` para usar el nuevo composable en lugar de la lógica inline
3. Agregar `isCamFollowActive` al `multiplayerStore.ts` 
4. Actualizar `pages/multiplayer/game.vue` para implementar el seguimiento de cámara
5. Agregar controles de configuración en la sidebar de multiplayer para activar/desactivar el seguimiento

## Acceptance Criteria

- [x] La cámara sigue automáticamente a la ficha del jugador activo en modo individual cuando está activado
- [x] La cámara sigue automáticamente a la ficha del jugador activo en modo multijugador cuando está activado
- [x] El usuario puede activar/desactivar el seguimiento automático en ambos modos
- [x] El comportamiento de la cámara es idéntico en ambos modos de juego
- [x] El control manual de cámara (OrbitControls) sigue funcionando correctamente cuando el seguimiento automático está desactivado

## Notes

La funcionalidad debe mantener la misma experiencia de usuario en ambos modos, con la misma suavidad de movimiento y los mismos parámetros de interpolación. El composable debe ser flexible para trabajar con diferentes stores (gameStore y multiplayerStore) mediante inyección de dependencias o parámetros de configuración.