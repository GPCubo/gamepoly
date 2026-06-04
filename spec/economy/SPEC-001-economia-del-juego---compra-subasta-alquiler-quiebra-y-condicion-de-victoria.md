---
id: SPEC-001
title: Economia del juego - compra, subasta, alquiler, quiebra y condicion de victoria
created_at: 2026-06-04T22:00:57
status: done
---

# SPEC-001: Economía del juego — compra, subasta, alquiler, quiebra y condición de victoria

## Descripción

Implementar el sistema económico completo del Monopoly Web:

1. **Compra**: al caer en una casilla comprable sin dueño, el jugador activo puede comprarla pagando el precio. Si declina, se inicia una subasta.
2. **Subasta**: ronda de pujas entre todos los jugadores activos. El mayor postor paga y se queda la propiedad. Si nadie puja, la propiedad queda libre.
3. **Alquiler**: al caer en una propiedad con dueño, el jugador paga automáticamente el alquiler al propietario.
4. **Impuestos**: al caer en una casilla de impuesto, el jugador paga el monto fijo al banco (se descuenta del cash).
5. **Salario GO**: al pasar o caer en la casilla 0 (Salida) el jugador activo cobra `goSalary`.
6. **Quiebra**: cuando el cash de un jugador baja de $0, se elimina — su ficha desaparece, sus propiedades vuelven a estar libres, y sus turnos se omiten automáticamente.
7. **Condición de victoria**: cuando solo queda un jugador con cash ≥ 0, se muestra una pantalla de victoria y la partida termina.

## Contexto y Motivación

Las tarjetas de casilla (board/SPEC-001) ya muestran información pero no ejecutan ninguna acción económica. El cash existe en `PlayerState` pero nunca cambia durante la partida. Este spec activa la economía completa, haciendo el juego funcional de principio a fin.

Flujo completo de un turno tras este spec:
```
Tirar dados → Mover → Caer en casilla →
  [libre/comprable]  → TileCard: botones Comprar / Subastar
  [con dueño]        → Cobro automático de alquiler → Turno completado
  [impuesto]         → Pago automático → Turno completado
  [carta/esquina]    → Sin acción económica → Turno completado
→ Verificar quiebra → Verificar victoria → Siguiente turno
```

## Análisis Técnico

### Estado actual

- `PlayerState.cash: number` existe pero nunca se modifica en gameplay.
- `GameState.goSalary: number` existe pero no se aplica al pasar por GO.
- No existe campo de propiedad/dueño en ningún tipo.
- `TileCard.vue` muestra info pero no tiene botones de acción.
- `GameOverlay.vue` solo tiene botones Tirar/Siguiente/Cámara.

### Extensiones al store (`gameStore.ts`)

```ts
// Nuevo en GameState
propertyOwners: Record<number, number>  // tileIndex → playerId (-1 = libre)
bankruptPlayers: Set<number>            // playerIds eliminados

// Nuevas acciones
buyProperty(tileIndex, playerId)        // asigna dueño, descuenta cash
collectRent(fromPlayerId, toPlayerId, amount)
payTax(playerId, amount)
awardGoSalary(playerId)
declareBankruptcy(playerId)            // marca como quebrado, libera props
```

### Cálculo de alquiler

| Tipo       | Cálculo                                                          |
|------------|------------------------------------------------------------------|
| property   | `tile.price * 0.10` (base). Sin casas: 10% del precio de compra |
| railroad   | `$25 × número de ferrocarriles que posee el dueño`              |
| utility    | Si el dueño tiene 1: `4 × diceTotal`. Si tiene 2: `10 × diceTotal` |

El valor de `diceTotal` en el momento de caer se obtiene de `store.diceTotal`.

### Detección de paso por GO

En `gameStore.ts → moveCurrentPlayer()`, antes de mover casilla por casilla, si `(p.position + step) % 40 < p.position % 40` (se ha dado la vuelta completa), se cobra el salario. Alternativamente: en el watcher de `moveEvent` en `game.vue`, comparar posición anterior vs nueva.

Implementación más simple: al final de `moveCurrentPlayer()`, comparar la posición inicial y final:
```ts
const startTile = p.position % 40
const endTile = target % 40
if (endTile < startTile || (startTile === 0 && steps > 0)) {
  p.cash += this.goSalary
}
```
Nota: la casilla 0 es Salida, índice 0 en BOARD_TILES.

### Sistema de subasta

UI modal sencilla (componente `AuctionModal.vue`):
- Precio mínimo inicial: $10.
- Los jugadores activos (no quebrados) pujan en orden de turno.
- Cada jugador puede subir la puja o pasar.
- Si todos pasan en una ronda, termina sin comprador.
- El ganador paga su última puja.

### Quiebra y eliminación

Cuando `player.cash < 0`:
1. `store.declareBankruptcy(playerId)` añade al `bankruptPlayers`.
2. Sus propiedades: `propertyOwners` entries donde `value === playerId` se resetean a `-1`.
3. En el loop de turnos, si `activePlayerIndex` apunta a un quebrado, `finishTurn()` avanza automáticamente.
4. El getter `activePlayers` filtra quebrados.

### Condición de victoria

Getter `winner`:
```ts
winner: (state) => {
  const alive = state.players.filter(p => !state.bankruptPlayers.has(p.id))
  return alive.length === 1 ? alive[0] : null
}
```
Observado en `game.vue`: cuando `store.winner` no es null, navegar a `/winner` o mostrar modal de victoria.

### Riesgos

