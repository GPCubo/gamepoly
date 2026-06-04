---
id: SPEC-001
title: Tarjetas de casilla al caer - overlay CSS con info de la casilla
created_at: 2026-06-04T00:00:00
status: done
---

# SPEC-001: Tarjetas de casilla al caer - overlay CSS con info de la casilla

## Descripción

Cuando un jugador termina su movimiento (`isTurnComplete = true`), mostrar una tarjeta emergente CSS con la información de la casilla en la que cayó. La tarjeta imita el diseño clásico del Monopoly:

- **Propiedades** (`property`): banda de color del grupo en la parte superior, nombre, precio de compra.
- **Ferrocarriles** (`railroad`): icono 🚂, nombre, precio.
- **Servicios** (`utility`): icono 💡/💧, nombre, precio.
- **Impuestos** (`tax`): icono 💸, nombre, monto a pagar.
- **Cartas** (`card` — Suerte / Arca Comunal): icono del mazo, nombre.
- **Esquinas** (`corner` — Salida, Cárcel, Parking, Ve a la Cárcel): icono y descripción breve.

La tarjeta se cierra al hacer clic en su botón ✕ o al pulsar "Siguiente ↪" en `GameOverlay`.

## Contexto y Motivación

Actualmente el juego no proporciona ningún feedback visual sobre qué casilla se pisó más allá del número en el badge de estado. Las tarjetas de casilla son la forma estándar del Monopoly de comunicar al jugador la acción a tomar (comprar, pagar impuesto, robar carta, etc.). Esta feature es el primer paso antes de implementar la lógica económica (compra/alquiler).

El flujo afectado: `pages/game.vue` → nuevo `components/TileCard.vue`, con integración en `GameOverlay.vue` para el cierre por "Siguiente".

## Análisis Técnico

### Datos disponibles

- `BOARD_TILES` en `config/boardTilesConfig.ts` — 40 casillas (índice 0–39) con `type`, `group`, `name`, `price?`.
- `store.casillaActual` (getter, `gameStore.ts:52`) — devuelve `(position % 40) + 1` (1-based). Mapear a BOARD_TILES con `(casillaActual - 1 + 40) % 40`.
- `store.isTurnComplete` — trigger para mostrar la tarjeta.
- `store.activePlayer` — para contextualizar ("Jugador X cayó en…").

### Mapa de colores de grupo

```ts
const GROUP_COLORS: Record<TileGroup, string> = {
  brown: '#8B4513', lightBlue: '#87CEEB', pink: '#FF69B4',
  orange: '#FFA500', red: '#CC0000', yellow: '#FFD700',
  green: '#007A33', darkBlue: '#00008B', railroad: '#333333',
  utility: '#777777', tax: '#555555', chance: '#FF6600',
  community: '#0066CC', go: '#CC0000', jail: '#aaaaaa',
  parking: '#555555', gotojail: '#CC0000',
};
```

### Ciclo de vida de la tarjeta

1. `store.isTurnComplete` → `true`: la tarjeta aparece con animación `slideUp`.
2. Jugador lee y cierra con ✕ **o** pulsa "Siguiente ↪" en `GameOverlay`.
3. `showTileCard = false` → animación `fadeOut`. Turno avanza (`store.finishTurn()`).

### Montos de impuesto (hardcoded por ahora)

- Impuesto s/Renta (index 4): $200
- Impuesto de Lujo (index 38): $100

### Riesgos

- `casillaActual` es 1-based; `BOARD_TILES` es 0-based — cuidado en el mapeo.
- Las casillas `corner` no tienen precio; el template debe manejarlo sin romper el layout.
- La tarjeta no debe bloquear el botón de dados cuando aún no es `isTurnComplete`.

## Plan de Implementación

### Archivos a crear

- `components/TileCard.vue` — componente de tarjeta CSS con todos los tipos de casilla.

### Archivos a modificar

- `pages/game.vue` — montar `<TileCard>`, watcher de `isTurnComplete`, computed `currentTile`, cierre al avanzar turno.
- `components/GameOverlay.vue` — sin cambios de firma; el cierre lo maneja `game.vue` en `onNextTurn`.

### Pasos ordenados

1. **Crear `components/TileCard.vue`**:
   - Prop: `tile: BoardTile`.
   - Emit: `close`.
   - Secciones condicionales por `tile.type` con el mapa de colores.
   - Para `property`: banda de color (height 60px) + nombre + precio.
   - Para `railroad`/`utility`: icono + nombre + precio.
   - Para `tax`: icono 💸 + nombre + monto hardcodeado.
   - Para `card`: icono por grupo + "Roba una carta".
   - Para `corner`: icono + mensaje según `tile.group`.
   - Botón ✕ absoluto en esquina superior derecha.
   - Animación CSS `@keyframes slideUp` en entrada; `v-show` + `Transition` para salida.
   - Estilo: fondo `rgba(15,15,30,0.97)`, borde `rgba(74,222,128,0.2)`, fuente monospace.

2. **Actualizar `pages/game.vue`**:
   - Importar `TileCard` y `BOARD_TILES`.
   - `const showTileCard = ref(false)`.
   - `const currentTile = computed(() => BOARD_TILES[(store.casillaActual - 1 + 40) % 40])`.
   - `watch(() => store.isTurnComplete, (v) => { if (v) showTileCard.value = true; })`.
   - Montar `<TileCard v-if="showTileCard" :tile="currentTile" @close="showTileCard = false" />`.

3. **Actualizar `onNextTurn` en `pages/game.vue`**:
   - `showTileCard.value = false` antes de `store.finishTurn()`.

## Criterios de Aceptación

- [x] Al terminar el movimiento, aparece la tarjeta con información de la casilla aterrizando.
- [x] Las tarjetas de tipo `property` muestran la banda de color del grupo, el nombre y el precio.
- [x] Las tarjetas de tipo `railroad` y `utility` muestran su icono, nombre y precio.
- [x] Las tarjetas de tipo `tax` muestran el icono y el monto a pagar.
- [x] Las tarjetas de tipo `card` muestran el icono y nombre del mazo.
- [x] Las tarjetas de tipo `corner` muestran un mensaje descriptivo apropiado.
- [x] La tarjeta tiene un botón ✕ que la cierra sin avanzar el turno.
- [x] Al pulsar "Siguiente ↪" en el overlay, la tarjeta se cierra y el turno avanza.
- [x] La tarjeta tiene animación de entrada (`slideUp`) y salida (`fadeOut`).
- [x] El estilo es consistente: fondo oscuro, tipografía monospace, acento verde `#4ade80`.

## Notas

- Los montos de impuesto son fijos ($200/$100). Pueden moverse a `GAME_CONFIG` cuando se implemente la economía.
- La lógica de compra/pago/alquiler se implementará en specs posteriores; esta tarjeta es solo informativa.
- El mapa `GROUP_COLORS` puede exportarse desde `boardTilesConfig.ts` en el futuro para reutilización.
- El botón "Siguiente ↪" no espera a que el jugador cierre la tarjeta; simplemente la cierra y avanza.
