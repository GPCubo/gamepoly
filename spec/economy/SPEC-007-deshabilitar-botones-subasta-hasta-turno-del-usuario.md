---
id: SPEC-003
title: Deshabilitar botones de subasta hasta el turno del usuario
created_at: 2026-06-10T00:00:00
status: done
---

# SPEC-003: Deshabilitar botones de subasta hasta el turno del usuario

## Descripción

En `AuctionModal.vue`, una vez que un jugador humano realiza una oferta o pasa, los botones de puja y el botón "Pasar" deben deshabilitarse mientras el turno pertenece a otro jugador (sea bot u otro humano). Los botones solo se habilitan cuando `currentBidderId` corresponde a un jugador humano (no-bot) — es decir, cuando el turno está activamente en manos de algún humano sentado frente a la pantalla.

## Contexto y Motivación

Actualmente la condición de deshabilitado de los botones de puja es únicamente `:disabled="!canAfford(currentBid + inc)"`, que solo verifica si el **bidder activo** puede pagar. Esto significa que cuando el turno lo tiene un bot, los botones siguen visualmente habilitados y un humano impaciente podría hacer clic (la llamada a `placeBid` valida internamente pero la UX es confusa). La experiencia correcta es: cuando un jugador humano termina su turno haciendo una oferta o pasando, los controles deben quedar claramente deshabilitados hasta que el turno regrese a un humano.

## Análisis Técnico

### Componente afectado

- **`components/AuctionModal.vue`** — único archivo a modificar.

### Estado actual relevante

```typescript
// AuctionModal.vue ~línea 143
const currentBidderId = computed(() => activeBidders.value[turnIdx.value] ?? -1);
```

Los botones de puja (línea ~42):
```vue
:disabled="!canAfford(currentBid + inc)"
```

El botón "Pasar" no tiene condición `:disabled` actualmente.

El watcher de bot (línea ~220) ya gestiona los turnos de bot automáticamente con un delay de 600–1400ms.

### Computed a añadir

```typescript
const currentBidderIsBot = computed(() =>
  props.players.find((p) => p.id === currentBidderId.value)?.isBot ?? false
);
```

Con esto, la condición de deshabilitado de los botones de puja pasa a ser:
```vue
:disabled="currentBidderIsBot || !canAfford(currentBid + inc)"
```

Y el botón "Pasar" recibe:
```vue
:disabled="currentBidderIsBot"
```

### Riesgos

- Si `props.players` no incluye al bidder actual (edge case al eliminar jugadores en quiebra), `currentBidderIsBot` queda `false` por defecto, lo que es conservador y no bloquea la UI innecesariamente.
- En partidas de un solo jugador humano vs bots, el efecto es que los botones parpadean habilitado → deshabilitado → habilitado con cada turno de bot, lo cual es el comportamiento deseado.

## Plan de Implementación

### Archivos a crear

- _(ninguno)_

### Archivos a modificar

- `components/AuctionModal.vue` — añadir `currentBidderIsBot` computed y actualizar las condiciones `:disabled` de los botones de puja y de "Pasar".

### Pasos ordenados

1. En el bloque `<script setup>` de `AuctionModal.vue`, añadir el computed `currentBidderIsBot` justo después de `currentBidderCash`.
2. En el template, actualizar `:disabled` de cada botón de puja de `!canAfford(currentBid + inc)` a `currentBidderIsBot || !canAfford(currentBid + inc)`.
3. En el template, localizar el botón "Pasar" y añadirle `:disabled="currentBidderIsBot"`.
4. Verificar visualmente que durante el delay del bot los botones aparecen deshabilitados y se rehabilitan al volver el turno a un humano.

## Criterios de Aceptación

- [x] Cuando es el turno de un bot en la subasta, todos los botones de puja están deshabilitados.
- [x] Cuando es el turno de un bot en la subasta, el botón "Pasar" está deshabilitado.
- [x] Cuando el turno regresa a un jugador humano, los botones se habilitan (sujeto a la condición de saldo suficiente).
- [x] En partidas solo con humanos (sin bots), los botones siempre están habilitados durante la subasta (sin regresión).
- [x] No hay errores de TypeScript ni de consola introducidos por el cambio.

## Notas

- No se requiere cambio alguno en la lógica de negocio (`placeBid`, `pass`, `advanceTurn`) ni en el store.
- El estilo visual de botón deshabilitado ya existe en el proyecto (`.disabled-btn` con `opacity: 0.5; cursor: not-allowed`) — los botones de subasta deberían heredar ese comportamiento al recibir `disabled`.
