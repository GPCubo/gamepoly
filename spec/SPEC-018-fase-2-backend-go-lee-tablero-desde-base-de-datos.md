---
id: SPEC-018
title: Fase 2: eliminar duplicidad de tiles — backend Go lee tablero desde base de datos en lugar de array hardcodeado
created_at: 2026-06-14T00:00:00
status: done
---

# SPEC-018: Fase 2: eliminar duplicidad de tiles — backend Go lee tablero desde base de datos en lugar de array hardcodeado

## Descripción

Actualmente el backend Go tiene los 40 tiles del tablero hardcodeados en `backend/internal/config/boardtiles.go` como un array global `BoardTiles`. Este array es accedido directamente en ~54 call sites distribuidos por el engine, validadores, bot, historial y orquestador. La DB (poblada en SPEC-017) tiene esos mismos tiles en la tabla `board_tiles`, pero el backend aún no los usa — solo existen como registro.

Este spec propone:

1. Crear un struct `BoardConfig` en Go que encapsule los tiles y cartas de un tablero específico, con los mismos métodos de lookup que hoy provee el paquete `config` (`GetTile`, `GetGroupTiles`, `GetOwnableTile`, etc.).
2. Crear un `BoardRegistry` que al arrancar el servidor carga todos los tableros visibles desde DB y los cachea en memoria. Fallback: si DB no está disponible, usa el array hardcodeado de `boardtiles.go`.
3. Agregar un campo `Board *BoardConfig` a `GameState`, inicializado al crear la partida según el `BoardSlug` de la sala.
4. Reemplazar los ~54 call sites de `config.GetTile(...)`, `config.BoardTiles`, etc. por llamadas a `gs.Board.GetTile(...)` y `gs.Board.Tiles`.
5. El array `BoardTiles` y las funciones package-level en `boardtiles.go` se conservan únicamente como fallback/default — dejan de ser la fuente activa en producción.

Las cartas (`ChanceCards`, `CommunityCards`) también pasan a vivir dentro de `BoardConfig`, aunque siguen siendo data hardcodeada en Go por ahora (no están en DB).

`config/boardTilesConfig.ts` (frontend) **no cambia** en este spec — es trabajo de Fase 3.

## Contexto y Motivación

- `boardtiles.go` y `boardTilesConfig.ts` son copias manuales del mismo dato. Cualquier cambio de precio o nombre en el TS requiere también actualizar el Go a mano o la partida queda inconsistente.
- Con SPEC-017 ya tenemos `board_tiles` en DB y un sync script. La DB es ahora la fuente publicada. Falta que el backend la lea.
- La tabla `boards` tiene un campo `visible` y `locale` para multi-tablero. El backend no puede servir múltiples tableros mientras lea de un array global fijo.
- `GameState.BoardSlug` se agregó en SPEC-017 pero está vacío — este spec lo conecta con el `BoardRegistry`.

## Análisis Técnico

### Call sites por archivo (54 total identificados)

| Archivo | Función config usada | Count |
|---|---|---|
| `engine.go` | `GetTile`, `GetOwnableTile`, `BoardTiles`, `ChanceCards`, `CommunityCards`, `ShuffleDeck` | ~18 |
| `validators.go` | `GetGroupTiles`, `GetOwnableTile`, `GetTile` | ~9 |
| `bot.go` | `GetGroupTiles`, `GetOwnableTile` | ~5 |
| `orchestrator.go` | `ChanceCards`, `CommunityCards`, `ShuffleDeck` | ~4 |
| `helpers.go` | `GetOwnableTile`, `ResolveCardText` (wrappers públicos) | ~2 |
| `history.go` | `GetTile`, `ResolveCardText` | ~3 |
| `scenario_seeds.go` | `BoardTiles` (itera todos) | ~2 |

Todas las funciones en `engine.go`, `validators.go`, `bot.go`, `orchestrator.go`, `history.go`, `scenario_seeds.go` reciben `*GameState` como parámetro o son métodos sobre él — el cambio `config.X(...)` → `gs.Board.X(...)` es mecánico y uniforme.

