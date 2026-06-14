---
id: SPEC-019
title: Fase 3: eliminar boardTilesConfig.ts y boardtiles.go — frontend consume tiles desde API y backend elimina array hardcodeado
created_at: 2026-06-14T00:00:00
status: done
---

# SPEC-019: Fase 3: eliminar boardTilesConfig.ts y boardtiles.go — frontend consume tiles desde API y backend elimina array hardcodeado

## Descripción

Tras SPEC-017 (DB como registro) y SPEC-018 (engine Go lee de DB), el backend ya no usa `config.BoardTiles` para el juego. Sin embargo quedan dos fuentes de datos hardcodeadas:

1. **`config/boardTilesConfig.ts`** — 12 archivos frontend importan `BOARD_TILES`, `CHANCE_CARDS`, `COMMUNITY_CARDS` directamente como constantes estáticas.
2. **`backend/internal/config/boardtiles.go`** — contiene el array `BoardTiles` (usado solo como fallback en `DefaultBoardConfig()`), los arrays `ChanceCards`/`CommunityCards`, y todos los tipos Go (`TileType`, `BoardTile`, `GameCard`, etc.).

Este spec propone:

**Lado backend:**
- Crear un endpoint `GET /api/v1/boards/:slug` que devuelva tiles + cartas desde la DB/registry.
- Dividir `boardtiles.go` en `config/types.go` (definiciones de tipos) + `config/cards.go` (cartas hardcodeadas). El array `BoardTiles` se elimina; la producción siempre usa DB.
- `DefaultBoardConfig()` en `boardconfig.go` pasa a ser solo para tests.

**Lado frontend:**
- Nuevo store Pinia `stores/boardStore.ts` que carga el tablero desde `GET /api/v1/boards/monopoly-es` al arranque de la app.
- Nuevos tipos en `types/board.ts` (extraídos de `boardTilesConfig.ts`).
- Reemplazar las 12 importaciones de `BOARD_TILES` / `CHANCE_CARDS` / `COMMUNITY_CARDS` por `boardStore.tiles` / `boardStore.chanceCards` / `boardStore.communityCards`.
- Eliminar `config/boardTilesConfig.ts`.

## Contexto y Motivación

- Cambiar el precio de una propiedad actualmente requiere: (1) editar `boardTilesConfig.ts`, (2) editar `boardtiles.go`, (3) correr `npm run sync:db`. Con este spec solo se edita la DB y el frontend obtiene el dato actualizado en el próximo deploy/restart.
- `economyConfig.ts` deriva precios mínimos/máximos leyendo `BOARD_TILES` en tiempo de carga — si los precios cambian en DB pero el TS queda obsoleto, los cálculos de coste de casas/hoteles divergen del engine Go.
- Es el cierre natural del arco SPEC-017 → SPEC-018 → SPEC-019.

## Análisis Técnico

### Backend: qué queda en `boardtiles.go` tras SPEC-018

| Símbolo | Aún usado por | Qué hacer |
|---|---|---|
| `BoardTiles []BoardTile` | `boardconfig.go:DefaultBoardConfig()` | Mover a `config/types_test.go`; eliminar de producción |
| `ChanceCards []GameCard` | `boardconfig.go:Register()` + endpoint | Mover a `config/cards.go` |
| `CommunityCards []GameCard` | ídem | Mover a `config/cards.go` |
| `TileType`, `CardActionType` | engine, bot, validators, history | Mover a `config/types.go` |
| `BoardTile`, `GameCard` structs | engine, store, history, helpers | Mover a `config/types.go` |
| `GetTile`, `GetGroupTiles`, `GetOwnableTile`, `ShuffleDeck`, `ResolveCardText` | Nadie (reemplazados en SPEC-018) | Eliminar |
| `intPtr` helper | solo `boardtiles.go` internamente | Eliminar |

### Nuevo endpoint backend

```
GET /api/v1/boards/:slug
```

Respuesta JSON:
```json
{
  "slug": "monopoly-es",
  "locale": "es",
  "displayName": "Monopoly Clásico",
  "glbPath": "/models/tablero.glb",
  "tiles": [
    { "index": 0, "type": "corner", "group": "go", "name": "Salida", "shortName": "Salida", "color": "#28b463" },
    { "index": 1, "type": "property", "group": "brown", "name": "Ronda de Arrieta", "shortName": "Ronda de Arrieta", "price": 60, "color": "#955436" },
    ...
  ],
  "chanceCards": [ { "id": "ch01", "group": "chance", "text": "...", "action": "moveTo", "tileIndex": 0 }, ... ],
  "communityCards": [ ... ]
}
```

El handler lee de `BoardRegistry` (ya en memoria). Sin query DB en cada request.

### Frontend: patrón de carga

El `boardStore` se carga una vez al montar la app (`app.vue` o un plugin Nuxt). El juego no puede iniciar hasta que el store esté listo (`boardStore.ready === true`). Dado que el endpoint es local (mismo servidor), el RTT es < 5ms — no se necesita skeleton de carga para el tablero.

### Archivos frontend afectados (12)

