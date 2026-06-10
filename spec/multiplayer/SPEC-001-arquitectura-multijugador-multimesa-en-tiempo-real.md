---
id: SPEC-004
title: Arquitectura multijugador multi-mesa en tiempo real
created_at: 2026-06-10T00:00:00
status: in-progress
---

# SPEC-004: Arquitectura multijugador multi-mesa en tiempo real

## Descripción

Diseñar e implementar un backend y un flujo de frontend exclusivo para el modo **Multijugador** de `pages/index.vue` (actualmente deshabilitado con badge "Próximamente"). Los modos **Bots** y **Familiar** —que usan `pages/game.vue` y `stores/gameStore.ts`— no se tocan en ninguna fase de este spec.

El servidor es la autoridad única del estado del juego multijugador: valida cada acción, lanza los dados, gestiona turnos y transmite el estado a todos los clientes conectados. El frontend multiplayer es una ruta nueva y separada que convive con el juego local sin interferir.

---

## Restricción crítica: aislamiento de modos

```
pages/index.vue          → sin cambios (salvo habilitar el tab "Multijugador")
pages/game.vue           → SIN CAMBIOS (usado por Bots y Familiar)
stores/gameStore.ts      → SIN CAMBIOS
composables/useBotTurn   → SIN CAMBIOS
composables/useBotEngine → SIN CAMBIOS
```

Todo el código nuevo vive en rutas y stores propios:

```
pages/multiplayer/
  lobby.vue              → crear / unirse a mesa
  game.vue               → partida multijugador (ruta nueva)
stores/
  multiplayerStore.ts    → estado sincronizado con WS (nuevo, no toca gameStore)
composables/
  useGameSocket.ts       → conexión WebSocket (nuevo)
backend/                 → servidor Go completamente nuevo
```

---

## Contexto y Motivación

El juego local (`pages/game.vue` + `stores/gameStore.ts`) es totalmente funcional para los modos Bots y Familiar. Este spec añade el modo Multijugador como una capa paralela sin tocar nada de lo existente.

Para soportar varias personas en red es necesario:

1. Un servidor autoritativo que garantice integridad del estado (no se puede confiar en el cliente para los dados ni para las validaciones).
2. Un canal de comunicación bidireccional de baja latencia (los eventos de juego deben llegar a todos los jugadores en <100 ms).
3. Persistencia asíncrona para conservar partidas terminadas y estadísticas sin bloquear el ciclo de juego.
4. Escalabilidad horizontal para soportar N mesas concurrentes con independencia entre ellas.

---

## Análisis Técnico

### 1. Auditoría del código actual

| Artefacto | Líneas | Acción en este spec |
|---|---|---|
| `stores/gameStore.ts` | 1 518 | **NO TOCAR** — solo usado por Bots/Familiar |
| `pages/game.vue` | ~1 100 | **NO TOCAR** — ruta exclusiva de Bots/Familiar |
| `composables/useBotEngine.ts` | ~400 | **NO TOCAR** — IA local, se porta al servidor sin cambiar el original |
| `composables/useBotTurn.ts` | ~200 | **NO TOCAR** |
| `config/*.ts` | ~700 | Leer como referencia; duplicar en Go como fuente de verdad del servidor |
| `components/*.vue` | ~500+ | **NO TOCAR** — algunos reutilizados en `pages/multiplayer/game.vue` |
| `pages/index.vue` | ~510 | **Cambio mínimo**: habilitar el tab "Multijugador" y añadir su ruta |
| Backend | 0 | Greenfield completo |

El frontend local queda **intacto**. Solo se añaden archivos nuevos y una línea de cambio en `pages/index.vue`.

---

### 2. Selección de tecnologías

#### Backend principal: **Go**

Justificación técnica para este caso de uso concreto:

- **Goroutines**: cada mesa del juego vive en su propia goroutine (stack de 2 KB vs 1 MB de un thread OS). Con 100 mesas activas el servidor usa ~200 KB solo en goroutines de mesas.
- **Channels nativos**: la goroutine de la mesa lee de un channel `inbox chan Action`. No hay locks, no hay condiciones de carrera. El estado de la partida lo posee una sola goroutine → thread-safe por diseño.
- **WebSocket**: `gorilla/websocket` o `nhooyr.io/websocket` son maduros y de alta performance.
- **JSON**: `encoding/json` estándar es suficiente; `bytedance/sonic` si se necesita serialización más rápida.
- **Driver Redis**: `redis/go-redis/v9` con pool de conexiones.
- **Driver PostgreSQL**: `jackc/pgx/v5` (más rápido que `database/sql` estándar).

