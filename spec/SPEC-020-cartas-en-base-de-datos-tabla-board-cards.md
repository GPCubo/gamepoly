---
id: SPEC-020
title: Cartas en base de datos — tabla board_cards, sync script y eliminación de hardcoding en Go/TS
created_at: 2026-06-14T00:00:00
status: draft
---

# SPEC-020: Cartas en base de datos — tabla board_cards, sync script y eliminación de hardcoding en Go/TS

## Descripción

Las 32 cartas del juego (16 de Suerte + 16 de Arca Comunal) están actualmente hardcodeadas en dos lugares:
- `config/boardTilesConfig.ts` → `CHANCE_CARDS[]`, `COMMUNITY_CARDS[]`
- `backend/internal/config/boardtiles.go` → `ChanceCards []GameCard`, `CommunityCards []GameCard`

Este spec propone:

1. Crear tabla `board_cards` en PostgreSQL: una fila por carta, ligada al `board_id`.
2. Extender `scripts/sync-db.mjs` para hacer upsert de las 32 cartas leyendo desde `boardTilesConfig.ts`.
3. Extender `board_repository.go` con `GetBoardCards(boardID)`.
4. Al cargar el `BoardRegistry` en `main.go`, cargar también las cartas desde DB y asignarlas al `BoardConfig` en lugar de usar `config.ChanceCards` / `config.CommunityCards`.
5. Eliminar `ChanceCards` y `CommunityCards` de `boardtiles.go` (en Go) y de `boardTilesConfig.ts` (en TS). Los arrays hardcodeados dejan de ser la fuente activa.

**Este spec debe implementarse ANTES de SPEC-019** porque el endpoint `GET /api/v1/boards/:slug` de SPEC-019 debe servir cartas desde DB. Si este spec va primero, ese endpoint queda completo en un solo paso y nunca se necesita el archivo `config/cards.go` previsto en SPEC-019.

## Contexto y Motivación

- Las cartas tienen una relación directa con los tiles: 8 de las 32 usan `tileIndex` para referenciar una casilla específica. El texto dice `{tileName}` y se resuelve en runtime con el nombre real de la casilla. Si se cambia el nombre de una casilla en DB pero el texto de la carta sigue hardcodeado, hay una inconsistencia semántica ("Avanza a Estación Norte" cuando la casilla ahora se llama "Estación Central").
- Las cartas definen mecánicas de juego — cobros, pagos, movimientos forzados — igual que los precios de los tiles. Deben vivir en la misma fuente de verdad (DB).
- En un tablero en inglés, las cartas deben tener texto en inglés. Con hardcoding esto requiere un nuevo array en código; con DB basta insertar filas para el nuevo `board_id`.
- Es el último bloque de datos del juego que no está en DB. Una vez completado, `boardtiles.go` y `boardTilesConfig.ts` no contienen ningún dato del tablero.

## Análisis Técnico

### Estructura de una carta

```ts
// Campos de GameCard en boardTilesConfig.ts
{
  id: "ch01",           // identificador único dentro del mazo
  group: "chance",      // "chance" | "community"
  text: "Avanza a {tileName}. Cobra $200.",  // puede contener {tileName}
  action: "moveTo",     // acción del engine: moveTo | moveSteps | collect | pay | payEach | goToJail
  tileIndex: 0,         // opcional — índice 0-39 de la casilla destino
  amount: undefined,    // opcional — cantidad en $ (positivo = cobrar, negativo = pagar)
}
```

### Cartas que referencian tiles (8 de 32)

| ID | Acción | tileIndex | Casilla referenciada |
|---|---|---|---|
| ch01 | moveTo | 0 | Salida |
| ch02 | moveTo | 11 | Paseo del Prado |
| ch03 | moveTo | 8 | Calle de Alcala |
| ch04 | moveTo | 5 | Estacion Norte |
| ch05 | moveTo | 25 | Estacion Sur |
| ch07 | goToJail | 10 | Carcel |
| ch14 | moveTo | 24 | Paseo de la Reforma |
| ch15 | moveTo | 34 | Avenida Diagonal |
| co01 | moveTo | 0 | Salida |
| co07 | goToJail | 10 | Carcel |