| Archivo | Imports actuales | Cambio |
|---|---|---|
| `stores/gameStore.ts` | `BOARD_TILES`, `CHANCE_CARDS`, `COMMUNITY_CARDS`, `shuffleDeck`, `resolveCardText`, tipos | Importar desde `boardStore` y `types/board` |
| `composables/useBoardGeometry.ts` | `BOARD_TILES`, `BoardTile`, `TileGroup` | `boardStore.tiles` |
| `composables/useTileLabels.ts` | `BOARD_TILES`, `BoardTile` | `boardStore.tiles` |
| `composables/useBotTurn.ts` | `BOARD_TILES`, `BoardTile` | `boardStore.tiles` |
| `composables/useBotEngine.ts` | `BOARD_TILES`, `BoardTile`, `TileGroup` | `boardStore.tiles` |
| `config/economyConfig.ts` | `BOARD_TILES` | `boardStore.tiles` (convertir a función o computed) |
| `config/boardHouseAssets.ts` | tipo `BoardTile` | `import type { BoardTile } from '~/types/board'` |
| `components/CardOverlay.vue` | tipo `GameCard` | `import type { GameCard } from '~/types/board'` |
| `components/GameOverlay.vue` | `BOARD_TILES` | `boardStore.tiles` |
| `components/ExchangeModal.vue` | `BOARD_TILES`, `BoardTile`, `TileType` | `boardStore.tiles` + tipo |
| `components/AuctionModal.vue` | tipo `BoardTile` | `import type { BoardTile } from '~/types/board'` |
| `components/SidebarConfig.vue` | `BOARD_TILES`, `BoardTile`, `TileGroup` | `boardStore.tiles` |

### `economyConfig.ts` — caso especial

Hoy lee `BOARD_TILES` para calcular `HOUSE_COST_MIN/MAX` como constantes globales:
```ts
export const HOUSE_COST_MIN = Math.min(...BOARD_TILES.filter(t => t.price).map(...))
```

Con tiles dinámicos esto ya no puede ser una constante en tiempo de módulo. Opciones:
1. **Convertir en computed** dentro de un composable `useEconomyConfig()` que recibe `tiles` como parámetro — preferido.
2. **Hardcodear los límites** como constantes numéricas (60-400 para el tablero canónico) — alternativa simple.

Se elige la opción 2 para no propagar el cambio a los callers de `economyConfig`: los valores numéricos (60, 400) son datos del tablero canónico y no cambian con frecuencia. Se documenta que si se agrega un tablero con precios diferentes, habrá que revisitar.

### Riesgo: sincronía en composables

`useBoardGeometry`, `useTileLabels`, `useBotTurn`, `useBotEngine` son composables que se invocan síncronamente al montar componentes del juego. Si `boardStore.tiles` es un array vacío durante el hydration/SSR, los cálculos producen resultados vacíos.

Mitigación: el juego solo se monta después de que `boardStore.ready === true`. Agregar un guard en `pages/game.vue` y `pages/multiplayer/game.vue` que muestra un loading spinner hasta que el board esté cargado.

## Plan de Implementación

### Archivos a crear

- `backend/internal/config/types.go` — tipos Go: `TileType`, `TileTypeXxx` consts, `CardActionType`, `CardXxx` consts, `BoardTile`, `GameCard`
- `backend/internal/config/cards.go` — `ChanceCards []GameCard` y `CommunityCards []GameCard` hardcodeados (extraídos de `boardtiles.go`)
- `types/board.ts` — tipos TypeScript: `TileType`, `TileGroup`, `CardActionType`, `BoardTile`, `GameCard`
- `stores/boardStore.ts` — Pinia store; fetches `GET /api/v1/boards/monopoly-es`; expone `tiles`, `chanceCards`, `communityCards`, `ready`

### Archivos a modificar

- `backend/internal/api/router.go` — agregar `GET /api/v1/boards/:slug` handler
- `backend/internal/config/boardtiles.go` — eliminar todo excepto comentario de deprecación; eventualmente borrar el archivo
- `backend/internal/game/boardconfig.go` — `DefaultBoardConfig()` pasa a `DefaultBoardConfigForTest()`, solo usable en tests
- `stores/gameStore.ts` — usar `boardStore` para tiles y cartas; importar tipos de `types/board`
- `composables/useBoardGeometry.ts` — usar `boardStore.tiles`
- `composables/useTileLabels.ts` — usar `boardStore.tiles`
- `composables/useBotTurn.ts` — usar `boardStore.tiles`
- `composables/useBotEngine.ts` — usar `boardStore.tiles`
- `config/economyConfig.ts` — hardcodear `HOUSE_COST_MIN=60`, `HOUSE_COST_MAX=400`; eliminar import de BOARD_TILES
- `config/boardHouseAssets.ts` — cambiar import de tipo a `~/types/board`
- `components/CardOverlay.vue` — cambiar import de tipo a `~/types/board`
- `components/GameOverlay.vue` — usar `boardStore.tiles`
- `components/ExchangeModal.vue` — usar `boardStore.tiles`; tipo de `~/types/board`
- `components/AuctionModal.vue` — cambiar import de tipo a `~/types/board`
- `components/SidebarConfig.vue` — usar `boardStore.tiles`
- `pages/game.vue` — agregar guard de `boardStore.ready`
- `pages/multiplayer/game.vue` — agregar guard de `boardStore.ready`
- `app.vue` (o plugin Nuxt) — llamar `boardStore.fetchBoard()` al arranque

