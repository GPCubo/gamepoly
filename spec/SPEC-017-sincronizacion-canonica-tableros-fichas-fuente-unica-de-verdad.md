---
id: SPEC-017
title: Sincronización canónica de tableros y fichas: fuente única de verdad entre config TS, assets .glb y base de datos
created_at: 2026-06-14T00:00:00
status: done
---

# SPEC-017: Sincronización canónica de tableros y fichas: fuente única de verdad entre config TS, assets .glb y base de datos

## Descripción

Actualmente la información de los tableros (tiles, precios, colores, nombres) vive exclusivamente en `config/boardTilesConfig.ts` y se sincroniza parcialmente con el script de Blender via `scripts/sync-board-config.mjs`. El backend no tiene ninguna tabla de tableros ni de fichas: solo registra partidas terminadas. Los tokens están hardcodeados en `GAME_CONFIG.TOKEN_MODELS`.

Este spec propone:

1. Crear tablas de base de datos para `boards`, `board_tiles` y `tokens`, que actúen como registro canónico consultable por el backend Go y el frontend.
2. Definir un campo `locale` por tablero para soportar múltiples tableros por idioma (e.g. "Monopoly Madrid" en `es`, "Monopoly NYC" en `en`).
3. Agregar un flag `visible` por tablero que controle qué tableros están disponibles para los jugadores en la UI.
4. Agregar el path del `.glb` como campo en la tabla `boards`, de modo que la DB sea la referencia de qué asset corresponde a qué tablero.
5. Extender `scripts/sync-board-config.mjs` (o crear un nuevo script `sync-db.mjs`) que además de actualizar el Python de Blender, haga upsert de la configuración en la DB.
6. Registrar también los tokens/fichas en DB con su `glb_path`, label i18n, y flag `visible`.

## Contexto y Motivación

- `boardTilesConfig.ts` es la única fuente de verdad hoy, pero cualquier cambio de precio o nombre requiere: (a) editar el TS, (b) correr `sync-board-config.mjs` para el Blender, (c) actualizar manualmente el backend si éste necesita el dato. Esta cadena manual genera drift.
- El backend Go actualmente no conoce los nombres ni precios de las casillas: los infiere del estado de juego que llega del cliente. Si en el futuro el backend necesita validar compras o rentas, necesita esos datos.
- Agregar soporte multi-tablero (e.g. tablero en inglés, tablero temático) requiere una tabla en DB para poder seleccionarlo al crear una partida y ocultar/mostrar versiones.
- Los tokens nuevos (`dog.glb`, `cat.glb`, `crown.glb`, `key.glb`, `pork.glb`, `train.glb`, `tacon.glb`) ya existen en `public/models/users/` pero no están registrados en `GAME_CONFIG.TOKEN_MODELS` ni en DB.
- La duplicidad actual: precios en TS → frontend, precios en TS → Blender Python, precios eventualmente → backend Go = tres lugares para mantener en sinc.

## Análisis Técnico

### Estado actual del flujo de datos

```
boardTilesConfig.ts
    │
    ├─► [frontend] BOARD_TILES[] → renderizado, compras, rentas (client-side)
    │
    ├─► sync-board-config.mjs → scripts_blenders/create_monopoly_table.py
    │       (TILE_GROUPS, TILE_INFO, TILE_COLORS)
    │
    └─► [backend Go] NO CONOCE los tiles — el cliente envía estado completo
```

### Flujo propuesto

```
boardTilesConfig.ts (fuente autoral humana — sigue siendo editada a mano)
    │
    └─► scripts/sync-all.mjs (nuevo punto de entrada)
            │
            ├─► scripts_blenders/create_monopoly_table.py  [sin cambios]
            │
            └─► DB (upsert boards + board_tiles + tokens)
                    │
                    ├─► backend Go lee de DB para validaciones
                    └─► frontend puede consultar boards disponibles via API
```

