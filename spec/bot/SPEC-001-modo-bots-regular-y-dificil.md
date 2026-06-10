---
id: SPEC-001
title: Modo Bots — Regular y Difícil
created_at: 2026-06-09T12:00:00
status: in-progress
---

# SPEC-001: Modo Bots — Regular y Difícil

## Description

Agregar un modo de juego contra bots (IA local) a GamePoly. La pantalla de configuración (`pages/index.vue`) tendrá 3 tabs: **Familiar** (juego local actual, sin cambios), **Bots** (nueva funcionalidad) y **Multijugador** (placeholder deshabilitado para futura implementación). En el tab **Bots**, el usuario configura 2–4 jugadores y puede asignar a cada uno un tipo: **Humano**, **Bot Regular** o **Bot Difícil**. Los bots toman todas las decisiones automáticamente en el frontend, sin intervención del usuario. El usuario solo controla los jugadores marcados como Humano.

### Tipos de Bot

- **Bot Regular**: Toma decisiones simples y algo aleatorias. Compra si puede, construye cuando tiene grupo completo, no inicia intercambios, paga fianza en cárcel si tiene dinero.
- **Bot Difícil**: Toma decisiones estratégicas. Prioriza completar grupos de color, construye agresivamente, hace intercambios estratégicos, hipoteca propiedades para construir en monopolios, puja inteligentemente en subastas.

## Context and Motivation

El juego actualmente solo soporta modo "hot-seat" (Familiar) donde todos los jugadores comparten la misma pantalla y cada uno toma decisiones manualmente. El modo Bots permite a un solo jugador disfrutar el juego contra oponentes controlados por IA, sin necesidad de otras personas. Esto amplía significativamente la jugabilidad en solitario.

El tab **Multijugador** se reserva para una futura implementación de juego en línea y debe mostrarse como deshabilitado con un label "Próximamente".

## Technical Analysis

### Estado actual del sistema

- **`PlayerConfig`** y **`PlayerState`** (en `stores/gameStore.ts:21-37`) no tienen campo para distinguir entre humano y bot.
- **`pages/index.vue`** es la pantalla de setup actual: selecciona cantidad de jugadores, nombres, fichas y reglas. No tiene tabs ni concepto de modo de juego.
- **`pages/game.vue`** orquesta el loop del juego reactivo mediante watchers sobre el store.
- **`components/GameOverlay.vue`** muestra la UI de turno activo (tirar dados, siguiente, etc.).
- **`components/TileCard.vue`** presenta las opciones de compra/subasta/skip al caer en una propiedad.
- **`components/AuctionModal.vue`** gestiona la subasta con puja manual.
- **`components/CardOverlay.vue`** muestra cartas de Suerte/Arca Comunal.
- **`components/ExchangeModal.vue`** gestiona intercambios entre jugadores.
- **`components/SidebarConfig.vue`** muestra gestión de propiedades (construir, vender, hipotecar).

### Decisiones que un bot debe tomar

1. **Tirar dados** — automático al iniciar turno
2. **Cárcel** — pagar fianza o intentar dobles
3. **Comprar propiedad** — comprar, subastar o saltar al caer en propiedad libre
4. **Subasta** — pujar o pasar en una subasta
5. **Construir** — construir casas/hoteles al tener grupo completo
6. **Hipotecar/Deshipotecar** — gestión de propiedades
7. **Intercambio** — proponer o responder intercambios
8. **Siguiente turno** — avanzar al siguiente jugador

### Arquitectura propuesta

Se introduce un **decisor de bot** como composable (`composables/useBotEngine.ts`) que expone los métodos de decisión para cada tipo de bot. El engine no maneja timing ni UI — solo recibe el estado del store y devuelve una decisión. Un **orquestador de turno de bot** (`composables/useBotTurn.ts`) se encarga del timing (delays entre acciones) y de invocar las acciones del store.

**Flujo del turno de bot:**

```
Turno → ¿Es bot? → BotTurnOrchestrator
                           ├─ delay → rollDice (auto)
                           ├─ wait movement → landing resolution
                           ├─ delay → BotDecisionEngine.decide()
                           ├─ ejecutar decisión en store
                           └─ delay → finishTurn
```

## Implementation Plan

### Files to create

- `composables/useBotEngine.ts` — Lógica de decisión de bots (Regular y Difícil)
- `composables/useBotTurn.ts` — Orquestador de turno de bot con delays y auto-play

### Files to modify