### Archivos a eliminar

- `config/boardTilesConfig.ts` — una vez que ningún archivo lo importe
- (Eventualmente) `backend/internal/config/boardtiles.go` — una vez que `types.go` y `cards.go` existan

### Pasos ordenados

1. Crear `backend/internal/config/types.go` con todos los tipos (extraídos de `boardtiles.go` sin modificar, copy-paste exacto de structs y consts).
2. Crear `backend/internal/config/cards.go` con `ChanceCards` y `CommunityCards` (extraídos de `boardtiles.go`).
3. Vaciar `boardtiles.go`: dejar solo `package config` y un comentario `// Deprecated: use types.go and cards.go`. Go no falla con archivos vacíos.
4. Verificar que `go build ./...` compila sin errores (los imports siguen apuntando al paquete `config`, sin importar el archivo).
5. Agregar handler `GET /api/v1/boards/:slug` en `router.go` que devuelve tiles + cartas desde `BoardRegistry`.
6. Crear `types/board.ts` con los tipos TypeScript (extraídos de `boardTilesConfig.ts`).
7. Crear `stores/boardStore.ts` con Pinia — fetch de `GET /api/v1/boards/monopoly-es`, expone `tiles`, `chanceCards`, `communityCards`, `ready`, `fetchBoard()`.
8. En `app.vue` (o plugin Nuxt `plugins/board.ts`), llamar `boardStore.fetchBoard()` en `onMounted` / plugin `setup`.
9. Migrar `stores/gameStore.ts` — reemplazar `BOARD_TILES`, `CHANCE_CARDS`, `COMMUNITY_CARDS`, `shuffleDeck`, `resolveCardText` por equivalentes del store/util.
10. Migrar `config/economyConfig.ts` — hardcodear límites, eliminar import de `BOARD_TILES`.
11. Migrar los 4 composables (`useBoardGeometry`, `useTileLabels`, `useBotTurn`, `useBotEngine`).
12. Migrar los 5 componentes (`GameOverlay`, `ExchangeModal`, `SidebarConfig`, `CardOverlay`, `AuctionModal`).
13. Migrar `config/boardHouseAssets.ts` (solo tipo).
14. Agregar guards de `boardStore.ready` en `pages/game.vue` y `pages/multiplayer/game.vue`.
15. Verificar que no quedan imports de `boardTilesConfig.ts` (`grep -r "boardTilesConfig" .`).
16. Eliminar `config/boardTilesConfig.ts`.
17. Verificar que `npx nuxi typecheck` pasa sin errores.

## Criterios de Aceptación

- [x] `GET /api/v1/boards/monopoly-es` responde con JSON que incluye 40 tiles y 32 cartas.
- [x] `go build ./...` compila sin errores.
- [x] `grep -r "boardTilesConfig" . --include="*.ts" --include="*.vue"` no devuelve resultados.
- [x] El archivo `config/boardTilesConfig.ts` no existe en el repositorio.
- [x] `boardtiles.go` no contiene el array `BoardTiles` (el archivo puede existir vacío o eliminado).
- [ ] Una partida solitario completa puede jugarse (renderizado, compras, rentas, cartas, construcción).
- [ ] Los composables `useBoardGeometry` y `useTileLabels` funcionan correctamente (las casillas tienen labels y posiciones correctas).
- [ ] `npx nuxi typecheck` o el type-check de build pasa sin errores nuevos.

## Notas

- **Orden de migración**: backend primero (endpoint), luego store, luego consumers. Nunca al revés — el store dependede del endpoint.
- **`shuffleDeck` y `resolveCardText`**: estas funciones de `boardTilesConfig.ts` también se deben mover. `shuffleDeck` puede ir a `utils/deck.ts`; `resolveCardText` al `boardStore` como método.
- **`economyConfig.ts` hardcoding**: los valores 60 y 400 son el precio mínimo y máximo del tablero canónico. Si en el futuro un tablero tiene precios diferentes, `economyConfig` deberá leerlos del store. Se agrega un TODO comment al respecto.
- **SSR / Nuxt**: si la app usa SSR, `boardStore.fetchBoard()` debe correr en el servidor también. Si es SPA puro, basta con `onMounted` en `app.vue`. Verificar el modo de Nuxt antes de implementar.
- **Alternativa descartada — importar tipos desde boardStore**: los tipos TypeScript (`BoardTile`, etc.) no deben importarse desde el store (mezcla tipos con runtime). Se crean en `types/board.ts` independiente del store.
- **Alternativa descartada — mantener boardTilesConfig.ts solo con tipos**: la tentación es dejar el archivo con solo los tipos y exportar solo TypeScript interfaces. Se descarta porque contamina cualquier grep de "boardTilesConfig" y confunde a futuros devs. Los tipos van a `types/board.ts`.