### Tablas nuevas en DB

#### `boards`
| col | tipo | descripción |
|-----|------|-------------|
| id | uuid PK | |
| slug | text UNIQUE | e.g. `monopoly-es`, `monopoly-en` |
| locale | text | `es`, `en`, etc. |
| display_name | text | "Monopoly Clásico" |
| glb_path | text | `/models/tablero.glb` (relativo a `public/`) |
| visible | boolean | si aparece en la lobby |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `board_tiles`
| col | tipo | descripción |
|-----|------|-------------|
| id | uuid PK | |
| board_id | uuid FK → boards | |
| tile_index | int | 0-39 |
| tile_type | text | `corner`, `property`, `railroad`, `utility`, `tax`, `card` |
| tile_group | text | `brown`, `railroad`, etc. |
| name | text | nombre localizado |
| short_name | text | nombre corto |
| price | int nullable | precio de compra |
| color_hex | text nullable | `#C9543C` |

Índice UNIQUE en `(board_id, tile_index)`.

#### `tokens`
| col | tipo | descripción |
|-----|------|-------------|
| id | uuid PK | |
| slug | text UNIQUE | e.g. `sombrero`, `dog` |
| glb_path | text | `/models/users/sombrero.glb` |
| label_key | text | clave i18n en `locales/index.ts` |
| visible | boolean | si aparece en la selección de ficha |
| sort_order | int | orden en UI |

### Dependencias identificadas

- `backend/internal/store/migrations/` — agregar migración `003_boards_tiles_tokens.sql`
- `scripts/sync-board-config.mjs` — extender o refactorizar en `sync-all.mjs`
- `config/boardTilesConfig.ts` — fuente de datos, no se modifica la estructura
- `config/gameConfig.ts` — `TOKEN_MODELS` se puede deprecar en favor de query a DB
- Backend Go — nuevo repositorio `BoardRepository` para leer tableros/tiles desde DB
- Frontend — nuevo composable o store para cargar tableros disponibles al crear partida

### Riesgos técnicos

1. **El backend Go no usa ORM**: las migraciones son SQL manual; el nuevo código Go deberá usar `database/sql` con queries directas, siguiendo el patrón existente en `backend/internal/store/`.
2. **El frontend carga `boardTilesConfig.ts` directamente** en muchos lugares (`useBoardGeometry`, `gameStore`, etc.). La migración hacia DB debe ser progresiva: el TS config sigue siendo la fuente para el frontend en la fase 1; en la fase 2 podría ser sustituido por una llamada de API.
3. **Sincronización del `.glb`**: el script de sync puede verificar que el archivo existe en `public/models/` pero no puede subirlo a ningún CDN. El campo `glb_path` en DB es solo un registro de la ruta esperada.
4. **Multi-tablero y el script Blender**: hoy `sync-board-config.mjs` asume un solo tablero. Si hay múltiples tableros con tiles distintos, el script Blender necesita un argumento `--board <slug>` para seleccionar cuál generar.

## Plan de Implementación

### Archivos a crear

- `backend/internal/store/migrations/003_boards_tiles_tokens.sql` — DDL de las tres nuevas tablas
- `backend/internal/store/board_repository.go` — queries Go para leer boards, tiles y tokens
- `scripts/sync-db.mjs` — script Node que lee `boardTilesConfig.ts` + `gameConfig.ts` y hace upsert en DB
- `scripts/sync-all.mjs` — punto de entrada que llama a `sync-board-config.mjs` (Blender) y a `sync-db.mjs` (DB)

### Archivos a modificar

- `scripts/sync-board-config.mjs` — extraer lógica de parseo de TS en función reutilizable llamada por `sync-all.mjs`
- `config/gameConfig.ts` — agregar `TOKEN_SLUGS` (lista de slugs canónicos) como comentario de referencia; `TOKEN_MODELS` no se elimina todavía
- `package.json` — agregar script `"sync": "node scripts/sync-all.mjs"`
- `backend/internal/game/state.go` — agregar campo `BoardSlug string` a `GameState` para que el backend sepa qué tablero está siendo jugado

