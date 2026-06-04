---
id: SPEC-010
title: Configuración de Múltiples Jugadores con Fichas Seleccionables
created_at: 2026-05-20T12:00:00
status: done
---

# SPEC-010: Configuración de Múltiples Jugadores con Fichas Seleccionables

## Description

Migrar la lógica de juego hardcodeada a 2 jugadores para soportar un número configurable de jugadores (2-4), cada uno con nombre personalizado y ficha/token seleccionable de entre las disponibles en `public/models/users/`. Se añade una pantalla de configuración previa al juego donde se elige cuántos jugadores, sus nombres y qué ficha usa cada uno.

Actualmente hay 4 modelos en `public/models/users/` (sombrero, dedal, pork, key) pero solo se usan sombrero y dedal. El objetivo es que las 4 fichas sean utilizables y que agregar una nueva ficha al juego requiera solo: (1) colocar el `.glb` en `public/models/users/`, (2) agregar la entrada en `config/gameConfig.ts`, y (3) subir `MAX_PLAYERS` si se desea.

## Context and Motivation

Módulo GAME del flujo de tablero, fichas y jugadores. Actualmente el juego está hardcodeado a exactamente 2 jugadores en todas las capas:

- **Store**: `currentPosition`, `player2Position`, `isMoving`, `isPlayer2Moving`, `activePlayer: 1 | 2`
- **Animación**: `Record<1 | 2, HopAnimation>` y `Record<1 | 2, GrowAnimation>`
- **3D Scene**: Dos `<primitive>` fijos para `playerScene` (sombrero) y `dedalScene` (dedal), con posiciones/escalas separadas
- **Overlay**: Status hardcodeado `Jugador 1 (Sombrero)` / `Jugador 2 (Dedal)`
- **Casilla compartida**: Offset diagonal fijo para exactamente 2 jugadores
- **Turnos**: `finishTurn()` hace toggle binario `1 ⇄ 2`
- **No hay pantalla de configuración previa al juego**

Modelos en `public/models/users/` no utilizados: `pork.glb` (alcancía), `key.glb` (llave).

Se necesita generalizar todo a arrays dinámicos para soportar N jugadores (2-4), con una pantalla de setup que permita elegir el número de jugadores, sus nombres, y la ficha de cada uno.

## Technical Analysis

### Arquitectura de páginas

| Ruta | Archivo | Rol |
|------|---------|-----|
| `/` | `pages/index.vue` | **NUEVO**: Pantalla de setup/configuración |
| `/game` | `pages/game.vue` | **MOVIDO**: El juego actual (antes era `index.vue`) |

`pages/index.vue` al cargar resetea el store y muestra el formulario. Al hacer clic en "Iniciar Juego", guarda la configuración en el store y navega a `/game` con `navigateTo('/game')`. `pages/game.vue` lee la configuración del store; si no hay jugadores configurados, redirige a `/`.

### Store — De 2 jugadores fijos a array dinámico

```typescript
interface PlayerState {
  id: number;
  name: string;
  tokenModel: string; // ej: "sombrero.glb"
  position: number;
  isMoving: boolean;
}

interface GameState {
  phase: 'setup' | 'playing';
  players: PlayerState[];
  activePlayerIndex: number;
  isDiceVisible: boolean;
  diceValues: [number, number];
  isDiceRolling: boolean;
  statusMessage: string;
  isCamFollowActive: boolean;
}
```

Se eliminan: `currentPosition`, `player2Position`, `isMoving`, `isPlayer2Moving`, `isTurnComplete`, `lastDiceRoll`.

Getters: `diceTotal`, `activePlayer` (computed del jugador activo), `casillaActual` (posición del activo).

Acciones nuevas: `setupGame(configs: PlayerConfig[])`, `moveCurrentPlayer(steps)` (reemplaza `movePlayer` + `movePlayer2`), `finishTurn()` (cíclico: `(idx + 1) % players.length`).

### Animación — `Record<1|2,...>` → `Record<number,...>`

`usePieceAnimation` se inicializa con `init(count: number)` que crea registros de hops/grows/positions/scales para cada índice 0..count-1. Todos los métodos (`startHop`, `startGrow`, `cancelGrow`, `tick`, `getCurrentPosition`, `getCurrentScale`, `isAnimating`, `setPosition`, `setScale`) aceptan `playerIndex: number`. Sin cambios en easing ni duraciones.

### Renderizado 3D — `v-for` sobre jugadores

En `pages/game.vue`, los modelos se cargan dinámicamente:

```typescript
const loadedScenes = await Promise.all(
  store.players.map(p => loader.loadAsync(`/models/users/${p.tokenModel}`))
);
```

Y se renderizan con:

```vue
<primitive
  v-for="(player, idx) in store.players"
  :key="player.id"
  :object="playerScenes[idx]"
  :position="[positions[idx].x, positions[idx].y, positions[idx].z]"
  :scale="scales[idx]"
/>
```

### Casilla compartida para N jugadores

Lógica actual: offset diagonal fijo para 2 jugadores.  
Lógica nueva: disposición circular alrededor del centro de la casilla.

```
jugadoresEnCasilla = players.filter(p => p.position % 40 === casilla)
para cada jugador j en jugadoresEnCasilla:
  ángulo = (j / totalEnCasilla) * 2 * PI
  offsetX = cos(ángulo) * SAME_TILE_SPACING
  offsetZ = sin(ángulo) * SAME_TILE_SPACING
```

Esto escala a cualquier número de jugadores en la misma casilla.

### Cámara — seguir al jugador activo por índice

En el render loop, la cámara sigue la posición de `store.players[store.activePlayerIndex]` usando `getCameraPosition(store.players[store.activePlayerIndex].position, pos)`.

### Overlay — datos dinámicos del jugador activo

