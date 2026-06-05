---
id: SPEC-004
title: Focus y navegación por teclado en botones de acción
created_at: 2026-06-04T12:00:00
status: done
---

# SPEC-004: Focus y navegación por teclado en botones de acción

## Description

Implementar navegación por teclado completa para todos los botones de acción del juego. Los botones deben:
1. Recibir **focus visual** cuando están activos/disponibles.
2. Permitir **navegar entre botones** con las flechas del teclado (←/→ o ↑/↓ según layout).
3. Permitir **activar el botón enfocado** con Enter.
4. Hacer **auto-focus** al botón principal cuando aparece un overlay o sección de acción.

Los botones afectados son:
- **INICIAR** (página de inicio)
- **🎲 Tirar Dados / Tirar por dobles** (GameOverlay)
- **🔓 Pagar fianza** (GameOverlay, cuando el jugador está preso)
- **Siguiente ↪** (GameOverlay, al completar turno)
- **Comprar** (TileCard)
- **Subastar** (TileCard)
- **Omitir** (TileCard)
- **Suerte / Arca Comunal → Aceptar** (CardOverlay)
- **Botones de subasta** (+$10, +$50, +$100, Pasar, Cerrar) (AuctionModal)
- **Nueva partida** (WinnerOverlay)

## Context and Motivation

Actualmente todos los botones carecen de:
- `tabindex` — no son alcanzables por Tab
- `aria-*` — sin etiquetas accesibles
- `ref` para focus programático
- autofocus al montar un overlay

La única navegación por teclado existente usa `window.addEventListener("keydown")` global:
- `GameOverlay.vue:219-232` — Enter/Space alterna entre tirar dados y siguiente turno, pero no permite elegir entre opciones.
- `TileCard.vue:385-402` — Enter/Space selecciona automáticamente la primera acción disponible (comprar > omitir > subastar), sin permitir al usuario elegir.
- `pages/index.vue:269-275` — Enter inicia el juego, Escape cierra settings.

El objetivo es que un jugador pueda jugar completamente con el teclado: flechas para mover focus entre botones del grupo activo, Enter para activar, y focus automático al botón más relevante en cada fase del juego.

## Technical Analysis

### Problemas actuales

1. **Sin tabindex**: Ningún botón tiene `tabindex`, lo que significa que el Tab del navegador los saltea.
2. **Sin focus visible**: No hay estilos CSS para `:focus` o `:focus-visible` en los botones de acción.
3. **Sin focus management**: Cuando un overlay aparece (TileCard, AuctionModal, CardOverlay), ningún botón recibe focus automáticamente.
4. **Conflictos de keydown global**: `GameOverlay.vue` y `TileCard.vue` ambos escuchan `keydown` en `window`, con `stopImmediatePropagation` en TileCard. Esto es frágil.
5. **Sin agrupación de focus**: No hay `tabindex` agrupado ni roles para los grupos de botones.

### Patrones del proyecto

- Vue 3 Composition API con `<script setup>` y TypeScript.
- Pinia store (`stores/gameStore.ts`) centraliza el estado del juego.
- Estilos scoped en cada componente `.vue`.
- Composables en `composables/` para lógica reutilizable.

## Implementation Plan

### Files to create

- `composables/useKeyboardNavigation.ts` — Composable reutilizable para manejar focus groups, navegación con flechas, y activación con Enter.

### Files to modify

- `pages/index.vue` — Agregar focus al botón INICIAR, tabindex, y mantener Enter.
- `components/GameOverlay.vue` — Refactorizar keydown global hacia composable, agregar tabindex y focus visual a botones Tirar Dados, Pagar fianza y Siguiente.
- `components/TileCard.vue` — Refactorizar keydown global, agregar tabindex y focus visual a botones Comprar, Subastar, Omitir. Navegación con flechas entre los 3 botones.
- `components/AuctionModal.vue` — Agregar tabindex y focus visual a botones de puja, Pasar y Cerrar. Navegación con flechas.
- `components/CardOverlay.vue` — Agregar tabindex, focus visual y auto-focus al botón Aceptar.
- `components/WinnerOverlay.vue` — Agregar auto-focus al botón Nueva partida.

### Ordered Steps

1. Crear `composables/useKeyboardNavigation.ts` con lógica para registrar un grupo de botones, navegar con flechas (←/→ para horizontal, ↑/↓ para vertical), activar con Enter, y auto-focus al primer botón disponible cuando se monta o cuando cambia un flag.
2. Agregar estilos CSS `:focus-visible` a los botones de acción en cada componente.
3. Modificar `pages/index.vue`: mantener Enter existente, agregar `ref` al botón INICIAR y autofocus al montar la página.
4. Modificar `components/GameOverlay.vue`: reemplazar `window.addEventListener("keydown")` con composable, agregar `tabindex="0"` y `ref` a los botones, auto-focus al botón relevante según fase del turno.
5. Modificar `components/TileCard.vue`: reemplazar `window.addEventListener("keydown")` con composable, agregar `tabindex="0"` y `ref` a Comprar/Subastar/Omitir, navegación ←/→, auto-focus al primer botón disponible.
6. Modificar `components/AuctionModal.vue`: agregar `tabindex="0"` y `ref` a botones de puja, Pasar y Cerrar, navegación con flechas, auto-focus en Pasar.
7. Modificar `components/CardOverlay.vue`: agregar `tabindex="0"` y auto-focus al botón Aceptar, Enter activa Aceptar.
8. Modificar `components/WinnerOverlay.vue`: agregar `tabindex="0"` y auto-focus al botón Nueva partida.

## Acceptance Criteria

- [x] Al abrir cualquier overlay, el botón principal recibe focus automáticamente
- [x] Las flechas del teclado (←/→ o ↑/↓) mueven el focus entre botones del grupo activo
- [x] Enter activa el botón que tiene focus
- [x] Los botones deshabilitados son saltados en la navegación (no reciben focus)
- [x] El focus se indica visualmente con un estilo claramente distinguible (`:focus-visible`)
- [x] INICIAR recibe auto-focus al cargar la página de inicio
- [x] Tirar Dados recibe auto-focus al inicio de cada turno
- [x] Cuando el jugador está preso, Pagar fianza y Tirar por dobles son navegables con flechas
- [x] En TileCard, se puede navegar entre Comprar, Subastar y Omitir con flechas
- [x] En AuctionModal, se puede navegar entre botones de puja y Pasar con flechas
- [x] En CardOverlay, Aceptar recibe auto-focus
- [x] WinnerOverlay: Nueva partida recibe auto-focus
- [x] Los listeners globales de keydown viejos (window.addEventListener) son reemplazados por el composable

## Notes

- Los `window.addEventListener` globales existentes en GameOverlay.vue y TileCard.vue serán reemplazados por el composable `useKeyboardNavigation`, eliminando conflictos por `stopImmediatePropagation`.
- Los estilos `:focus-visible` deben ser consistentes con el diseño existente del juego.
- Se debe considerar qué botón recibe focus por defecto en cada contexto: el más relevante para la acción esperada del jugador.
- Los botones deshabilitados (`:disabled`) no deben participar en la navegación por teclado.