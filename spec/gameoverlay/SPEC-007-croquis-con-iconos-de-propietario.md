---
id: SPEC-007
title: Croquis con iconos de propietario
created_at: 2026-06-10T08:00:00
status: done
---

# SPEC-007: Croquis con iconos de propietario

## Description

Mostrar en el mapa/croquis superior izquierdo un icono pequeno del jugador que compro cada propiedad. El icono debe aparecer sobre la casilla comprada y no debe competir visualmente con la ficha principal del tablero.

## Context and Motivation

El croquis superior izquierdo ayuda a leer el estado general de la partida. Cuando las propiedades cambian de dueno, el usuario necesitaba una senal rapida para saber quien posee cada casilla sin abrir tarjetas ni revisar el sidebar.

## Technical Analysis

- `components/GameOverlay.vue` ya renderiza el croquis/minimapa.
- `store.propertyOwners` contiene la relacion `tileIndex -> playerId`.
- `store.players` contiene la ficha/token de cada jugador.
- Se calcula una lista derivada de marcadores de propietario para propiedades comprables.
- Cada marcador usa la posicion normalizada de la casilla en el croquis y muestra el token del propietario en tamano reducido.

## Implementation Plan

### Files to modify

- `components/GameOverlay.vue`

### Ordered Steps

1. Leer `store.propertyOwners` desde el overlay.
2. Mapear cada propiedad comprada a su jugador propietario.
3. Calcular la posicion del marcador usando la geometria existente del croquis.
4. Renderizar un icono reducido del token del propietario.
5. Estilizar el marcador para que sea legible pero pequeno.
6. Evitar que el marcador bloquee interacciones.
7. Mantener el croquis responsivo.

## Acceptance Criteria

- [x] Al comprar una propiedad, aparece el icono del comprador en el croquis.
- [x] El icono es mas pequeno que una ficha normal.
- [x] El icono queda ubicado sobre la casilla correspondiente.
- [x] Los iconos se actualizan cuando cambia `propertyOwners`.
- [x] El croquis sigue funcionando con varios jugadores y bots.
- [x] El marcador no tapa de forma agresiva la lectura del croquis.
- [x] `npm run build` pasa despues del cambio.

## Notes

- Esta funcionalidad representa propiedad, no posicion actual del jugador.
- Si una propiedad queda sin dueno por bancarrota, el marcador desaparece al actualizar `propertyOwners`.
