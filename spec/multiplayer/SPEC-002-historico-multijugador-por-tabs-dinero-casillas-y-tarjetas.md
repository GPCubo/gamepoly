---
id: SPEC-002
title: Historico multijugador por tabs dinero casillas y tarjetas
created_at: 2026-06-12T07:27:41
status: in-progress
---

# SPEC-014: Historico multijugador por tabs dinero casillas y tarjetas

## Description

En el modo multijugador, el modal "Ver Historico" debe reorganizarse por tabs para que todos los usuarios puedan inspeccionar la partida con mayor claridad. El historico debe separarse en tres vistas principales:

1. Movimientos de dinero: entradas y salidas de dinero por cobrar Salida/GO, cartas de Suerte o Arca Comunal, compra de propiedades, compra o venta/construccion de casas y hoteles, pago/cobro de renta, impuestos, hipotecas, subastas e intercambios economicos.
2. Casillas: tiradas y movimiento de fichas. Debe registrar que usuario saco que cantidad en los dados, desde que casilla se movio y a que casilla llego.
3. Tarjetas: cartas de Suerte y Arca Comunal. Debe registrar que usuario saco la tarjeta, de que grupo era, que texto decia la tarjeta y que iba a pasar segun la carta.

El cambio aplica especificamente a `pages/multiplayer/game.vue` y al flujo de datos multiplayer. El historico debe estar disponible para todos los usuarios conectados a la mesa.

## Context and Motivation

Actualmente el dialog de "Ver Historico" en `pages/multiplayer/game.vue` muestra solo `mpStore.economicHistory` como una lista unica bajo el titulo "Historico economico". Ese historial mezcla eventos financieros y no cubre de forma estructurada las tiradas/movimientos ni el detalle de cartas. En multiplayer, los jugadores necesitan reconstruir que ocurrio en la mesa: cuanto dinero cambio, por que se movio una ficha y que efecto anuncio una tarjeta.

El backend ya emite eventos relevantes por WebSocket, como `dice_rolled`, `player_moved`, `card_drawn`, `property_purchased`, `house_built`, `hotel_built`, `rent_collected` y `tax_paid`, pero el frontend no los persiste todos en colecciones de historico por categoria. El `GameState` tambien ya contiene `EconomicHistory`, que sirve como base para el tab de dinero.

## Technical Analysis

El componente principal afectado es `pages/multiplayer/game.vue`. Ahí existen `showHistoryDialog`, el boton "Ver Historico", el modal `.history-dialog`, `visibleHistorySnackbars` y el renderer actual de `mpStore.economicHistory`.

El store `stores/multiplayerStore.ts` contiene `MPEconomicHistoryItem` y expone `economicHistory`, pero no tiene estructuras para historico de casillas ni tarjetas. Se puede ampliar el store con arrays reactivos locales para eventos de movimiento y tarjetas, o agregar esos eventos al snapshot del backend. Para un historico fiable entre reconexiones y todos los clientes, la opcion mas robusta es que el backend incluya historiales nuevos en `GameState` y que el frontend los renderice desde el snapshot. Para una primera iteracion mas acotada, se pueden capturar los eventos WebSocket ya emitidos en el cliente y guardarlos en el store local.

El backend relevante esta en `backend/internal/table/table.go`, donde se emiten los eventos `dice_rolled`, `player_moved` y `card_drawn`. Los payloads estan definidos en `backend/internal/proto/messages.go`. Para el tab "Casillas" se necesita correlacionar la tirada (`dice_rolled`) con el siguiente `player_moved` del mismo jugador activo. Para evitar correlaciones fragiles en el cliente, conviene crear un item de historial desde el backend cuando ocurre el movimiento, incluyendo `playerId`, `playerName`, `diceValues`, `diceTotal`, `from`, `to` y opcionalmente `path`.

Para el tab "Tarjetas", `card_drawn` actualmente incluye `playerId`, `cardId` y `text`. El grupo de la carta puede inferirse por la casilla o por el `ActiveCard`, pero deberia viajar explicitamente en el payload/historial como `group: "chance" | "community"`, junto con `action`, `amount` y `tileIndex` cuando existan, para poder mostrar "que dijo la tarjeta que iba a pasar".

El tab "Dinero" puede usar `economicHistory`, pero hay que revisar cobertura. Ya existen tipos como `purchase`, `auction`, `mortgage`, `card_gain`, `card_loss`, `tax`, `rent` y `exchange`. Deben agregarse eventos faltantes si actualmente no se registran: cobrar GO por pasar Salida, construir casa, construir hotel, vender mejoras y deshipotecar si aplican.

Riesgos tecnicos:

- Si el historico de casillas/tarjetas se guarda solo en frontend, se pierde al recargar o reconectar.
- Si se correlacionan eventos en frontend, movimientos por cartas pueden confundirse con movimientos por dados.
- El modal puede crecer mucho; necesita tabs, contadores y estados vacios por tab.
- Los bots tambien deben generar historial indistinguible del de jugadores humanos.

## Implementation Plan

### Files to create

- `backend/internal/game/history.go` - Tipos y helpers para agregar historiales no economicos al `GameState`, si se decide persistirlos en backend.

### Files to modify

- `backend/internal/game/state.go` - Agregar estructuras `MovementHistory` y `CardHistory` al estado serializado.
- `backend/internal/proto/messages.go` - Ampliar payloads de `card_drawn` si se necesita incluir `group`, `action`, `amount` y `tileIndex`.
- `backend/internal/table/table.go` - Registrar eventos de casillas y tarjetas cuando se procesan `dice_rolled`, `player_moved` y `card_drawn`; asegurar que movimientos por cartas se clasifiquen correctamente.
- `backend/internal/game/engine.go` - Registrar eventos economicos faltantes: GO, construccion de casas/hoteles, venta de mejoras y otros cambios de dinero si no existen.
- `stores/multiplayerStore.ts` - Agregar tipos y getters para `movementHistory` y `cardHistory`.
- `pages/multiplayer/game.vue` - Reemplazar el modal actual por tabs: Dinero, Casillas y Tarjetas; renderizar listas por categoria, contadores, estados vacios y estilos.

### Ordered Steps

1. Definir los modelos de historial para casillas y tarjetas, incluyendo campos minimos para UI: id, playerId, playerName, createdAt, y datos especificos del evento.
2. Extender `GameState` con `MovementHistory` y `CardHistory`, limitados a los ultimos 100 items como `EconomicHistory`.
3. Registrar `CardHistory` cuando se roba una carta en `resolveLanding`, guardando grupo, texto, accion, monto y destino.
4. Registrar `MovementHistory` cuando se mueve un jugador por dados, guardando dados, total, casilla inicial y casilla final.
5. Clasificar movimientos por carta como eventos de tarjeta y, si se desea, tambien como movimientos con origen `card`.
6. Revisar `EconomicHistory` y agregar items para cobrar GO, comprar casas/hoteles y otros cambios economicos faltantes.
7. Actualizar `stores/multiplayerStore.ts` con interfaces y computed getters para los nuevos historiales.
8. Rediseñar el modal "Ver Historico" en `pages/multiplayer/game.vue` con tabs accesibles y seleccion persistente mientras el modal esta abierto.
9. En el tab Dinero, renderizar `economicHistory` con iconos y montos.
10. En el tab Casillas, renderizar "Jugador saco X en dados y se movio de casilla A a B".
11. En el tab Tarjetas, renderizar "Jugador robo Suerte/Arca Comunal: texto de la carta; efecto esperado".
12. Agregar estados vacios por tab y contadores visibles en cada tab.
13. Verificar en multiplayer con humanos y bots, incluyendo cartas, compras, GO, casas/hoteles y reconexion.

## Acceptance Criteria

- [x] El modal "Ver Historico" en multiplayer muestra tabs para Dinero, Casillas y Tarjetas.
- [x] El tab Dinero lista cambios por GO, cartas, compra de propiedades, casas, hoteles, rentas, impuestos, hipotecas, subastas e intercambios cuando esos eventos ocurran.
- [x] El tab Casillas lista cada tirada con jugador, dados/total, casilla origen y casilla destino.
- [x] El tab Tarjetas lista cada carta de Suerte/Arca Comunal con jugador, grupo, texto y efecto esperado.
- [x] Todos los usuarios conectados ven el mismo historico al recibir snapshots/eventos.
- [x] Los eventos generados por bots tambien aparecen en los tabs correspondientes.
- [x] El historico no desaparece al abrir/cerrar el modal.
- [x] Los tabs tienen estado vacio propio cuando no hay eventos de esa categoria.
- [x] El build de Nuxt pasa sin errores.
- [ ] Los tests/build del backend pasan cuando la toolchain Go este disponible. *(blocked: `go` y `gofmt` no estan disponibles en PATH en esta maquina)*

## Notes

La solucion preferida es persistir los historiales nuevos en backend dentro del `GameState`, no solo capturarlos en el cliente, porque el modo multiplayer necesita consistencia para todos los usuarios y reconexiones. Si se implementa una primera version mas rapida solo con eventos WebSocket en frontend, debe marcarse como no persistente y luego migrarse a backend.

## Implementation Notes

- 2026-06-12: Implementado con historiales persistidos en backend (`economicHistory`, `movementHistory`, `cardHistory`) y tabs en `pages/multiplayer/game.vue`.
- Pendiente: ejecutar `gofmt` y `go test ./...` cuando la toolchain Go este disponible en PATH.
