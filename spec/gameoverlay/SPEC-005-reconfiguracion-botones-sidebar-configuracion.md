---
id: SPEC-005
title: Reconfiguración de botones al jugar — Sidebar de configuración
created_at: 2026-06-05T07:18:32
status: done
---

# SPEC-005: Reconfiguración de botones al jugar — Sidebar de configuración

## Description

Reducir los botones visibles en la barra inferior del gameplay a solo 2: **Tirar Dados** y **Configuración** (⚙). Al presionar el botón de Configuración se abre un sidebar lateral izquierdo que no bloquea la partida ni aplica opacidad al resto de la pantalla. El sidebar tiene su propia X (esquina superior derecha) y admite navegación con flechas arriba/abajo para seleccionar opciones y ESC para cerrar.

El sidebar contiene los botones que antes estaban en la barra inferior:

1. **Intercambio** — misma funcionalidad que el botón actual de intercambio (`🔄 Intercambio`)
2. **Cámara Fija/Libre** — toggle que alterna `store.toggleCameraFollow()`, mismo comportamiento actual
3. **Pagar fianza** — aparece condicionalmente cuando `activePlayerInJail && !store.isTurnComplete` (igual que ahora)

El botón "Siguiente ↪" desaparece de la barra inferior y del sidebar. El botón principal ("Tirar Dados") asume doble función: cuando `store.isTurnComplete` es true, cambia su label a "Siguiente ↪" y ejecuta la acción de siguiente turno en vez de tirar dados.

## Context and Motivation

Durante el gameplay se muestran muchos botones en la barra inferior ( Tirar Dados, Intercambio, Cámara), lo que recarga la interfaz y distrae. La simplificación a solo 2 botones mejora la experiencia visual y la usabilidad. El sidebar no intrusivo permite acceso rápido sin interrumpir la partida.

## Technical Analysis

### Estado actual

- **`GameOverlay.vue`** (líneas 54-107): 3 botones en `.action-buttons` (Tirar Dados, Intercambio, Cámara)
- **Botones adicionales** (líneas 30-42, 44-52): Fianza y Siguiente aparecen condicionalmente dentro de `.overlay-container`
- **`useKeyboardNavigation.ts`**: Composable que maneja flechas + Enter/Space. Se usa con `direction: "horizontal"` en GameOverlay
- **Z-index existentes**: Game UI 100-150, TileCard 200, CardOverlay 210, ExchangeModal/AuctionModal 300, WinnerOverlay 400
- **No existe** componente sidebar en el codebase

### Z-index propuesto

- Sidebar de configuración: z-index 170 (por debajo de TileCard pero por encima de GameOverlay)

### Composable `useKeyboardNavigation`

Se puede reutilizar tal cual con `direction: "vertical"` para el sidebar. Sin embargo, se necesita una lógica adicional para ESC que cierre el sidebar. Esto se puede manejar en el propio componente sidebar con un listener de `keydown` para `Escape`.

### Interacción entre focus del overlay y sidebar

Cuando el sidebar está abierto:
- La navegación por flechas del overlay principal (Tirar Dados, Configuración) debe deshabilitarse
- La navegación por flechas del sidebar toma prioridad
- Se puede usar `overlayEnabled` existente o un nuevo flag `sidebarOpen`

## Implementation Plan

### Files to create

- `components/SidebarConfig.vue` — Componente sidebar de configuración

### Files to modify

- `components/GameOverlay.vue` — Eliminar botones de Intercambio, Cámara, Fianza, Siguiente de la barra inferior. Agregar botón Configuración (⚙). Integrar `<SidebarConfig>`. Actualizar refs, emits, y lógica de `useKeyboardNavigation`.

### Ordered Steps