**Por qué no Node/Bun**: la ventaja de Node sería reutilizar el TypeScript del gameStore sin portar. Pero el event loop single-threaded obliga a Workers para CPU isolation, la memoria por conexión WS es mayor, y el modelo de concurrencia es más complejo de razonar bajo carga. Go es la elección correcta dado que el usuario ya lo tiene considerado.

**Por qué no Elixir/Phoenix**: Phoenix Channels son técnicamente superiores para este patrón (actor model = mesa como GenServer), pero el equipo no tiene experiencia previa y el coste de aprendizaje no se justifica.

**Por qué no Rust**: máxima performance, pero el tiempo de implementación es 3-4× respecto a Go para el mismo feature set.

#### Canal de comunicación: **WebSocket (texto JSON)**

- Bidireccional nativo: el servidor puede hacer push sin polling.
- `store.isDiceVisible`, `store.moveEvent`, cambios de `activePlayerIndex` etc. requieren push inmediato del servidor al cliente.
- Alternativa SSE descartada: unidireccional (servidor→cliente), las acciones del jugador necesitarían HTTP separado.

#### Cache / estado activo / pub-sub: **Redis 7+**

Redis cumple tres roles distintos:

| Rol | Estructura | TTL |
|---|---|---|
| Estado de partida activa | `STRING table:{id}:state` (JSON comprimido) | 2 h sin actividad |
| Sesiones de jugador | `HASH session:{token}` → `{playerId, tableId, serverInstance}` | 1 h |
| Lobby (mesas abiertas) | `ZSET lobby:open` (score = created_at unix) | — |
| Pub/Sub multi-servidor | Channel `table:{id}:events` | — |
| Heartbeat/presencia | `STRING player:{id}:heartbeat` | TTL = 15 s, renovado cada 10 s |
| Rate limiting | `STRING ratelimit:{playerId}:{action}` | ventana deslizante 1 s |

El estado de la partida (~5-10 KB JSON) cabe perfectamente en Redis. Las escrituras son atómicas con `SET` + `EX`. No se necesita Lua ni WATCH para este volumen.

#### Persistencia: **PostgreSQL 16**

- Solo se escribe al **finalizar** la partida (ganador declarado) o por **timeout** (mesa sin actividad >2 h).
- Durante el juego activo PostgreSQL **no se toca** → cero latencia de DB en el hot path.
- JSONB para el estado final y el histórico de eventos.

```sql
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id    TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ,
    winner_id   TEXT,
    config      JSONB NOT NULL,   -- reglas usadas (goSalary, jailBailCost, etc.)
    final_state JSONB,            -- snapshot completo al finalizar
    history     JSONB,            -- economicHistory completo
    player_ids  TEXT[] NOT NULL
);

CREATE TABLE player_stats (
    player_id    TEXT PRIMARY KEY,
    games_played INT  DEFAULT 0,
    games_won    INT  DEFAULT 0,
    total_cash   BIGINT DEFAULT 0,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON games (table_id);
CREATE INDEX ON games (started_at DESC);
```

#### Tecnologías adicionales evaluadas

| Tecnología | Veredicto |
|---|---|
| **NATS JetStream** | Reemplazaría Redis pub/sub. Latencia ~50 µs vs ~150 µs de Redis. Justificado solo si se necesitan colas de eventos persistentes o replay de eventos tras crash. Para MVP: Redis es suficiente. |
| **Cloudflare Durable Objects** | Excelente fit (1 DO = 1 mesa, edge computing, hibernación automática). Vendor lock-in fuerte. Considerar si se quiere zero-infra. |
| **Kafka** | Overkill. Es para logs/analytics a millones de eventos/s. No aplica aquí. |
| **gRPC** | Overhead innecesario sobre WebSocket para este protocolo. JSON es suficiente. |
| **Turso/SQLite** | Viable para MVP single-node, pero migrar a Postgres es trabajo. Empezar con Postgres. |

---

### 3. Arquitectura del servidor Go

#### Patrón central: goroutine-per-table

```
                    ┌────────────────────────────────────┐
                    │          Go Server Instance         │
                    │                                     │
  WS conn P1 ──────►│ ConnectionHandler ──► table.Inbox  │
  WS conn P2 ──────►│ ConnectionHandler ──► table.Inbox  │
  WS conn P3 ──────►│ ConnectionHandler ──► table.Inbox  │
                    │                  │                  │
                    │             ┌────▼────┐             │
                    │             │  Table  │             │
                    │             │Goroutine│◄── Redis    │
                    │             │ (owns   │    Pub/Sub  │
                    │             │  state) │             │
                    │             └─────────┘             │
                    │                  │                  │
                    │             broadcasts              │
                    │                  │                  │
                    │         ┌────────▼─────────┐        │
                    │         │  Redis Pub/Sub    │        │
                    │         │  table:{id}:events│        │
                    │         └──────────────────┘        │
                    └────────────────────────────────────┘
```