### Struct `BoardConfig` propuesto

```go
// backend/internal/game/boardconfig.go
type BoardConfig struct {
    Slug         string
    Locale       string
    DisplayName  string
    GLBPath      string
    Tiles        []config.BoardTile   // los 40 tiles
    ChanceCards  []config.GameCard    // 16 cartas — hardcodeadas por ahora
    CommunityCards []config.GameCard  // 16 cartas — hardcodeadas por ahora
}

func (b *BoardConfig) GetTile(index int) *config.BoardTile
func (b *BoardConfig) GetGroupTiles(group string, tileType config.TileType) []config.BoardTile
func (b *BoardConfig) GetOwnableTile(index int) *config.BoardTile
func (b *BoardConfig) ShuffleDeck(size int) []int  // Fisher-Yates, seed from time
```

### `BoardRegistry` propuesto

```go
// backend/internal/game/boardconfig.go
type BoardRegistry struct {
    mu      sync.RWMutex
    boards  map[string]*BoardConfig  // keyed by slug
    default *BoardConfig             // "monopoly-es" fallback
}

func NewBoardRegistry(repo *store.BoardRepository) *BoardRegistry
func (r *BoardRegistry) Load(ctx context.Context) error  // carga desde DB
func (r *BoardRegistry) Get(slug string) *BoardConfig    // fallback a default si slug vacío
```

Al arrancar el servidor (`main.go` o equivalente), se llama `registry.Load(ctx)` una vez. En producción no hay queries durante el juego.

### Cambio en `GameState`

```go
// state.go — ya tiene BoardSlug string
Board *BoardConfig `json:"-"`   // no serializado, solo runtime
```

El campo `Board` se inicializa en `SetupGame` via `registry.Get(gs.BoardSlug)`.

### Fallback sin DB

Si `ENABLE_FINISHED_GAME_PERSISTENCE=false` (dev local sin DB), `BoardRegistry.Load` usa el array hardcodeado de `config.BoardTiles` como único board con slug `"monopoly-es"`. El juego funciona exactamente igual que hoy.

### Riesgo: shuffle determinista vs aleatorio

`config.ShuffleDeck` usa un seed fijo (42) con LCG — útil para tests reproducibles (`scenario_seeds`). El `BoardConfig.ShuffleDeck` usará `math/rand` con seed de tiempo para producción. Los tests de `scenario_seeds.go` necesitan un modo de seed fijo — se puede pasar via opción o inyección.

### Dependencias

- Depende de SPEC-017 (tablas `boards`, `board_tiles` deben existir, `BoardRepository` ya implementado)
- `backend/internal/store/board_repository.go` — ya implementado, tiene `GetVisibleBoards` y `GetBoardTiles`
- `config.BoardTile`, `config.GameCard` — structs reutilizados; `boardtiles.go` no desaparece, solo deja de ser la fuente activa

## Plan de Implementación

### Archivos a crear

- `backend/internal/game/boardconfig.go` — struct `BoardConfig` + `BoardRegistry` + métodos de lookup

### Archivos a modificar

- `backend/internal/game/state.go` — agregar `Board *BoardConfig` (no serializado)
- `backend/internal/game/orchestrator.go` — `SetupGame` recibe `*BoardConfig`; inicializa `gs.Board`; usa `gs.Board.ChanceCards` etc.
- `backend/internal/game/engine.go` — reemplazar ~18 calls a `config.X` por `gs.Board.X`
- `backend/internal/game/validators.go` — reemplazar ~9 calls
- `backend/internal/game/bot.go` — reemplazar ~5 calls
- `backend/internal/game/helpers.go` — actualizar wrappers públicos
- `backend/internal/game/history.go` — reemplazar ~3 calls
- `backend/internal/game/scenario_seeds.go` — reemplazar iteración de `config.BoardTiles`
- `backend/cmd/server/main.go` (o equivalente) — instanciar `BoardRegistry`, llamar `Load`, pasarlo al hub/table factory
- `backend/internal/table/table.go` — `NewTable` recibe `*BoardConfig` o slug y lo pasa a `SetupGame`

