---
id: SPEC-003
title: Correcciones de autofocus en subasta y configuración multiplayer
created_at: 2026-06-12T10:29:36
status: done
---

# SPEC-015: Correcciones de autofocus en subasta y configuración multiplayer

## Description

Corregir el comportamiento de autofocus y navegación por teclado en `pages/multiplayer/game.vue` para que la experiencia multiplayer sea completamente navegable con flechas en los flujos principales:

- Cuando se abre el modo subasta y es el turno del usuario, el foco debe pasar automáticamente a los botones de puja.
- En la subasta, el usuario debe poder navegar con las flechas entre las pujas disponibles y el botón de pasar turno.
- Cuando se abre el sidebar de configuración, el foco inicial debe estar en el buscador de propiedades.
- Desde el buscador, al presionar flecha arriba, el foco debe pasar a los botones superiores de configuración.
- Desde el buscador, al presionar flecha abajo, el foco debe entrar al listado de propiedades y navegar entre los botones de acción de cada item.

## Context and Motivation

La pantalla multiplayer ya usa `useKeyboardNavigation` para acciones principales, overlay de cartas y parte del sidebar, pero el orden de foco actual no cubre correctamente la subasta ni el flujo completo de configuración. Esto obliga al usuario a usar mouse o tabulación manual en estados donde la interfaz debería guiar el foco automáticamente.

El problema pertenece al flujo de accesibilidad y ergonomía de `pages/multiplayer/game.vue`, específicamente en:

- Modal/overlay de subasta.
- Sidebar de configuración.
- Buscador de propiedades.
- Botones superiores del sidebar.
- Acciones de grupos y propiedades.

## Technical Analysis

El composable existente `composables/useKeyboardNavigation.ts` acepta una lista reactiva de refs a elementos y permite navegación horizontal, vertical o ambos ejes. Se debe reutilizar este patrón para evitar una implementación paralela.

En `pages/multiplayer/game.vue` ya existen refs para acciones principales (`rollBtnRef`, `nextBtnRef`, `configBtnRef`), sidebar (`closeSidebarBtnRef`, `mortgageAllBtnRef`) y carta (`acceptCardBtnRef`). No existen refs dedicadas para los botones de subasta ni para el input de búsqueda. Tampoco existe una estructura de refs dinámica para los botones dentro del listado de propiedades.

Para subasta, se requiere crear refs para:

- Botones de puja `+10`, `+50`, `+100`.
- Botón `Pasar turno`.

Luego se debe activar `useKeyboardNavigation` cuando `mpStore.isAuctionActive && isMyAuctionTurn`.

Para configuración, se requiere:

- Ref al input de búsqueda.
- Ref al botón de cámara fija/libre, ya que actualmente no está referenciado.
- Refs dinámicas para botones de acciones de grupo y de propiedades.
- Un orden de navegación estable: botones superiores, buscador, acciones del listado.

El buscador no es un botón, pero puede incluirse en el flujo si el composable acepta `HTMLElement`; actualmente usa `Ref<HTMLElement | null>`, por lo que `HTMLInputElement` es compatible.

Riesgos:

- Los refs dentro de `v-for` deben actualizarse sin crear duplicados obsoletos entre renders.
- La navegación global puede interferir con otros overlays si se habilitan varios `useKeyboardNavigation` a la vez.
- Cuando el input de búsqueda está enfocado, las flechas horizontales podrían mover el cursor. La regla solicitada solo requiere arriba/abajo para cambiar foco.
- La subasta debe bloquear navegación de acciones principales mientras esté activa.

## Implementation Plan

### Files to create

- Ninguno.

### Files to modify

- `pages/multiplayer/game.vue` - agregar refs de subasta, buscador, cámara y acciones del listado; ajustar `useKeyboardNavigation`; enfocar buscador al abrir configuración; enfocar pujas al entrar en turno de subasta.
- `composables/useKeyboardNavigation.ts` - solo si el comportamiento actual no permite navegar correctamente desde inputs o necesita una opción para limitar teclas por eje.

### Ordered Steps

1. Agregar refs para botones de subasta (`auctionBidBtnRefs`, `auctionPassBtnRef`) y usarlos en el template.
2. Crear `auctionRefs` computado con botones de puja habilitados y botón de pasar turno.
3. Registrar `useKeyboardNavigation(auctionRefs, { direction: "horizontal", allowBothAxes: true, enabled: isAuctionKeyboardEnabled, autoFocusOn: isAuctionKeyboardEnabled })`.
4. Ajustar `overlayKeyboardEnabled` para que acciones principales no capturen flechas/Enter cuando la subasta está activa.
5. Agregar ref al input de búsqueda (`propertySearchInputRef`) y al botón de cámara (`cameraToggleBtnRef`).
6. Agregar refs dinámicas para botones de acciones de grupo y propiedad.
7. Construir un `sidebarRefs` ordenado: botones superiores, buscador, acciones de grupos y propiedades.
8. Al abrir `sidebarOpen`, enfocar `propertySearchInputRef`.
9. Verificar que flecha arriba desde buscador pase a botones superiores y flecha abajo pase al listado.
10. Ejecutar `npm run build`.

## Acceptance Criteria

- [x] Al iniciar una subasta donde el usuario debe pujar, el foco cae en el primer botón de puja habilitado.
- [x] En subasta, flechas izquierda/derecha/arriba/abajo navegan entre pujas y `Pasar turno`.
- [x] `Enter` o espacio ejecuta la acción enfocada en subasta.
- [x] Al abrir configuración, el foco cae en el buscador de propiedades.
- [x] Desde el buscador, flecha arriba mueve el foco a los botones superiores del sidebar.
- [x] Desde el buscador, flecha abajo mueve el foco al listado de propiedades.
- [x] Las acciones de cada propiedad se pueden recorrer con flechas.
- [x] La navegación principal del juego no roba foco mientras subasta o configuración están abiertas.
- [x] `npm run build` pasa sin errores.

## Notes

Se debe priorizar el patrón existente de `useKeyboardNavigation` para mantener consistencia con el resto de la pantalla. Si los refs dinámicos del listado resultan frágiles, se puede crear una función de registro por clave estable (`tile.index` + acción) y limpiar el mapa antes de cada render mediante callbacks de Vue.