- `stores/gameStore.ts` — Agregar campos `isBot` y `botDifficulty` a `PlayerConfig`, `PlayerState` y la inicialización en `setupGame()`. Agregar getters `activeBotPlayer` e `isCurrentPlayerBot`. Agregar estados reactivos `isBotThinking` y `botActionMessage`.
- `pages/index.vue` — Reestructurar con sistema de tabs (Familiar / Bots / Multijugador). Tab Bots permite asignar tipo (Humano/Bot Regular/Bot Difícil) a cada slot de jugador. Tab Multijugador deshabilitado.
- `pages/game.vue` — Introducir watcher/composable que detecta cuando el jugador activo es bot y dispara `useBotTurn` para automatizar el turno.
- `components/GameOverlay.vue` — Ocultar botones de acción manuales cuando el jugador activo es bot. Mostrar indicador visual "Bot pensando...". Badge de tipo de bot junto al nombre del jugador.
- `components/TileCard.vue` — No mostrar overlay de decisión de compra para bots (el bot decide automáticamente).
- `components/AuctionModal.vue` — Auto-pujar cuando un bot participa en subasta.
- `components/ExchangeModal.vue` — Auto-responder intercambios de bots.
- `components/SidebarConfig.vue` — Deshabilitar gestión manual de propiedades para jugadores bot.

### Ordered Steps

1. Extender `PlayerConfig` y `PlayerState` con campos `isBot: boolean` y `botDifficulty: "regular" | "difficult" | null`. Actualizar `setupGame()` en gameStore para propagar estos campos. Agregar `isBotThinking: boolean` y `botActionMessage: string` al `GameState`. Agregar getters `activeBotPlayer` e `isCurrentPlayerBot`.
2. Crear `composables/useBotEngine.ts` con la interfaz de decisiones del bot:
   - `decideBuy(tile, player, state)` → `buy | auction | skip`
   - `decideAuctionBid(tile, currentBid, player, state)` → `bidAmount | pass`
   - `decideJailAction(player, state)` → `payBail | rollForDoubles`
   - `decideBuild(player, state)` → array de `{ tileIndex, action: "house" | "hotel" }` | `[]`
   - `decideMortgage(player, state)` → array de `{ tileIndex, action: "mortgage" | "unmortgage" }` | `[]`
   - `decideExchange(proposal, player, state)` → `accept | reject`
   - `decideProposeExchange(player, state)` → `ExchangeProposal | null`
3. Implementar estrategia **Regular** en `useBotEngine.ts`:
   - **Comprar**: Siempre compra si tiene `cash > price * 1.5`, si no puede subasta. Si `canSkipBuy` y no tiene suficiente, salta.
   - **Subasta**: Puja hasta el precio base con leve aleatoriedad (±10%). Nunca puja más del precio de lista.
   - **Cárcel**: Paga fianza si tiene `cash > jailBailCost * 3`, si no tira dobles.
   - **Construir**: Construye 1 casa en grupos completos si tiene `cash > cost * 3`. No construye hoteles.
   - **Hipotecar**: Solo hipoteca si está en riesgo de quiebra (`cash < 200`). Nunca deshipoteca.
   - **Intercambio**: Nunca inicia. Acepta intercambios que le den más propiedades o efectivo neto positivo con 50% de probabilidad.
4. Implementar estrategia **Difícil** en `useBotEngine.ts`:
   - **Comprar**: Prioriza propiedades que completan grupos de color. Compra propiedades de oposición para bloquear. Evalúa ROI antes de comprar. No compra si deja muy bajo de cash (`cash < price * 1.2`).
   - **Subasta**: Puja agresivamente hasta valor estratégico (considerando grupo de color, monopolios cercanos). Puede pujar más del precio base si conviene estratégicamente, hasta `cash * 0.6`.
   - **Cárcel**: Siempre paga fianza si tiene el dinero (para no perder turnos). Tira dobles solo si no tiene cash suficiente.
   - **Construir**: Construye agresivamente en grupos completos, maximizando nivel uniforme. Construye hoteles cuando es posible. Prioriza construir antes de terminar turno.
   - **Hipotecar**: Hipoteca propiedades sueltas (no de grupos completos) para financiar construcción en monopolios. Deshipoteca cuando tiene cash holgado (`cash > totalMortgageCost * 2`).
   - **Intercambio**: Inicia intercambios para completar grupos de color. Ofrece propiedades que no necesita a cambio de las que completan sus grupos. Acepta intercambios estratégicamente.
5. Crear `composables/useBotTurn.ts` — Orquestador que:
   - Detecta si el jugador activo es bot (vía store getter `isCurrentPlayerBot`)
   - Aplica delays configurables entre acciones (800ms para pensar, 500ms entre sub-acciones)
   - Secuencia de turno: roll → wait movement → resolve landing → decide → execute → finishTurn
   - Maneja subastas automáticamente cuando un bot participa
   - Emite `botActionMessage` para feedback visual
   - Ejecuta construcción post-compra si la estrategia lo dicta
6. Modificar `pages/index.vue`:
   - Agregar sistema de tabs visual debajo del título principal
   - Tab **Familiar**: contenido actual sin cambios
   - Tab **Bots**: formulario similar pero cada slot de jugador tiene un dropdown `<select>` con opciones: "Humano", "🤖 Bot Regular", "🤖 Bot Difícil". Cuando es Bot, el campo de nombre se auto-rellena (e.g., "Bot Regular 1") y se deshabilita. La ficha se asigna automáticamente.
   - Tab **Multijugador**: mostrar mensaje "Próximamente" con diseño visual placeholder, tab deshabilitado
   - Al iniciar con bots, pasar `isBot` y `botDifficulty` en `PlayerConfig`
   - En modo Bots, debe haber al menos 1 jugador Humano