### Pasos ordenados

1. Crear `boardconfig.go` con `BoardConfig` (Tiles + Cards + métodos de lookup) y `BoardRegistry` (Load desde DB + fallback hardcodeado).
2. Agregar `Board *BoardConfig` a `GameState` en `state.go` (campo runtime, `json:"-"`).
3. Actualizar `SetupGame` en `orchestrator.go`: recibir `*BoardConfig`, asignarlo a `gs.Board`, usar `gs.Board.ChanceCards` y `gs.Board.CommunityCards` en lugar de los del paquete `config`.
4. Actualizar `engine.go`: reemplazar todas las llamadas `config.GetTile(x)` → `gs.Board.GetTile(x)`, `config.BoardTiles` → `gs.Board.Tiles`, etc.
5. Actualizar `validators.go`, `bot.go`, `helpers.go`, `history.go`, `scenario_seeds.go` de la misma forma.
6. Instanciar `BoardRegistry` en `main.go`, llamar `Load(ctx)`, inyectarlo en la factory de tablas.
7. Actualizar `NewTable` en `table.go` para recibir `*BoardRegistry` y resolver el `BoardConfig` por slug al crear la partida.
8. Verificar que con `ENABLE_FINISHED_GAME_PERSISTENCE=false` el servidor arranca y juega normalmente (fallback al hardcodeado).
9. Verificar que con DB activa, los tiles que llegan al engine son los de la tabla `board_tiles` (precio, nombre, grupo) — no los de `boardtiles.go`.
10. Compilar y desplegar: `go build ./...` sin errores.

## Criterios de Aceptación

- [x] `go build ./...` compila sin errores después del refactor.
- [x] Con `ENABLE_FINISHED_GAME_PERSISTENCE=false`, el servidor arranca y una partida solitario completa puede jugarse (fallback a config hardcodeada).
- [x] Con DB activa, `BoardRegistry.Load` carga los tiles de `board_tiles` y una partida usa esos datos (verificable cambiando un precio en DB y confirmando que `CalculateRent` usa el nuevo valor).
- [x] No hay ninguna llamada directa a `config.BoardTiles`, `config.GetTile`, `config.GetGroupTiles`, `config.GetOwnableTile` en `engine.go`, `validators.go`, `bot.go`, `orchestrator.go`, `history.go`, `scenario_seeds.go` — todas reemplazadas por `gs.Board.*`.
- [x] `GameState.Board` nunca es `nil` durante el juego (panic-safe: `SetupGame` siempre lo inicializa).
- [x] Los tests existentes en `start_order_test.go` siguen pasando.
- [x] El array `config.BoardTiles` y las funciones del paquete `config` siguen compilando (no se eliminan) para no romper ningún import residual.

## Notas

- **Las cartas quedan en Go por ahora**: `ChanceCards` y `CommunityCards` no están en DB ni en el script `sync-db.mjs`. Viven dentro de `BoardConfig` como datos hardcodeados. Esto deja abierto agregar una tabla `board_cards` en Fase 3 sin cambiar la interfaz.
- **`boardTilesConfig.ts` no cambia**: el frontend sigue leyendo del archivo TS. La convergencia frontend ↔ DB es Fase 3 (endpoint de API que devuelve los tiles del board activo).
- **Multi-tablero**: una vez implementado este spec, crear un segundo tablero (e.g. `monopoly-en`) solo requiere insertar en DB via `sync-db.mjs` y pasar el `BoardSlug` correcto al crear la partida — sin tocar código Go.
- **Alternativa descartada — pasar `[]BoardTile` como parámetro en cada función**: demasiado ruidoso; 54 firmas de función cambian. Poner `Board` en `GameState` es el menor cambio de superficie.
- **Shuffle no determinista en producción**: el shuffle de cartas usará `rand.Shuffle` con `time.UnixNano()` como seed. Los tests que necesiten reproducibilidad pueden inyectar un `BoardConfig` con deck pre-ordenado.