```go
type Table struct {
    ID      string
    State   *GameState
    Players map[string]*PlayerConn  // playerId → conn
    Inbox   chan IncomingAction
    quit    chan struct{}
}

func (t *Table) Run(redisClient *redis.Client, pgConn *pgx.Conn) {
    ticker := time.NewTicker(60 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case action := <-t.Inbox:
            result := t.processAction(action)   // no locks: single goroutine
            t.saveStateToRedis(redisClient)      // async opcional
            t.broadcast(result)                 // local + redis pub/sub
            t.checkGameOver(pgConn)

        case <-ticker.C:
            t.checkInactivityTimeout(pgConn)

        case <-t.quit:
            t.archiveToPostgres(pgConn)
            return
        }
    }
}
```

- **Sin locks en el estado del juego**: la goroutine de la mesa es la única que lee y escribe `GameState`.
- **`broadcast()`**: envía a conexiones locales directamente; publica en Redis para que otras instancias del servidor alcancen a sus conexiones.
- **`saveStateToRedis()`**: puede ser una goroutine separada para no bloquear el inbox, o síncrono si la latencia es aceptable (<5 ms en LAN).

#### Mesas mixtas: humanos + bots en la misma mesa

Una mesa multijugador puede tener cualquier combinación de jugadores humanos y bots. El host elige al crear la mesa (igual que en el modo Bots local).

```go
type PlayerSlot struct {
    ID         string
    Name       string
    IsBot      bool
    Difficulty string      // "regular" | "difficult" | ""
    Conn       *PlayerConn // nil si IsBot == true
}

type Table struct {
    ID      string
    State   *GameState
    Slots   map[string]*PlayerSlot  // playerId → slot
    Inbox   chan IncomingAction
    quit    chan struct{}
}
```

**Diferencia clave respecto al modo local**: en el juego local los bots corren en el browser (via `useBotEngine.ts`). En multijugador los bots corren **siempre en el servidor** — en `bot.go` — para que:
1. El estado sea autoritativo incluso cuando solo quedan bots.
2. Los humanos no puedan ver ni manipular las decisiones del bot.
3. La mesa funcione aunque todos los humanos se desconecten temporalmente.

**Flujo de turno bot en la goroutine de la mesa:**

```go
func (t *Table) Run(...) {
    for {
        select {
        case action := <-t.Inbox:
            t.processAction(action)
            t.saveStateToRedis(redisClient)
            t.broadcast()
            t.maybeScheduleBotTurn()  // ← si el siguiente turno es de un bot

        case <-t.botTimer.C:          // ← timer del turno bot
            botAction := t.computeBotAction()   // bot.go
            t.processAction(botAction)
            t.saveStateToRedis(redisClient)
            t.broadcast()
            t.maybeScheduleBotTurn()  // encadena si hay otro bot seguido
        ...
        }
    }
}

func (t *Table) maybeScheduleBotTurn() {
    slot := t.currentPlayerSlot()
    if !slot.IsBot { return }
    delay := 600 + rand.Intn(800)  // ms, mismo rango que el modo local
    t.botTimer.Reset(time.Duration(delay) * time.Millisecond)
}
```

**Para la subasta con bots**: el módulo `bot.go` implementa `DecideAuctionBid()` (port de `getBotAuctionBid()`). Cuando `currentBidderId` es un bot dentro de la subasta, la goroutine de la mesa dispara el timer y emite la puja o el pase automáticamente, transmitiendo los eventos `bid_placed` / `bid_passed` a todos los clientes como si fuera cualquier jugador.

**Evento adicional al protocolo:**

| type | payload | Descripción |
|---|---|---|
| `bot_thinking` | `{ playerId, delayMs }` | Notifica a los clientes que el bot está "pensando". El cliente muestra el indicador visual durante `delayMs` ms antes de que llegue la acción real. |

#### Escalado horizontal con Redis pub/sub

Cuando hay múltiples instancias Go (detrás de un load balancer):

```
Player A → Server 1 → table.Inbox
                    → processAction()
                    → PUBLISH table:{id}:events <delta>
                                     │
              ┌──────────────────────┘
              │
Server 1 SUBSCRIBE → entrega a P1, P2 (locales)
Server 2 SUBSCRIBE → entrega a P3 (remoto)
```

Cada servidor Go suscribe a los canales de las mesas cuyos jugadores tiene conectados. El `PUBLISH` garantiza que todos reciban el evento.