### Pasos ordenados

1. Escribir y aplicar migración SQL `003_boards_tiles_tokens.sql` con las tres tablas.
2. Crear `scripts/sync-db.mjs`:
   - Leer `config/boardTilesConfig.ts` (reusar parser de `sync-board-config.mjs`)
   - Hacer upsert del board canónico por defecto (`slug=monopoly-es`, `locale=es`, `visible=true`, `glb_path=/models/tablero.glb`)
   - Hacer upsert de los 40 `board_tiles` ligados al board anterior
   - Leer `public/models/users/` para listar `.glb` disponibles
   - Hacer upsert de todos los tokens encontrados (marcar como `visible=false` los que no estén en `GAME_CONFIG.TOKEN_MODELS`)
3. Crear `scripts/sync-all.mjs` que encadena Blender sync + DB sync con logging.
4. Actualizar `package.json` con el script `sync`.
5. Crear `backend/internal/store/board_repository.go` con:
   - `GetVisibleBoards(locale string) ([]Board, error)`
   - `GetBoardTiles(boardID uuid) ([]BoardTile, error)`
   - `GetVisibleTokens() ([]Token, error)`
6. Agregar `BoardSlug string` a `GameState` en Go y propagarlo al crear una partida.
7. (Fase 2, fuera de este spec) Migrar frontend para consultar tableros disponibles vía API en lugar de hardcodearlos.

## Criterios de Aceptación

- [x] Existe migración `003` aplicable que crea `boards`, `board_tiles` y `tokens` sin errores.
- [x] `node scripts/sync-all.mjs` popula las tres tablas con los datos de `boardTilesConfig.ts` y los `.glb` de `public/models/users/`.
- [x] Ejecutar el script dos veces es idempotente (upsert, no inserts duplicados).
- [x] El board por defecto tiene `visible=true`, `locale=es`, y exactamente 40 tiles en `board_tiles`.
- [x] Todos los tokens que existen como `.glb` en `public/models/users/` aparecen en la tabla `tokens`; los que estaban en `TOKEN_MODELS` tienen `visible=true`.
- [x] `GetVisibleBoards("es")` en Go retorna al menos el tablero canónico.
- [x] El script Blender sigue funcionando igual que antes (sin regresión en `sync-board-config.mjs`).
- [x] No hay cambios en el comportamiento del juego en frontend ni backend (cambio es aditivo).

## Notas

- **Fase 1 vs Fase 2**: Este spec cubre solo la fase 1 (DB como registro, sync script, leer desde backend). La fase 2 (frontend consulta API para listar tableros al crear partida, selector de tablero en lobby) es trabajo separado y depende de este spec.
- **Fuente de verdad editorial**: `boardTilesConfig.ts` sigue siendo la fuente que un humano edita. La DB es el espejo sincronizado. Nunca editar la DB directamente; siempre editar el TS y correr `sync`.
- **Internacionalización de tiles**: hoy `boardTilesConfig.ts` solo tiene nombres en español. Si en el futuro se agrega un tablero en inglés, se creará un segundo array `BOARD_TILES_EN` o un archivo separado `config/boardTilesConfigEn.ts` que el script `sync-db.mjs` también procesará.
- **Alternativa descartada — Prisma**: se evaluó usar Prisma como ORM para las migraciones, pero el backend es Go y el proyecto usa SQL manual. Mantener consistencia con el patrón existente es prioritario.
- **Alternativa descartada — JSON en lugar de tablas relacionales**: almacenar los tiles como JSONB dentro de `boards` sería más simple, pero perdería la capacidad de hacer queries por `tile_group` o `price` desde el backend cuando sea necesario para validaciones de renta.