Cuando el nombre de la casilla cambia en DB, el texto de la carta se resuelve automáticamente con el nuevo nombre — el texto en DB almacena el template `{tileName}`, no el nombre final.

### Nueva tabla `board_cards`

```sql
CREATE TABLE IF NOT EXISTS board_cards (
    id          BIGSERIAL    PRIMARY KEY,
    board_id    BIGINT       NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    card_group  TEXT         NOT NULL,   -- 'chance' | 'community'
    card_index  INT          NOT NULL,   -- posición 0-15 dentro del mazo
    card_id     TEXT         NOT NULL,   -- 'ch01', 'co07', etc.
    text        TEXT         NOT NULL,   -- puede contener {tileName}
    action      TEXT         NOT NULL,   -- 'moveTo'|'moveSteps'|'collect'|'pay'|'payEach'|'goToJail'
    amount      INT,                     -- nullable — $$ involucrados
    tile_index  INT,                     -- nullable — índice 0-39 de casilla destino
    CONSTRAINT uq_board_card UNIQUE (board_id, card_group, card_index)
);

CREATE INDEX IF NOT EXISTS idx_bc_board ON board_cards(board_id);
```

### Conversión `store.BoardCard` → `config.GameCard`

```go
// store.BoardCard
type BoardCard struct {
    ID        int64
    BoardID   int64
    CardGroup string
    CardIndex int
    CardID    string
    Text      string
    Action    string
    Amount    *int
    TileIndex *int
}

// config.GameCard (existente)
type GameCard struct {
    ID        string
    Group     string
    Text      string
    Action    CardActionType
    Amount    *int
    TileIndex *int
}
```

La conversión es trivial. La única lógica: las 16 cartas de cada grupo se ordenan por `card_index` para mantener el orden del mazo.

### Cambios en `boardconfig.go`

`BoardRegistry.Register` recibe dos nuevos parámetros:
```go
func (r *BoardRegistry) Register(slug, locale, displayName, glbPath string,
    tiles []config.BoardTile,
    chanceCards []config.GameCard,
    communityCards []config.GameCard,
) { ... }
```

Si `chanceCards` o `communityCards` tienen longitud 0 (DB vacía), `Register` fallback a `config.ChanceCards` / `config.CommunityCards` con un log de advertencia — garantiza que el juego nunca arranca con mazo vacío.

### Cambios en `sync-db.mjs`

Extender el paso de upsert para parsear `CHANCE_CARDS` y `COMMUNITY_CARDS` desde `boardTilesConfig.ts`:

```js
// Regex pattern para parsear arrays de cartas (similar al parser de tiles)
// Campos: id, group, text, action, amount?, tileIndex?
```

Upsert por `(board_id, card_group, card_index)` — idempotente.

### Impacto en `boardtiles.go`

Después de este spec, `boardtiles.go` contiene:
- Tipos: `TileType`, `CardActionType`, `BoardTile`, `GameCard` — siguen siendo necesarios
- Funciones eliminadas: `GetTile`, `GetGroupTiles`, `GetOwnableTile`, `ShuffleDeck`, `ResolveCardText`, `intPtr` — ya sin uso desde SPEC-018
- Arrays eliminados: `ChanceCards`, `CommunityCards`, `BoardTiles` — migrados a DB
- Lo que queda: solo definiciones de tipos y constantes de enums

→ En práctica `boardtiles.go` queda tan pequeño que puede renombrarse a `types.go` (trabajo de SPEC-019).

### Dependencias

- Depende de SPEC-017 (tabla `boards` existe)
- Depende de SPEC-018 (`BoardRegistry.Register` ya existe con la firma actual)
- SPEC-019 **depende de este spec**: el endpoint de boards debe servir cartas desde DB

## Plan de Implementación

### Archivos a crear

- `backend/internal/store/migrations/004_board_cards.sql` — DDL de `board_cards`

### Archivos a modificar

