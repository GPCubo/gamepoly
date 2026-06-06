---
id: SPEC-002
title: Intercambio de propiedades y dinero entre jugadores
created_at: 2026-06-05T12:00:00
status: done
---

# SPEC-002: Intercambio de propiedades y dinero entre jugadores

## Description

Sistema de intercambio (trade/exchange) entre jugadores. Una vez que al menos una propiedad ha sido comprada, aparece un botón "Intercambio" en el GameOverlay, ubicado a la izquierda del botón "Cámara: Libre". Al pulsarlo, se abre un modal donde el jugador activo puede proponer un intercambio a otro jugador: ofrecer propiedades y/o dinero a cambio de propiedades y/o dinero del otro jugador. El destinatario debe aceptar para que el intercambio se ejecute.

## Context and Motivation

El juego actualmente permite comprar, subastar y cobrar alquiler, pero no existe mecanismo para que dos jugadores negocien propiedades o dinero entre ellos. El intercambio es una mecánica esencial del Monopoly clásico que agrega estrategia y dinamismo. Referencia: `economy/SPEC-001`.

## Technical Analysis

- **gameStore.ts** (`stores/gameStore.ts`): Almacena `propertyOwners: Record<number, number>` y `players[].cash`. Se necesitan nuevas acciones `startExchange`, `respondExchange`, `cancelExchange`, y campos de estado para la propuesta en curso.
- **GameOverlay.vue** (`components/GameOverlay.vue:54-95`): La fila `.action-buttons` contiene `roll-btn` y `cam-btn`. Se agrega `exchange-btn` entre ambos.
- **ExchangeModal.vue** (nuevo componente): Similar a `AuctionModal.vue` en estructura (backdrop + modal), pero con UI de selección de propiedades y entrada de dinero para proponer/aceptar.
- **game.vue** (`pages/game.vue`): Integra ExchangeModal junto a TileCard/AuctionModal. Escucha eventos `exchange-accepted` y `exchange-cancelled`.
- **useKeyboardNavigation**: Se actualiza la lista de refs en GameOverlay para incluir el nuevo botón.
- El botón solo se muestra si `Object.keys(store.propertyOwners).length > 0` (al menos una propiedad comprada).
- El botón solo está habilitado durante el turno del jugador (`store.isTurnComplete`) — se puede proponer intercambio al terminar el turno, antes de pasar al siguiente.

## Implementation Plan

### Files to create

- `components/ExchangeModal.vue` — Modal de intercambio con fases: selección de destino, propuesta (propiedades + dinero), y respuesta del destino.

### Files to modify

- `stores/gameStore.ts` — Agregar estado de intercambio (`ExchangeProposal` interface, `exchangeProposal` state, acciones `startExchange`, `respondExchange`, `cancelExchange`, getter `canExchange`).
- `components/GameOverlay.vue` — Agregar botón "🔄 Intercambio" a la izquierda de "Cámara", emitir evento `open-exchange`.
- `pages/game.vue` — Integrar ExchangeModal, manejar eventos de intercambio.

### Pasos ordenados

1. Agregar `ExchangeProposal` interface y estado/acciones en `gameStore.ts`.
2. Crear `ExchangeModal.vue` con UI completa (selección de jugador, oferta de propiedades/dinero, respuesta accept/reject).
3. Agregar botón "Intercambio" en `GameOverlay.vue` con visibilidad condicional.
4. Integrar `ExchangeModal` en `game.vue` con manejadores de eventos.

## Criterios de Aceptación

- [x] El botón "Intercambio" aparece en GameOverlay a la izquierda de "Cámara" cuando al menos una propiedad está comprada
- [x] Al pulsar el botón se abre un modal donde el jugador activo elige un jugador destino
- [x] El jugador puede seleccionar propiedades de su propiedad para ofrecer y pedir propiedades del destino
- [x] El jugador puede ofrecer/pedir dinero en la propuesta
- [x] No se puede ofrecer dinero que no se tiene ni propiedades que no se poseen
- [x] El jugador destino ve la propuesta y puede aceptar o rechazar
- [x] Al aceptar, las propiedades y dinero se transfieren correctamente entre jugadores
- [x] Al rechazar, el modal se cierra sin cambios
- [x] El intercambio verifica que el jugador que ofrece dinero tenga fondos suficientes al momento de aceptar
- [x] El botón de intercambio está deshabilitado durante movimiento/dados y cuando no es turno completo

## Notes

- La propuesta de intercambio es atómica: si el oferente se queda sin fondos antes de la aceptación (ej: cae en impuesto), la propuesta se invalida automáticamente.
- Se sigue el patrón visual de AuctionModal.vue para el backdrop y estilo del modal.
- El diseño usa los mismos colores y tipografía que el resto del overlay (monospace, fondos oscuros, acentos en verde #4ade80).