El status bar muestra `store.activePlayer.name` y el nombre de su ficha (mapeado desde `TOKEN_MODELS`). Los props `currentPosition` e `isMoving` se eliminan (se leen directamente del store). El botón "Siguiente" solo aparece cuando el jugador activo terminó de moverse (no hay flag `isTurnComplete`, se detecta comparando `isMoving` + `isDiceRolling`).

### Configuración de fichas disponibles

En `config/gameConfig.ts` se centraliza la lista de fichas:

```typescript
TOKEN_MODELS: [
  { file: 'sombrero.glb', name: 'Sombrero', icon: '🎩' },
  { file: 'dedal.glb', name: 'Dedal', icon: '🧵' },
  { file: 'pork.glb', name: 'Alcancía', icon: '🐷' },
  { file: 'key.glb', name: 'Llave', icon: '🔑' },
] as const,
MAX_PLAYERS: 4,
```

Agregar una nueva ficha requiere: (1) colocar el `.glb` en `public/models/users/`, (2) agregar entrada en `TOKEN_MODELS`, (3) opcionalmente subir `MAX_PLAYERS`. Ningún otro archivo necesita cambios.

### Pantalla de setup — UI

- Título y descripción
- Selector de cantidad de jugadores (botones 2, 3, 4 — limitado por `MAX_PLAYERS`)
- Por cada jugador:
  - Input de texto para el nombre (placeholder: "Jugador N")
  - Dropdown/selector de ficha con ícono y nombre (solo muestra fichas no seleccionadas por otros)
- Botón "Iniciar Juego" (validación: nombres no vacíos, fichas únicas)
- Diseño oscuro consistente con el overlay existente (fondo `#1a1a2e`, texto `#4ade80`, bordes redondeados)

## Implementation Plan

### Files to create

- `pages/index.vue` — Pantalla de configuración/setup con formulario de jugadores y fichas
- `pages/game.vue` — Escena del juego (contenido movido y adaptado del actual `pages/index.vue`)

### Files to modify

- `config/gameConfig.ts` — Agregar `MAX_PLAYERS`, `TOKEN_MODELS`, `TOKEN_MODELS_DIR`
- `stores/gameStore.ts` — Refactorizar a arrays dinámicos: `PlayerState[]`, `activePlayerIndex`, `setupGame`, `moveCurrentPlayer`, `finishTurn` cíclico
- `composables/usePieceAnimation.ts` — Generalizar `Record<1|2,...>` a `Record<number,...>` con inicialización dinámica
- `components/GameOverlay.vue` — Status y props adaptados a jugadores dinámicos
- `nuxt.config.ts` — Agregar `routeRules` para `/game` (SSR deshabilitado)

### Ordered Steps

1. Agregar constantes de fichas a `config/gameConfig.ts`: `MAX_PLAYERS`, `TOKEN_MODELS`, `TOKEN_MODELS_DIR`
2. Refactorizar `stores/gameStore.ts`: interfaces `PlayerState`, array `players`, `activePlayerIndex`, acciones `setupGame`, `moveCurrentPlayer`, `finishTurn` cíclico
3. Refactorizar `composables/usePieceAnimation.ts`: `Record<number,...>` con función `init(count)`, todos los métodos aceptan `playerIndex: number`
4. Crear `pages/index.vue` (setup screen) con formulario de configuración de jugadores y fichas
5. Crear `pages/game.vue` moviendo el contenido actual de `pages/index.vue` y adaptando a arrays dinámicos (carga de modelos, renderizado, watchers, shared tile, cámara)
6. Refactorizar `components/GameOverlay.vue` para mostrar datos del jugador activo desde el store
7. Verificar que la migración funcione correctamente

## Acceptance Criteria

- [x] Pantalla de setup en `/` permite elegir entre 2, 3, o 4 jugadores (limitado por `MAX_PLAYERS`)
- [x] Cada jugador puede escribir su nombre y elegir una ficha de entre las disponibles en `TOKEN_MODELS`
- [x] No se puede repetir la misma ficha entre jugadores (validación en el formulario)
- [x] Al iniciar el juego, los N jugadores aparecen en la casilla inicial (0) con sus fichas asignadas
- [x] Los turnos rotan correctamente por todos los jugadores (cíclico)
- [x] La cámara sigue al jugador del turno activo
- [x] N jugadores en la misma casilla se separan en disposición circular
- [x] Las animaciones de salto (hop) y crecimiento (grow) funcionan para cualquier jugador
- [x] El overlay muestra nombre y ficha del jugador activo
- [x] El código legacy `Record<1|2,...>` queda completamente eliminado de `usePieceAnimation`
- [x] Las 4 fichas de `public/models/users/` son utilizables (no solo sombrero y dedal)
- [x] Agregar una nueva ficha al juego solo requiere editar `config/gameConfig.ts` y colocar el `.glb`

## Notes

- La lista de fichas disponibles se centraliza en `config/gameConfig.ts` como fuente de verdad única. No se hace filesystem scanning en runtime (el proyecto usa SSR deshabilitado, `fs.readdirSync` no está disponible en cliente).
- La disposición circular para N jugadores en misma casilla reemplaza el offset diagonal fijo anterior. La constante `SAME_TILE_SPACING` ahora determina el radio del círculo.
- El `activePlayerIndex` se usa en vez de `activePlayer: 1 | 2`. La función `finishTurn()` avanza cíclicamente: `(activePlayerIndex + 1) % players.length`.
- Se elimina `isTurnComplete` como flag separado; el fin de turno se detecta cuando el jugador activo deja de moverse (`!activePlayer.isMoving`).
- El diseño de la pantalla de setup sigue la estética oscura del overlay existente (fondo `#1a1a2e`, texto `#4ade80`, bordes redondeados, tipografía monospace).