- `backend/internal/store/board_repository.go` — agregar `BoardCard` struct + `GetBoardCards(ctx, boardID int64) ([]BoardCard, error)`
- `backend/internal/game/boardconfig.go` — actualizar `Register(...)` para recibir `chanceCards, communityCards`; actualizar `DefaultBoardConfig()` para construir `BoardConfig` sin depender de `config.ChanceCards`
- `backend/cmd/server/main.go` — en `loadBoardsIntoRegistry`, también cargar cartas con `GetBoardCards` y pasarlas a `Register`
- `scripts/sync-db.mjs` — parsear y upsert de `CHANCE_CARDS` + `COMMUNITY_CARDS`

### Archivos a limpiar (sin eliminar todavía)

- `backend/internal/config/boardtiles.go` — eliminar `ChanceCards`, `CommunityCards`, `intPtr`; dejar solo tipos (preparación para SPEC-019)
- `config/boardTilesConfig.ts` — no se toca en este spec (SPEC-019 lo elimina)

### Pasos ordenados

1. Escribir y aplicar migración `004_board_cards.sql`.
2. Agregar `BoardCard` struct y `GetBoardCards` en `board_repository.go`.
3. Actualizar `boardconfig.go`: `Register` acepta `chanceCards, communityCards []config.GameCard`; fallback a `config.ChanceCards/CommunityCards` si vienen vacíos.
4. Actualizar `main.go`: `loadBoardsIntoRegistry` llama `GetBoardCards`, convierte a `config.GameCard[]`, pasa a `Register`.
5. Extender `scripts/sync-db.mjs`: parser de cartas + upsert.
6. Correr `npm run sync:db` en local y verificar que `board_cards` tiene 32 filas.
7. Eliminar `ChanceCards`, `CommunityCards`, `intPtr` de `boardtiles.go`.
8. Compilar backend: `go build ./...`.
9. Reiniciar servidor, verificar logs: `[board] registered 'monopoly-es' (40 tiles, 32 cards)`.
10. Correr `go test ./...` — todos los tests deben pasar.

## Criterios de Aceptación

- [ ] Migración `004` crea tabla `board_cards` sin errores.
- [ ] `npm run sync:db` popula 32 filas en `board_cards` (16 chance + 16 community) para `monopoly-es`.
- [ ] Ejecutar el sync dos veces es idempotente.
- [ ] El servidor arranca con log `[board] registered 'monopoly-es' (40 tiles, 32 cards)`.
- [ ] `config.ChanceCards` y `config.CommunityCards` ya no existen en `boardtiles.go`.
- [ ] `go build ./...` compila sin errores.
- [ ] `go test ./...` pasa sin errores.
- [ ] Las cartas que referencian tiles (ej. ch01 → tileIndex 0) resuelven el nombre correcto cuando cambia el nombre del tile en DB.

## Notas

- **Orden de implementación**: SPEC-020 → SPEC-019. El endpoint de SPEC-019 sirve tiles + cards; si las cards vienen de DB desde el principio, el endpoint queda completo sin `config/cards.go` intermedio.
- **Fallback si DB no tiene cartas**: `Register` detecta `len(chanceCards) == 0` y usa el fallback de `config.ChanceCards`. Esto garantiza que el juego no se rompe si la migración corre pero `sync:db` aún no ha populado las cartas. El fallback se loguea como advertencia.
- **Textos con `{tileName}`**: el template se guarda tal cual en DB. La resolución ocurre en `BoardConfig.ResolveCardText(card)` al sacar la carta del mazo, usando el nombre real del tile del mismo `BoardConfig`. Si el tile renombra, el texto se resuelve al instante sin tocar las cartas.
- **Internacionalización**: las cartas en inglés para un tablero `monopoly-en` son simplemente nuevas filas en `board_cards` con el `board_id` del tablero en inglés y `text` en inglés. El modelo de datos ya lo soporta sin cambios de schema.
- **Alternativa descartada — JSONB en boards**: almacenar las cartas como array JSONB dentro de la tabla `boards` en lugar de tabla separada. Se descartó por consistencia con el patrón de `board_tiles` (tabla separada) y para poder hacer queries por `action` o `tile_index` en el futuro.
