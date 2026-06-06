---
id: SPEC-006
title: Gestion de propiedades desde sidebar
created_at: 2026-06-06T10:39:15
status: done
---

# SPEC-006: Gestion de propiedades desde sidebar

## Description

Extender el sidebar de configuracion para que el jugador activo pueda gestionar sus propiedades sin depender de caer exactamente en la casilla. El sidebar debe listar las propiedades del jugador activo y permitir comprar casas, ampliar a hotel, vender mejoras, hipotecar y levantar hipoteca.

## Context and Motivation

El sidebar fue creado para reducir botones visibles durante la partida (gameoverlay/SPEC-005). Despues de implementar casas, hoteles e hipotecas (economy/SPEC-003), gestionar mejoras solo desde la tarjeta de casilla era lento para pruebas y poco practico durante gameplay. La gestion lateral permite tomar decisiones economicas desde un unico panel.

## Technical Analysis

- `components/SidebarConfig.vue` se reemplaza por una version mas completa con seccion `Propiedades`.
- La lista usa `BOARD_TILES` y `store.propertyOwners` para filtrar propiedades, ferrocarriles y servicios del jugador activo.
- Cada propiedad muestra nombre corto, estado de desarrollo y acciones disponibles.
- El sidebar reutiliza las acciones del store:
  - `store.buildHouse`
  - `store.buildHotel`
  - `store.sellImprovement`
  - `store.mortgageProperty`
  - `store.unmortgageProperty`
- Los botones se deshabilitan si hay movimiento, dados rodando, fondos insuficientes o reglas no cumplidas.
- La UI conserva el boton de Intercambio y Camara del sidebar original.
- La navegacion por teclado principal del sidebar se conserva para los botones superiores; las acciones dinamicas quedan disponibles como botones normales tabulables/clicables.

## Implementation Plan

### Files to create

- Ninguno. Se modifica el componente existente `components/SidebarConfig.vue`.

### Files to modify

- `components/SidebarConfig.vue` - Agregar panel de propiedades, acciones dinamicas, estilos y conexion al store.

### Ordered Steps

1. Importar `BOARD_TILES` y tipos de casilla.
2. Calcular `activePlayerId` y `activeOwnedTiles`.
3. Mostrar contador y estado vacio si el jugador activo no tiene propiedades.
4. Renderizar tarjetas compactas para propiedades, ferrocarriles y servicios propios.
5. Mostrar estado: hipotecada, activa, grupo completo, casas u hotel.
6. Mostrar accion de casa si la propiedad permite construir y tiene menos de 3 casas.
7. Mostrar accion de hotel cuando la propiedad tiene 3 casas.
8. Mostrar accion de vender mejora si hay casas u hotel.
9. Mostrar accion de hipotecar o levantar hipoteca segun estado actual.
10. Reutilizar validadores del store para habilitar/deshabilitar acciones.
11. Agregar estilos compactos para que el panel funcione dentro del ancho del sidebar.
12. Verificar el flujo con `?onegroupproperty=true`.

## Acceptance Criteria

- [x] El sidebar lista propiedades del jugador activo.
- [x] El contador de propiedades se actualiza segun el jugador activo.
- [x] Las propiedades muestran estado de grupo completo, casas, hotel o hipoteca.
- [x] El jugador puede construir casas desde el sidebar.
- [x] El jugador puede ampliar a hotel desde el sidebar cuando corresponde.
- [x] El jugador puede vender mejoras desde el sidebar.
- [x] El jugador puede hipotecar propiedades desde el sidebar.
- [x] El jugador puede levantar hipoteca desde el sidebar si tiene fondos.
- [x] Los botones se deshabilitan durante movimiento o dados.
- [x] El sidebar mantiene Intercambio y Camara.
- [x] El layout no bloquea el tablero ni usa backdrop modal.

## Notes

- Esta spec complementa economy/SPEC-003; el sidebar no duplica reglas, solo llama al store.
- El ancho del sidebar se amplio a `min(320px, 88vw)` para que las acciones quepan mejor.
- Los iconos usan `material-symbols-outlined`, consistente con el resto de la interfaz actual.
- La prueba manual confirmo que con `?onegroupproperty=true` el jugador activo ve el grupo asignado y puede comprar una casa desde el sidebar.