**Para MVP (instancia única)**: Redis pub/sub no es necesario. Se activa en Fase 3.

---

### 4. Protocolo WebSocket

#### Envelope de mensaje

```json
{
  "v": 1,
  "id": "uuid-v4",
  "type": "action_type",
  "tableId": "table_abc123",
  "playerId": "player_xyz",
  "seq": 42,
  "payload": {}
}
```

- `v`: versión del protocolo (para migraciones sin romper clientes viejos).
- `seq`: número de secuencia incremental por cliente. El servidor rechaza mensajes duplicados y permite reconstruir orden.
- `id`: idempotency key (el servidor ignora duplicados con mismo id).

#### Acciones Cliente → Servidor

| type | payload | Validaciones |
|---|---|---|
| `roll_dice` | — | ¿Es tu turno? ¿No has tirado ya? |
| `buy_property` | `{ tileIndex }` | ¿Tu turno? ¿Suficiente cash? ¿Sin dueño? |
| `pass_buy` | — | ¿Tu turno? ¿En fase compra? |
| `next_turn` | — | ¿isTurnComplete? ¿No hay deuda? |
| `pay_bail` | — | ¿En jail? ¿Suficiente cash? |
| `place_bid` | `{ increment }` | ¿Subasta activa? ¿Tu turno en subasta? ¿Puedes pagar? |
| `pass_bid` | — | ¿Subasta activa? ¿Tu turno en subasta? |
| `build_house` | `{ tileIndex }` | ¿Dueño? ¿Grupo completo? ¿Sin hipoteca? ¿Cash? |
| `build_hotel` | `{ tileIndex }` | Igual + 4 casas previas |
| `sell_improvement` | `{ tileIndex }` | ¿Tiene mejoras? |
| `mortgage` | `{ tileIndex }` | ¿Sin mejoras en grupo? ¿Tu propiedad? |
| `unmortgage` | `{ tileIndex }` | ¿Cash suficiente para desempeñar? |
| `propose_trade` | `{ ExchangeProposal }` | ¿Propiedades son tuyas? ¿Cash disponible? |
| `respond_trade` | `{ accepted: bool }` | ¿Propuesta activa? ¿Eres el destinatario? |
| `accept_card` | — | ¿Carta activa? ¿Tu turno? |
| `skip_move` | — | ¿Movimiento en curso? |
| `heartbeat` | — | Renueva presencia en Redis |

#### Eventos Servidor → Cliente

| type | payload | Descripción |
|---|---|---|
| `game_snapshot` | `{ state: FullGameState }` | Estado completo al conectar/reconectar |
| `state_delta` | `{ delta: Partial<GameState> }` | Solo los campos que cambiaron |
| `error` | `{ code, message }` | Acción rechazada (turno equivocado, fondos insuficientes, etc.) |
| `player_connected` | `{ playerId, name }` | Jugador se conectó/reconectó |
| `player_disconnected` | `{ playerId, gracePeriodMs }` | Jugador desconectado, empieza cuenta regresiva |
| `dice_rolled` | `{ values: [d1, d2], total, isDoubles }` | Resultado de dados |
| `player_moved` | `{ playerId, from, to, path }` | Animación de movimiento |
| `property_purchased` | `{ tileIndex, playerId, amount }` | Compra directa |
| `auction_started` | `{ tileIndex, startingBidderIndex }` | Inicia subasta |
| `bid_placed` | `{ playerId, amount }` | Puja en subasta |
| `bid_passed` | `{ playerId }` | Jugador pasó en subasta |
| `auction_ended` | `{ winnerId?, amount?, tileIndex }` | Subasta terminó |
| `card_drawn` | `{ card: GameCard }` | Carta de chance/chest |
| `rent_collected` | `{ fromId, toId, amount, tileIndex }` | Renta pagada |
| `tax_paid` | `{ playerId, amount }` | Impuesto pagado |
| `trade_proposed` | `{ proposal: ExchangeProposal }` | Propuesta de intercambio |
| `trade_responded` | `{ accepted, summary }` | Respuesta al intercambio |
| `player_jailed` | `{ playerId }` | Enviado a la cárcel |
| `player_bankrupt` | `{ playerId }` | Quiebra declarada |
| `game_over` | `{ winnerId, stats }` | Fin de partida |
| `turn_timeout` | `{ playerId, nextPlayerId }` | Turno saltado por inactividad |

---

### 5. Estrategia para portar el motor de juego a Go

El `gameStore.ts` tiene ~93 acciones. La estrategia es **no reescribir desde cero** sino trasladar la lógica en capas:

**Capa 1 — Validadores** (¿puede hacerse esta acción?):
Equivalentes de todos los `can*` methods: `canBuildHouse()`, `canMortgageProperty()`, etc. Son funciones puras que reciben `GameState` y devuelven `bool + error`.

**Capa 2 — Mutadores** (aplicar la acción sobre el estado):
Equivalentes de `buyProperty()`, `finishTurn()`, `buildHouse()`, etc. Reciben `*GameState` y lo modifican en lugar.

**Capa 3 — Orquestadores** (flujo de turno):
Equivalente de la lógica en `pages/game.vue` (watch en `isTurnComplete`, resolución de aterrizaje en casilla, etc.). Esta es la lógica de la goroutine `Table.Run()`.

**Lógica de IA de bots** (`useBotEngine.ts` → Go):
Las funciones `decideAuctionBid()`, `decideBuy()`, `decideJailStrategy()` son puras y fáciles de portar. No dependen de Vue. Se ejecutan en la goroutine de la mesa cuando `currentPlayer.isBot`.

**Datos de configuración** (`boardTilesConfig.ts`, `economyConfig.ts` → Go):
Structs + slices que replican `BOARD_TILES`, `CHANCE_CARDS`, `COMMUNITY_CARDS`, funciones de economía (`houseCostForPrice()`, `rentForDevelopment()`, etc.).

**Orden de implementación sugerido:**
1. `boardTilesConfig.go` + `economyConfig.go` (datos estáticos, zero lógica)
2. `gamestate.go` (structs que espejean `GameState`, `PlayerState`, `PropertyDevelopmentState`)
3. `validators.go` (todos los `can*` methods)
4. `engine.go` (todos los mutadores de estado)
5. `turn_orchestrator.go` (flujo de turno completo)
6. `bot_engine.go` (IA de bots)

---

### 6. Cambios en el frontend

#### Principio: solo código nuevo, nada modificado

Los modos Bots y Familiar siguen funcionando exactamente igual porque usan `pages/game.vue` → `stores/gameStore.ts`, que no se tocan. El flujo multijugador tiene su propio grafo de dependencias:

```
pages/index.vue  ──(tab Multijugador)──►  pages/multiplayer/lobby.vue
                                                   │
                                                   ▼
                                        pages/multiplayer/game.vue
                                                   │
                                          ┌────────┴────────┐
                                          │                 │
                                 stores/              composables/
                                 multiplayerStore.ts  useGameSocket.ts
```

#### Único cambio en `pages/index.vue`

Quitar `disabled` y el badge "Próximamente" del tab Multijugador, y añadir la navegación:

```diff
-        <button
-          class="mode-tab disabled"
-          disabled
-          title="Próximamente"
-        >
-          <span class="material-symbols-outlined">wifi</span>
-          Multijugador
-          <span class="coming-soon">Próximamente</span>
-        </button>
+        <button
+          class="mode-tab"
+          :class="{ active: activeMode === 'multiplayer' }"
+          @click="selectMode('multiplayer')"
+        >
+          <span class="material-symbols-outlined">wifi</span>
+          Multijugador
+        </button>
```

Cuando `activeMode === 'multiplayer'` y el usuario pulsa INICIAR, se navega a `/multiplayer/lobby` en lugar de `/game`.

#### `pages/multiplayer/lobby.vue` — configuración de slots

El lobby de creación de mesa reutiliza visualmente el diseño de `pages/index.vue` pero con slots de tipo `"human" | "bot" | "open"`:

```
Slot 1: [Tú - human]         ← siempre el creador
Slot 2: [Bot Difícil ▼]      ← bot pre-configurado
Slot 3: [Esperando humano]   ← slot "open", muestra código de invitación
Slot 4: [Bot Regular ▼]      ← bot pre-configurado
```

Al unirse por código, el jugador reemplaza el primer slot `"open"` disponible. Si no hay slots `"open"`, se muestra error "Mesa llena".

---

#### Nuevo: `composables/useGameSocket.ts`

```typescript
export function useGameSocket() {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)
  const reconnectAttempts = ref(0)

  function connect(tableId: string, token: string) { ... }
  function send(type: string, payload?: object) { ... }
  function disconnect() { ... }

  return { connected, send, connect, disconnect }
}
```

#### Nuevo: `stores/multiplayerStore.ts`

Store independiente de `gameStore`. Recibe deltas del servidor vía WS y expone los mismos getters que `gameStore` para que los componentes reutilizables (como `AuctionModal.vue`, `SidebarConfig.vue`, `GameOverlay.vue`) funcionen sin modificarse.