1. Crear `components/SidebarConfig.vue` con template, script y estilos
   - Props: `open` (boolean), emits: `close`, `open-exchange`, `toggle-camera`, `pay-bail`
   - Template: sidebar que se desliza desde la izquierda, con X en esquina superior derecha
   - Botones: Intercambio (condicional `hasAnyPropertyOwned`), Cámara Fija/Libre (toggle), Pagar fianza (condicional `activePlayerInJail`)
   - Usar `useKeyboardNavigation` con `direction: "vertical"` para los botones del sidebar
   - Listener para `Escape` que emite `close`
   - No overlay/opacidad, el juego permanece completamente visible
   - Styling: fondo semi-transparente oscuro, bordes redondeados a la derecha, transición de deslizamiento

2. Modificar `components/GameOverlay.vue`
   - Eliminar del template los botones de Intercambio, Cámara, Fianza, Siguiente
   - El botón principal ("Tirar Dados") asume doble función: cuando `isTurnComplete` cambia a "Siguiente ↪" y emite `next-turn`
   - Agregar botón `⚙ Configuración` en `.action-buttons` junto al botón principal
   - Agregar ref `configBtnRef` y `sidebarOpen` reactive
   - Agregar `<SidebarConfig>` en el template con props y emits correspondientes
   - Actualizar `actionRefs` para incluir solo `[rollBtnRef, configBtnRef]` de forma horizontal
   - Deshabilitar `overlayEnabled` cuando el sidebar está abierto (para que las flechas no naveguen los botones de abajo)
   - Limpiar refs eliminados: `bailBtnRef`, `nextBtnRef`, `exchangeBtnRef`, `camBtnRef`
   - Agregar `focusButton` para enfocar el sidebar cuando se abre
   - Focus vuelve a Tirar Dados al cerrar el sidebar

3. Ajustar estilos del botón Configuración
   - Similar al `.cam-btn` actual pero con ícono ⚙
   - Estado visual: el botón se resalta cuando el sidebar está abierto

4. Verificar interacción con modales existentes (ExchangeModal, etc.)
   - Cuando se abre el ExchangeModal desde el sidebar, el sidebar se cierra primero
   - `cardOpen` ya deshabilita la navegación del overlay, debe también cerrar el sidebar

## Acceptance Criteria

- [x] La barra inferior solo muestra 2 botones: el botón dual (Tirar Dados / Siguiente) y "⚙ Configuración"
- [x] Al presionar "Configuración" se abre un sidebar desde la izquierda sin opacidad ni bloqueo del juego
- [x] El sidebar muestra los botones: Intercambio, Cámara Fija/Libre, Pagar fianza (condicional)
- [x] El botón Intercambio en el sidebar funciona igual que antes (abre ExchangeModal)
- [x] El botón Cámara en el sidebar alterna entre Fija/Libre igual que antes
- [x] El botón Pagar fianza aparece solo cuando el jugador activo está en la cárcel y no completó turno
- [x] El botón principal cambia a "Siguiente ↪" cuando `store.isTurnComplete` y ejecuta la acción de siguiente turno
- [x] El botón principal muestra "Tirar Dados" (o variantes) cuando el turno no está completo
- [x] Flechas arriba/abajo navegan entre los botones del sidebar cuando está abierto
- [x] ESC cierra el sidebar
- [x] La X en esquina superior derecha cierra el sidebar
- [x] Al cerrar el sidebar, el focus vuelve al botón principal
- [x] Las flechas izquierda/derecha siguen navegando botón principal ↔ Configuración cuando el sidebar está cerrado
- [x] El sidebar no bloquea la partida ni añade opacidad al fondo
- [x] Al abrir ExchangeModal desde el sidebar, el sidebar se cierra primero

## Notes

- El sidebar no usa backdrop/blur como los demás modales (ExchangeModal, TileCard, etc.) porque debe permitir interacción con el juego
- Z-index del sidebar: 170, entre GameOverlay (100) y TileCard (200)
- Se reutiliza `useKeyboardNavigation` con `direction: "vertical"` para no duplicar lógica
- La funcionalidad de los botones del sidebar no cambia, solo se mueve de ubicación
- El botón "Siguiente" se eliminó: ahora el botón principal asume doble función (Tirar Dados / Siguiente ↪) según el estado del turno