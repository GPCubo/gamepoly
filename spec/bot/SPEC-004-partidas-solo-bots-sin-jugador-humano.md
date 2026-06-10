---
id: SPEC-004
title: Permitir partidas con solo bots sin requerir jugador humano
created_at: 2026-06-10T00:00:00
status: done
---

# SPEC-004: Permitir partidas con solo bots sin requerir jugador humano

## Description

Eliminar la restricción que obliga a tener al menos un jugador humano en el modo Bots. Actualmente, si todos los jugadores son bots, la pantalla de configuración muestra una advertencia y bloquea el inicio de la partida. Con este cambio, el usuario podrá iniciar una partida con 2–4 bots sin ningún humano, observando la partida completa en modo espectador pasivo (la cámara sigue el tablero, los bots juegan solos).

## Context and Motivation

El modo Bots ya soporta que los bots jueguen entre sí de forma completamente autónoma (turnos, compras, subastas, intercambios, resolución de deuda). El modal de intercambio bot→bot ya muestra modo espectador desde `bot/SPEC-003`. La única barrera que queda es una validación artificial en `pages/index.vue` que no tiene justificación de gameplay: ver una partida de puros bots es útil para probar estrategias, observar IA, hacer demostraciones o simplemente entretenerse.

## Technical Analysis

- **`pages/index.vue`**:
  - `isValidBotsConfig` (`computed`, línea ~339): retorna `humanCount >= 1`. Cambiar a que siempre retorne `true` (o eliminar la computed).
  - Mensaje de advertencia en el template (`v-if="activeMode === 'bots' && !isValidBotsConfig && !errorMsg"`): eliminar.
  - `startGame()` (~línea 466): bloque `if (activeMode.value === 'bots' && !isValidBotsConfig.value)` → eliminar.
- **`pages/game.vue`**: no requiere cambios. En modo solo-bots el juego ya corre:
  - `showTileCard` tiene guard `!store.isCurrentPlayerBot` → nunca se abre para bots.
  - `waitForBotExchangeResponse` ya muestra el modal en `spectatorMode` cuando el destino es bot (`bot/SPEC-003`).
  - El `GameOverlay` sigue visible pero sus botones quedan desactivados (el bot controla el turno).
- **`stores/gameStore.ts`**: no requiere cambios. `setupGame` no impone restricción sobre jugadores humanos.

Riesgo: ninguno. El flujo de juego ya funciona en modo solo-bots; la restricción es solo de UI.

## Implementation Plan

### Files to create

_(ninguno)_

### Files to modify

- `pages/index.vue` — Eliminar `isValidBotsConfig`, su advertencia en el template y el guard en `startGame()`.

### Ordered Steps

1. En `pages/index.vue`, eliminar la computed `isValidBotsConfig`.
2. Eliminar la línea `<p v-if="activeMode === 'bots' && !isValidBotsConfig && !errorMsg" ...>` del template.
3. Eliminar el bloque de validación en `startGame()` que referencia `isValidBotsConfig`.
4. Verificar que `npm run build` pase sin errores.

## Acceptance Criteria

- [x] En modo Bots se puede seleccionar "Bot Regular" o "Bot Difícil" para todos los jugadores sin ver ninguna advertencia.
- [x] Al pulsar INICIAR con todos los jugadores como bots, la partida arranca sin mensajes de error.
- [x] La partida de solo bots corre de forma autónoma y completa (los bots se turnan, compran, subastan, intercambian y pueden ganar).
- [x] Los modos Familiar y configuraciones con al menos un humano siguen funcionando igual.
- [x] `npm run build` pasa sin errores tras los cambios.

## Notes

- No se introduce ningún "modo espectador" especial: la UI existente ya es suficiente (el humano ve el tablero y los snackbars de acción de los bots).
- Si en el futuro se quiere añadir un botón "Acelerar" para saltar delays de bot, ese sería un spec separado.