```typescript
// Los componentes existentes importan gameStore:
import { useGameStore } from '~/stores/gameStore'

// En pages/multiplayer/game.vue se puede hacer un provide/inject
// para que los componentes hijos usen multiplayerStore sin saberlo,
// o bien duplicar solo los componentes que lo necesiten.
```

**Estrategia de reutilización de componentes**: los componentes de UI (`AuctionModal`, `TileCard`, `SidebarConfig`, `GameOverlay`) reciben props y emiten eventos — no importan el store directamente en su mayoría. `pages/multiplayer/game.vue` los usa pasándoles las props del `multiplayerStore`. Los que sí importan `useGameStore` directamente se envolverán con `provide/inject` o se crearán variantes mínimas en `components/multiplayer/`.

#### Patrón optimista + reconciliación (solo en multiplayer)

```typescript
// Solo aplica en pages/multiplayer/game.vue:
multiplayerStore.applyOptimistic({ type: 'build_house', tileIndex })  // feedback inmediato
socket.send('build_house', { tileIndex })
// Error del servidor → revertir
// state_delta del servidor → reconciliar (servidor manda, cliente obedece)
```

---

### 7. Modelo de datos Redis (detalle)

```
# Estado de partida (JSON completo, ~8 KB promedio)
SET  table:{id}:state  <json>  EX 7200

# Lista de jugadores en la mesa
SADD table:{id}:players  player1 player2 player3

# Lobby público
ZADD lobby:open  <unix_timestamp>  <tableId>

# Sesión de jugador
HSET session:{token}  playerId <id>  tableId <id>  serverInstance <host>
EXPIRE session:{token} 3600

# Presencia / heartbeat (detectar desconexión silenciosa)
SET player:{id}:heartbeat 1  EX 15
# El cliente envía heartbeat cada 10 s; si expira → el server detecta desconexión

# Rate limiting por acción
SET ratelimit:{playerId}:roll_dice 1  EX 2  NX
# Si ya existe → rechazar (no puedes tirar 2 veces en 2 segundos)
```

---

### 8. Manejo de desconexiones y timeouts

| Evento | Tiempo | Acción |
|---|---|---|
| Jugador desconecta | T+0 | Notificar a otros: `player_disconnected` con `gracePeriodMs=30000` |
| Sin reconexión | T+30s | Asignar bot temporal (pasa en cada turno hasta que vuelva) |
| Turno sin acción | T+60s | Servidor avanza turno automáticamente (`turn_timeout`) |
| Mesa sin actividad | T+120min | Archivar en PostgreSQL y limpiar Redis |
| Jugador vuelve | Cualquier momento | Enviar `game_snapshot` + reactivar como jugador |

---

### 9. API HTTP (no-WebSocket)

REST puro para operaciones de lobby:

```
POST   /api/v1/tables               → Crear mesa
GET    /api/v1/tables               → Listar mesas abiertas (desde Redis ZSET)
POST   /api/v1/tables/:id/join      → Unirse { playerName }
GET    /api/v1/tables/:id           → Estado de mesa (para reconexión)
DELETE /api/v1/tables/:id           → Abandonar mesa (solo host puede cerrar)

POST   /api/v1/auth/guest           → Token de sesión temporal (JWT de 24 h)
```

**Payload de creación de mesa** (`POST /api/v1/tables`):

```json
{
  "creatorName": "Guillermo",
  "config": {
    "startingCash": 1500,
    "goSalary": 200,
    "canSkipBuy": true,
    "auctionOnly": false,
    "doublesGiveExtraTurn": true,
    "jailBailCost": 50
  },
  "slots": [
    { "type": "human",     "name": "Guillermo" },
    { "type": "bot",       "difficulty": "difficult", "name": "Bot Difícil 2" },
    { "type": "open",      "name": null },
    { "type": "bot",       "difficulty": "regular",   "name": "Bot Regular 4" }
  ]
}
```

- `"human"`: el creador — ocupa el primer slot humano con su token.
- `"bot"`: slot rellenado por el servidor con IA desde el inicio de la partida.
- `"open"`: slot reservado para un humano que se unirá más tarde.

La mesa puede iniciar aunque no todos los slots `"open"` estén ocupados (el host decide cuándo lanzar). Los slots `"open"` sin ocupar al iniciar se convierten en bots `"regular"` automáticamente, o se puede requerir que todos los humanos estén conectados (configurable).

Auth mínima para MVP: JWT sin registro de cuenta. El token identifica al jugador en la partida. Mejoras de auth (cuentas, OAuth) son Fase 4.

---