7. Modificar `pages/game.vue`:
   - Importar y usar `useBotTurn`
   - En el watcher de `isTurnComplete` o donde se resuelve el aterrizaje, verificar si el jugador activo es bot y delegar al orquestador
   - El orquestador maneja todo el ciclo de turno del bot: tirar, mover, decidir, ejecutar, siguiente
8. Modificar `components/GameOverlay.vue`:
   - Mostrar badge "🤖" junto al nombre del jugador bot en la lista de jugadores, con color diferente según dificultad
   - Cuando el jugador activo es bot: ocultar botón "Tirar Dados" y "Siguiente", mostrar animación/spinner de "Bot pensando..."
   - Deshabilitar botón de intercambio si jugador activo es bot (el bot inicia intercambios automáticamente)
9. Modificar `components/TileCard.vue`:
   - Si el jugador activo es bot, no mostrar el overlay de decisión de compra/subasta. El bot decide vía `useBotTurn`
10. Modificar `components/AuctionModal.vue`:
    - Cuando un bot participa en subasta, auto-pujar con delay según la estrategia del bot
    - Mostrar visualmente las pujas del bot como ocurren
    - Si el único jugador humano se pasa, la subasta se resuelve automáticamente entre bots
11. Modificar `components/ExchangeModal.vue`:
    - Cuando un bot recibe una propuesta de intercambio, responder automáticamente con delay
    - Cuando un bot inicia intercambio, mostrar la propuesta al jugador humano con UI normal
12. Modificar `components/SidebarConfig.vue`:
    - Deshabilitar botones de gestión de propiedades para jugadores bot
13. Agregar estados reactivos al store para comunicación bot-UI:
    - `isBotThinking: boolean` — Indica que un bot está procesando su turno
    - `botActionMessage: string` — Mensaje descriptivo de la acción del bot

## Acceptance Criteria

- [x] La pantalla de setup muestra 3 tabs: Familiar, Bots y Multijugador (deshabilitado)
- [x] El tab Familiar funciona exactamente igual que antes (sin cambios)
- [x] El tab Bots permite configurar jugadores como Humano, Bot Regular o Bot Difícil
- [x] Los campos de nombre se auto-rellenan y deshabilitan para bots (e.g., "Bot Regular 1", "Bot Difícil 2")
- [x] Las fichas se asignan automáticamente para bots sin conflicto con humanos
- [x] En el tab Multijugador se muestra "Próximamente" y el tab está deshabilitado
- [x] `PlayerState` incluye `isBot` y `botDifficulty` correctamente persistidos en el store
- [x] Los bots tiran dados automáticamente con delay visual apropiado
- [x] Los bots toman decisiones de compra/subasta/skip sin intervención del usuario
- [x] El Bot Regular compra cuando tiene suficiente dinero, subasta moderadamente, construye limitado
- [x] El Bot Difícil compra estratégicamente, puja agresivamente, construye agresivamente, inicia intercambios
- [x] La UI refleja las acciones del bot con mensajes de estado y animaciones
- [x] Cuando un bot está "pensando", se muestra indicador visual y los botones humanos se deshabilitan
- [x] Las subastas funcionan con bots pujando automáticamente con delays visibles
- [x] Los bots manejan correctamente la cárcel (pagar fianza o tirar dobles según estrategia)
- [x] Los bots no permiten al usuario tomar decisiones por ellos en ningún punto del flujo
- [x] Los intercambios iniciados por bots proponen propiedades que completan grupos de color (Bot Difícil)
- [x] Al responder intercambios, los bots aceptan/rechazan según su estrategia
- [x] El juego detecta correctamente la victoria incluyendo jugadores bot
- [x] La quiebra de un bot se maneja correctamente sin intervención del usuario

## Notes

- **Timing**: Los bots deben tener delays entre acciones (600-1200ms) para que el usuario pueda seguir visualmente lo que hacen. Sin delays, el juego se vuelve ilegible.
- **No backend**: Toda la lógica de bots corre en el frontend. No hay comunicación con servidor.
- **Tab Multijugador**: Es un placeholder visual. La implementación real será otro spec futuro.
- **Bot exchanges**: El Bot Difícil inicia intercambios, pero para MVP el Bot Regular no los inicia. Ambos responden intercambios propuestos por humanos o bots.
- **MVP scope**: Los bots construyen casas/hoteles con la acción directa del store (`buildHouse`/`buildHotel`), no a través del sidebar. La gestión de propiedades del sidebar solo es relevante para humanos.
- **Visual feedback**: Se recomienda agregar un `botActionMessage` contextual como "Bot Regular está pensando..." para evitar que la UI parezca congelada.
- **Auction auto-resolution**: Si todos los jugadores restantes en una subasta son bots, la subasta se resuelve automáticamente entre ellos sin intervención humana.
- **Al menos 1 humano**: En modo Bots, debe haber al menos 1 jugador Humano. Si todos son bots, se muestra error.