- **Subasta bloqueante**: la UI de subasta debe resolverse completamente antes de avanzar el turno. Usar un `Promise` o un flag `isAuctionActive` en el store.
- **GO en primer movimiento**: posición inicial es 0. Hay que evitar cobrar salario al inicio del juego (añadir guard: solo cobrar si ya se ha movido al menos una vez, o si `steps > 0`).
- **Alquiler de utility sin diceTotal**: `store.diceTotal` debe estar accesible en el momento de calcular el alquiler (sí lo está porque los dados se tiran antes de mover).
- **Jugador quebrado salta automáticamente**: `finishTurn()` debe comprobar si el siguiente jugador está quebrado y avanzar de nuevo (loop hasta encontrar uno activo o detectar victoria).

## Plan de Implementación

### Archivos a crear

- `components/AuctionModal.vue` — UI de subasta con rondas de puja.
- `components/WinnerOverlay.vue` — Pantalla de victoria al terminar la partida.

### Archivos a modificar

- `stores/gameStore.ts` — Añadir `propertyOwners`, `bankruptPlayers`, acciones económicas, GO salary, victoria.
- `components/TileCard.vue` — Añadir botones "Comprar" / "Subastar" / info de alquiler / info de impuesto.
- `components/GameOverlay.vue` — Mostrar balance de cada jugador activo.
- `pages/game.vue` — Watcher de winner, montar `AuctionModal`, gestionar flujo de subasta.

### Pasos ordenados

1. **Extender `gameStore.ts`**:
   - Añadir `propertyOwners: {} as Record<number, number>` al estado (vacío = libre).
   - Añadir `bankruptPlayers: [] as number[]` (array de IDs).
   - Añadir getter `activePlayers`, `winner`.
   - Añadir acciones: `buyProperty`, `collectRent`, `payTax`, `awardGoSalary`, `declareBankruptcy`.
   - Modificar `moveCurrentPlayer` para detectar paso por GO y llamar `awardGoSalary`.
   - Modificar `finishTurn` para saltar jugadores quebrados y detectar victoria.

2. **Actualizar `TileCard.vue`**:
   - Recibir nuevas props: `ownerId?: number`, `ownerName?: string`, `diceTotal: number`, `playerCash: number`.
   - Para casillas comprables sin dueño: mostrar botones "💰 Comprar ($X)" y "🔨 Subastar".
   - Para casillas con dueño ajeno: mostrar alquiler calculado y texto "Se cobra automáticamente".
   - Para casillas con dueño propio: mostrar "Es tuya 🏠".
   - Para casillas de impuesto: mostrar monto y "Se descuenta automáticamente".
   - Emitir `buy` y `auction` al hacer clic.

3. **Crear `AuctionModal.vue`**:
   - Props: `tile: BoardTile`, `players: PlayerState[]`, `startingBid: number`.
   - Emite: `sold(winnerId, amount)` | `unsold`.
   - UI: mostrar casilla, puja actual, turno del jugador que puja, botones "Pujar +$10/+$50" y "Pasar".
   - Lógica: rondas en orden; si todos pasan en una vuelta, emitir `unsold`.

4. **Integrar en `pages/game.vue`**:
   - Pasar `ownerId`, `ownerName`, `diceTotal` y `playerCash` a `<TileCard>`.
   - Manejar emit `buy`: llamar `store.buyProperty(tileIndex, playerId)`, cerrar tarjeta.
   - Manejar emit `auction`: mostrar `<AuctionModal>`.
   - Manejar resolve de subasta: `store.buyProperty` si hay ganador, cerrar modal.
   - Watcher sobre `store.winner`: cuando no es null, mostrar `<WinnerOverlay>`.
   - Aplicar cobro automático de alquiler/impuesto al abrir la tarjeta (triggered desde `isTurnComplete`).

5. **Crear `WinnerOverlay.vue`**:
   - Mostrar nombre del ganador, botón "Nueva partida" que navega a `/`.

6. **Actualizar `GameOverlay.vue`**:
   - Añadir mini-lista de jugadores activos con su balance actual.

## Criterios de Aceptación

- [x] Al caer en una propiedad libre, la tarjeta muestra botones "Comprar" y "Subastar".
- [x] Al comprar, el cash del jugador se reduce en el precio y la propiedad queda asignada.
- [x] Al declinar compra, se abre el modal de subasta con todos los jugadores activos pujando.
- [x] El ganador de la subasta paga su puja y se queda la propiedad.
- [x] Si nadie puja, la propiedad queda libre.
- [x] Al caer en una propiedad ajena, se cobra el alquiler automáticamente al aterrizar.
- [x] Al caer en una propiedad propia, la tarjeta indica "Es tuya" sin cobro.
- [x] Al caer en un impuesto, el monto se descuenta automáticamente del cash del jugador.
- [x] Al pasar o caer en GO, el jugador cobra el salario configurado.
- [x] Cuando el cash de un jugador llega a negativo, se declara en quiebra.
- [x] Al quebrar: la ficha desaparece del tablero, sus propiedades quedan libres y sus turnos se omiten.
- [x] La partida termina cuando solo queda un jugador activo y se muestra la pantalla de victoria.
- [x] El balance de cada jugador es visible en el overlay durante la partida.

## Notas

- El alquiler es simplificado (sin casas ni hoteles): 10% del precio para propiedades, escalado para ferrocarriles/utilities.
- El sistema de casas/hoteles queda fuera de este spec (futuro economy/SPEC-002).
- Los impuestos van al "banco" (desaparecen del sistema); no hay fondo de aparcamiento.
- La detección de paso por GO usa comparación de posiciones antes/después del movimiento completo, no casilla por casilla.
- `bankruptPlayers` se guarda como array de IDs (no Set) para compatibilidad con la serialización de Pinia.
- El modal de subasta es bloqueante: el flag `store.isAuctionActive` previene avanzar el turno mientras está abierto.