### 10. Estructura de directorios del servidor Go

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Punto de entrada, inicialización
├── internal/
│   ├── config/
│   │   ├── boardtiles.go        # BOARD_TILES, CHANCE_CARDS, COMMUNITY_CARDS
│   │   └── economy.go           # houseCostForPrice(), rentForDevelopment(), etc.
│   ├── game/
│   │   ├── state.go             # GameState, PlayerState, PropertyDevelopmentState structs
│   │   ├── validators.go        # canBuildHouse(), canMortgage(), etc.
│   │   ├── engine.go            # buyProperty(), finishTurn(), buildHouse(), etc.
│   │   ├── orchestrator.go      # Flujo de turno completo, resolución de casilla
│   │   └── bot.go               # IA de bots (port de useBotEngine.ts)
│   ├── table/
│   │   ├── table.go             # Table struct + goroutine Run()
│   │   ├── manager.go           # TableManager: crear/buscar/eliminar mesas
│   │   └── broadcast.go         # Lógica de envío a jugadores locales + Redis pub/sub
│   ├── ws/
│   │   ├── handler.go           # HTTP upgrade → WebSocket
│   │   └── protocol.go          # Structs de mensajes, serialización
│   ├── store/
│   │   ├── redis.go             # Operaciones Redis (estado, sesiones, lobby)
│   │   └── postgres.go          # Escritura de partidas terminadas
│   └── api/
│       └── router.go            # REST endpoints (lobby, auth)
└── go.mod
```

---

## Plan de Implementación

### Fase 1 — Fundamentos del servidor (instancia única)

**Objetivo**: partida multijugador funcional en una sola instancia Go. Sin escalado horizontal aún.

**Archivos a crear (backend):**
- `backend/cmd/server/main.go`
- `backend/internal/config/boardtiles.go` + `economy.go`
- `backend/internal/game/state.go` + `validators.go` + `engine.go` + `orchestrator.go`
- `backend/internal/table/table.go` + `manager.go`
- `backend/internal/ws/handler.go` + `protocol.go`
- `backend/internal/store/redis.go`
- `backend/internal/api/router.go`

**Archivos a crear (frontend):**
- `composables/useGameSocket.ts`
- `stores/multiplayerStore.ts` (recibe deltas del servidor vía WS)
- `pages/multiplayer/lobby.vue` (crear/unirse a mesas)
- `pages/multiplayer/game.vue` (partida multijugador, ruta nueva)

**Archivos a modificar (frontend) — cambios mínimos:**
- `pages/index.vue` — solo: habilitar tab "Multijugador" y añadir navegación a `/multiplayer/lobby`

**Archivos que NO se tocan:**
- `pages/game.vue` ✗
- `stores/gameStore.ts` ✗
- `composables/useBotTurn.ts` ✗
- `composables/useBotEngine.ts` ✗
- Todos los componentes existentes ✗ (se reutilizan vía props)

### Pasos ordenados

1. Implementar `boardtiles.go` y `economy.go` (datos estáticos, testeable inmediatamente).
2. Implementar `game/state.go` con todos los structs.
3. Implementar `game/validators.go` con tests unitarios.
4. Implementar `game/engine.go` con tests unitarios.
5. Implementar `game/orchestrator.go` (flujo de turno completo).
6. Implementar `table/table.go` con la goroutine `Run()`.
7. Implementar `ws/handler.go` (upgrade HTTP → WS, lectura/escritura de mensajes).
8. Implementar `store/redis.go` (leer/escribir estado, sesiones).
9. Implementar `api/router.go` (endpoints de lobby).
10. Implementar `bot.go` (port de `useBotEngine.ts`).
11. Crear `composables/useGameSocket.ts` en el frontend.
12. Crear `stores/serverGameStore.ts` y `stores/localUiStore.ts`.
13. Refactorizar `pages/game.vue` para usar el socket.
14. Crear `pages/lobby.vue`.

### Fase 2 — Persistencia

**Objetivo**: archivar partidas terminadas en PostgreSQL y mostrar historial básico.

- `backend/internal/store/postgres.go`
- Schema SQL (migrations con `golang-migrate` o `goose`)
- Cron job de limpieza de mesas inactivas

### Fase 3 — Escalado horizontal

**Objetivo**: múltiples instancias Go detrás de un load balancer.

- `table/broadcast.go` con Redis pub/sub
- Sticky sessions configuradas en el load balancer (Nginx/Caddy/Fly.io)
- Reconexión inteligente (el cliente renegocia servidor si la sesión expira)
- Redis Sentinel o Cluster para HA

### Fase 4 — Pulido y features adicionales

- Cuentas de usuario (registro, login, OAuth)
- Estadísticas por jugador
- Salas privadas con código de invitación
- Observadores (spectators que ven la partida sin jugar)
- Reconexión más robusta con replay de eventos perdidos

---

## Criterios de Aceptación

### No-regresión (todos los modos)
- [x] El modo Bots (`pages/game.vue`) funciona igual que antes: sin errores, sin cambios de comportamiento.
- [x] El modo Familiar (`pages/game.vue`) funciona igual que antes.
- [x] El tab "Multijugador" en `pages/index.vue` está habilitado y navega al lobby.

### Fase 1 — Multijugador
- [x] Un jugador puede crear una mesa con cualquier combinación de humanos y bots (ej: 2 humanos + 2 bots).
- [x] Los slots `"open"` muestran un código de invitación para que otros humanos se unan.
- [x] El servidor lanza los dados (los clientes no pueden manipularlos).
- [x] Todos los jugadores en la mesa (humanos y bots) ven el mismo estado en <200 ms tras cada acción.
- [x] Los bots ejecutan sus turnos en el servidor con el mismo delay visual (600–1400 ms) que en modo local.
- [x] Los bots participan en subastas automáticamente desde el servidor (sin intervención del cliente).
- [ ] Los bots proponen y responden intercambios desde el servidor. *(parcial: la lógica existe en bot.go pero no está conectada al flujo de turno completo)*
- [x] Si un jugador humano se desconecta, el juego continúa (su turno es gestionado por un bot temporal en el servidor).
- [x] Al reconectarse, el jugador recibe el estado actual completo y retoma el control de su slot.
- [x] Las acciones fuera de turno son rechazadas con mensaje de error.
- [x] Una mesa con solo bots (cero humanos) puede completarse en el servidor de forma autónoma.
- [x] La mesa soporta 2 a 4 slots (humanos + bots) sin degradación perceptible.

### Fase 2
- [ ] Al finalizar una partida, el resultado se persiste en PostgreSQL en <5 s. *(bloqueado: requiere postgres.go + schema SQL)*
- [ ] Mesas inactivas >2 h son archivadas y eliminadas de Redis automáticamente. *(bloqueado: requiere Fase 2)*

### Fase 3
- [ ] Con 2 instancias Go activas, jugadores en instancias distintas pueden jugar en la misma mesa. *(bloqueado: requiere Redis pub/sub — Fase 3)*
- [ ] Un restart de una instancia no termina las partidas (el estado persiste en Redis). *(bloqueado: requiere LoadTableState on startup — Fase 3)*

---

## Notas

### Decisión pendiente: auth de jugadores

Para MVP es suficiente un token JWT de sesión temporal sin cuenta (guests). Permite jugar sin registro. El `playerId` en el token se mapea al jugador en la mesa. Implementar cuentas persistentes es Fase 4 y no bloquea el resto.

### Sobre compartir tipos TypeScript entre front y back

Con Go en el backend no se comparten tipos automáticamente. Opciones:
1. **Mantener interfaces TypeScript a mano** en el frontend (sincronización manual). Simple pero propenso a drift.
2. **Generar tipos TypeScript desde Go** con `tygo` o `openapi-generator`. Más trabajo inicial, cero drift.
3. **Usar un schema compartido** (JSON Schema o Protobuf) y generar para ambos lados. La opción más robusta para equipos grandes; overkill para MVP.

**Recomendación**: opción 1 para las Fases 1-2, opción 2 al entrar en Fase 3.

### Trade-off de latencia: estado completo vs. deltas

El servidor puede enviar en cada evento:
- **Estado completo** (`game_snapshot`): ~8 KB. Simple de implementar; el cliente hace `$patch(fullState)`. Gestión de conflictos trivial.
- **Solo el delta** (`state_delta`): <500 bytes. Más eficiente; requiere lógica de merge en el cliente.

Para un juego de tablero con 4 jugadores, incluso enviando estado completo cada turno el ancho de banda es despreciable (<1 KB/s por jugador). **Recomendación para MVP: estado completo en cada evento**. Los deltas son optimización de Fase 4.

### Sobre Cloudflare Durable Objects (alternativa radical)

Si el objetivo es zero-infra y escalabilidad global desde el día uno:
- Cada `DurableObject` = 1 mesa del juego.
- El DO almacena el estado en su storage (RocksDB embebido), sin Redis externo.
- WebSocket connections van directamente al DO.
- Hibernación automática cuando la mesa está inactiva (costo cero idle).
- Latencia: <50 ms desde cualquier punto del planeta.

El trade-off es vendor lock-in a Cloudflare Workers y curva de aprendizaje del modelo DO. Si el equipo está abierto a ello, es la arquitectura más elegante y operacionalmente más sencilla para este caso de uso.
