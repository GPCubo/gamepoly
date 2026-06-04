---
id: SPEC-001
title: Configuración de cash y otras variables de juego previo al inicio
created_at: 2026-06-04T00:00:00
status: done
---

# SPEC-001: Configuración de cash y otras variables de juego previo al inicio

## Description

Ampliar la pantalla de configuración (`pages/index.vue`) para que, antes de iniciar la partida, los jugadores puedan ajustar variables económicas y de reglas del juego:

- **Dinero inicial por jugador** (por defecto: $1 500).
- **Salario al pasar por la casilla de salida** (por defecto: $200).
- **Modo de juego rápido** (toggle): reduce el total de vueltas para terminar la partida (opcional, para futuras reglas).

Estas variables se guardan en el store antes de llamar a `setupGame()` y quedan disponibles para toda la partida.

## Context and Motivation

Actualmente `pages/index.vue` sólo permite configurar nombre y ficha por jugador. No existe forma de personalizar el balance económico de la partida. Para que el juego sea jugable y configurable (por ejemplo, partidas rápidas con menos dinero inicial), se necesita exponer estos parámetros en la pantalla de inicio.

El módulo afectado es el flujo de setup → juego: `pages/index.vue` → `stores/gameStore.ts` → `pages/game.vue`.

## Technical Analysis

### Estado actual

- `PlayerState` en `gameStore.ts:9` tiene `position` e `isMoving`, pero **no tiene un campo `cash`**.
- `GameState` en `gameStore.ts:22` no tiene constantes económicas (salario, etc.).
- `GAME_CONFIG` en `config/gameConfig.ts` sólo guarda constantes de rendering; no hay ningún valor monetario.
- `setupGame(configs: PlayerConfig[])` en `gameStore.ts:60` recibe sólo `name` y `tokenModel`.

### Cambios necesarios

1. **`config/gameConfig.ts`** — agregar constantes económicas por defecto:
   - `STARTING_CASH: 1500`
   - `GO_SALARY: 200`

2. **`stores/gameStore.ts`** — extender tipos y estado:
   - `PlayerState.cash: number`
   - `GameState.goSalary: number`
   - `PlayerConfig.startingCash: number` (opcional, permite cash distinto por jugador en el futuro)
   - `setupGame()` debe inicializar `cash` desde el config recibido.

3. **`pages/index.vue`** — añadir sección "Configuración de partida" con:
   - Input numérico para dinero inicial (compartido para todos los jugadores).
   - Input numérico para salario al pasar por salida.
   - Validaciones: mínimos razonables ($100 dinero inicial, $0 salario).

### Riesgos

- Si en `pages/game.vue` o en algún componente ya se lee `player.cash`, habrá que verificar que el campo exista desde el inicio (inicialización con `0` rompería la lógica de deuda).
- Los inputs numéricos deben sanitizarse para evitar valores negativos o no numéricos.

## Implementation Plan

### Files to create

- _(ninguno)_

### Files to modify

- `config/gameConfig.ts` — agregar `STARTING_CASH` y `GO_SALARY`.
- `stores/gameStore.ts` — extender `PlayerConfig`, `PlayerState`, `GameState` y `setupGame`.
- `pages/index.vue` — añadir sección de configuración de partida con inputs validados.

### Ordered Steps

1. Agregar en `config/gameConfig.ts`:

   ```ts
   STARTING_CASH: 1500,
   GO_SALARY: 200,
   ```

2. En `stores/gameStore.ts`:
   - Añadir `cash: number` a `PlayerState`.
   - Añadir `startingCash?: number` a `PlayerConfig`.
   - Añadir `goSalary: number` a `GameState` (inicializado con `GAME_CONFIG.GO_SALARY`).
   - En `setupGame()`, asignar `cash` desde `config.startingCash ?? GAME_CONFIG.STARTING_CASH` y guardar `goSalary` en el estado del store.

3. En `pages/index.vue`:
   - Añadir refs `startingCash` (default `GAME_CONFIG.STARTING_CASH`) y `goSalary` (default `GAME_CONFIG.GO_SALARY`).
   - Añadir una sección visual "Configuración de partida" con dos inputs `<input type="number">`.
   - En `startGame()`, pasar `startingCash` y `goSalary` a `store.setupGame()`.
   - Validar: `startingCash >= 100`, `goSalary >= 0`; mostrar `errorMsg` si fallan.

4. (Opcional) Si `pages/game.vue` o algún HUD muestra saldo, asegurarse de leer `player.cash` correctamente.

## Acceptance Criteria

- [x] El campo "Dinero inicial" aparece en la pantalla de setup con valor por defecto $1 500.
- [x] El campo "Salario (salida)" aparece en la pantalla de setup con valor por defecto $200.
- [x] Ambos campos aceptan sólo números enteros positivos; valores inválidos muestran `errorMsg` y bloquean el inicio.
- [x] Al iniciar la partida, cada `PlayerState.cash` tiene el valor configurado.
- [x] `GameState.goSalary` refleja el valor configurado.
- [x] La UI sigue siendo consistente con el estilo existente (colores `#4ade80`, fondo oscuro, `font-family: monospace`).
- [x] El flujo de tecla Enter para iniciar sigue funcionando.

## Notes

- Se descartó hacer dinero inicial distinto por jugador para mantener la UX simple; la arquitectura lo permite en el futuro con `PlayerConfig.startingCash`.
- El "modo rápido" se deja fuera del alcance de este spec para no aumentar la complejidad; puede ser SPEC-002.
- No se usan stores externos ni librerías adicionales; todo se resuelve extendiendo los archivos existentes.
