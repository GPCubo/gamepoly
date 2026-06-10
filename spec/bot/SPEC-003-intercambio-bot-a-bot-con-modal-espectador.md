---
id: SPEC-003
title: Bot-to-Bot Trade: intercambio entre bots con modal visible pero no interactivo para espectadores
created_at: 2026-06-10T00:00:00
status: done
---

# SPEC-003: Bot-to-Bot Trade: intercambio entre bots con modal visible pero no interactivo para espectadores

## Description

Cuando un bot propone un intercambio a otro bot, el `ExchangeModal` se debe abrir en modo espectador: visible para el jugador humano que observa, pero sin ningún botón de acción habilitado (sin aceptar, rechazar ni cancelar). El modal muestra la propuesta completa (propiedades y dinero de cada lado) con una leyenda indicando que los bots están negociando. Tras la resolución automática (aceptar o rechazar según lógica del bot), el modal se cierra y opcionalmente muestra feedback de la decisión tomada (aceptado/rechazado) durante un breve instante antes de cerrarse.

La regla general es: **solo los participantes directos del intercambio pueden interactuar con el modal**. Si el jugador activo (humano) no es ni el oferente ni el destinatario, el modal es puramente informativo.

## Context and Motivation

En `bot/SPEC-002` se implementó que los intercambios bot→bot se resuelven automáticamente sin mostrar ningún modal, lo cual hace que el juego avance de forma opaca para el jugador humano: los activos cambian de manos sin que el usuario pueda ver qué ocurrió ni por qué. Mostrar el modal en modo espectador añade transparencia y mantiene la coherencia visual con los intercambios bot→humano, donde sí se muestra el modal. Referencia: `economy/SPEC-002` (implementación del modal), `bot/SPEC-002` (lógica bot).

## Technical Analysis

- **`pages/game.vue`**: Actualmente, cuando un bot propone a otro bot, se llama directamente a `store.respondExchange(...)` sin abrir el modal. Hay que abrir el modal igualmente y pasarle una prop `spectatorMode: true`. La resolución automática del bot debe esperar a que el modal esté montado y luego ejecutarse con un delay visible (≈1.5s) antes de cerrar.
- **`components/ExchangeModal.vue`**: Recibe nueva prop `spectatorMode: boolean` (default `false`). Cuando `spectatorMode` es `true`:
  - Los botones "Aceptar", "Rechazar" y "Cancelar" no se renderizan (o se renderizan deshabilitados con `pointer-events: none`).
  - Se muestra un banner/leyenda: `"🤖 Los bots están negociando..."`.
  - El modal no puede cerrarse con click en el backdrop ni con Escape.
- **`composables/useBotTurn.ts`**: La función que actualmente resuelve el trade bot→bot directamente debe emitir un evento o invocar un callback que permita a `game.vue` orquestar la apertura del modal antes de resolver. Una opción limpia es que `useBotTurn` exponga una promesa que `game.vue` awaita para saber cuándo mostrar el resultado y cuándo cerrar.
- **`stores/gameStore.ts`**: No requiere cambios de estado. El intercambio ya tiene `exchangeProposal` con `fromPlayerId` y `toPlayerId`; `game.vue` puede leer esos IDs para determinar si el jugador humano actual es espectador.
- **Determinación de espectador**: `isSpectator = humanPlayer && humanPlayer.id !== proposal.fromPlayerId && humanPlayer.id !== proposal.toPlayerId`. Si todos los jugadores son bots, el modal igualmente se abre en modo espectador (ninguno puede interactuar).

## Implementation Plan

### Files to create

_(ninguno)_

### Files to modify

- `components/ExchangeModal.vue` — Agregar prop `spectatorMode: boolean`, ocultar botones de acción y mostrar banner "bots negociando" cuando sea `true`. Bloquear cierre por backdrop/Escape en modo espectador.
- `pages/game.vue` — Cuando el bot propone a otro bot, abrir el modal con `spectatorMode: true` antes de resolver automáticamente. Añadir delay visual (≈1.5s) para que el usuario lea la propuesta, luego ejecutar la decisión del bot y cerrar el modal.
- `composables/useBotTurn.ts` — Refactorizar la resolución de intercambio bot→bot para que `game.vue` controle la apertura/cierre del modal en vez de resolverse de forma completamente invisible.

### Ordered Steps

1. Agregar prop `spectatorMode: boolean` en `ExchangeModal.vue` y ajustar template: ocultar botones de acción, mostrar banner, bloquear cierre externo.
2. En `pages/game.vue`, localizar el bloque donde se resuelve el intercambio bot→bot e intercalar: abrir modal (`showExchangeModal = true`, `spectatorMode = true`) → await delay ≈ 1.5s → ejecutar `store.respondExchange(...)` → mostrar resultado brevemente (≈800ms) → cerrar modal.
3. En `composables/useBotTurn.ts`, extraer la lógica de decisión del bot (¿acepta o rechaza?) a una función pura retornable, de forma que `game.vue` pueda llamarla sin que el composable resuelva el store directamente en el caso bot→bot.
4. Verificar que el caso bot→humano (donde el humano ve el modal interactivo) no se ve afectado.
5. Verificar que el caso humano→bot (donde el humano propone y el bot responde) tampoco se ve afectado.
6. `npm run build` sin errores.

## Acceptance Criteria

- [x] Cuando un bot propone un intercambio a otro bot, el `ExchangeModal` se abre y muestra la propuesta completa (propiedades y dinero de ambos lados).
- [x] El modal en modo espectador no tiene botones de acción habilitados (aceptar/rechazar/cancelar no son clicables).
- [x] Se muestra un banner o leyenda que indica que los bots están negociando.
- [x] El modal no puede cerrarse con click en el backdrop ni con la tecla Escape mientras los bots negocian.
- [x] Tras ≈1.5s el bot resuelve la decisión (acepta o rechaza) y el modal refleja brevemente el resultado antes de cerrarse.
- [x] Los intercambios bot→humano siguen mostrando el modal interactivo normal sin cambios.
- [x] Los intercambios humano→humano no se ven afectados.
- [x] Si el jugador humano es parte del intercambio (oferente o destinatario), el modal sigue siendo completamente interactivo.
- [x] `npm run build` pasa sin errores tras los cambios.

## Notes

- El delay de ≈1.5s es orientativo; puede ajustarse por consistencia con otros delays del bot (ej. los usados en `useBotTurn.ts` para compras y subastas).
- Considerar añadir en el banner el nombre de los dos bots involucrados para mayor claridad: `"🤖 Bot A está evaluando la oferta de Bot B..."`.
- No se introduce nueva animación; basta con el fade-in existente del modal más el delay de resolución.
- Si en el futuro se añade un modo "replay" o "historial de turnos", el modo espectador de este modal sería el patrón a seguir.
