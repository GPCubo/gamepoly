---
id: SPEC-003
title: Modelos 3D detallados de casas y hoteles para el tablero
created_at: 2026-06-06T10:39:15
status: done
---

# SPEC-003: Modelos 3D detallados de casas y hoteles para el tablero

## Description

Crear modelos 3D mas detallados para representar casas y hoteles dentro del tablero, inspirados en referencias isometricas con techo rojo, ventanas azules, bordes marcados y volumen menos poligonal. Los modelos deben poder reutilizarse cambiando colores principales desde variables del script Blender.

El trabajo incluye una casa detallada, un hotel detallado, exportacion a GLB y configuracion para que el tablero pueda mostrar casas u hoteles segun el desarrollo economico de cada propiedad.

## Context and Motivation

El tablero ya tenia casillas y etiquetas visibles (board/SPEC-002), pero las construcciones eran demasiado basicas y no comunicaban bien la progresion de una propiedad. Monopoly necesita una diferencia clara entre propiedad sin mejorar, casas y hotel. La mejora visual tambien ayuda a probar que la logica economica de casas/hoteles se refleja en el tablero.

## Technical Analysis

- `scripts_blenders/casa_mvp_detallada_v3.py` genera una casa isometrica detallada con techo rojo, ventanas azules, puerta, chimenea, tejas, bordes y separaciones para evitar cruces visuales.
- `scripts_blenders/hotel_mvp_detallado_v1.py` genera un hotel de varias plantas, con techo rojo, chimeneas, letrero HOTEL, terraza, barandales laterales, puerta de terraza y bandera.
- Ambos scripts tienen variables de color reutilizables para el rojo de componentes y el azul de ventanas.
- `public/models/casa_detallada.glb` y `public/models/hotel_detallado.glb` son los assets exportados que consume el juego.
- `config/boardHouseAssets.ts` centraliza las definiciones de asset (`casa`, `hotel`), rutas, escalas, offsets y la conversion desde estado de desarrollo a placements.
- `pages/game.vue` carga ambos modelos GLB y clona escenas segun los placements computados.
- `composables/useBoardGeometry.ts` expone slots multiples para que hasta 4 casas se distribuyan dentro de una propiedad sin ocupar el mismo punto.
- Las construcciones deben apoyarse visualmente sobre el tablero; no deben heredar padding vertical de etiquetas ni flotar sobre las propiedades.

Riesgos considerados:

- Las tejas no deben atravesar chimeneas ni otros objetos.
- Los bordes frontales deben permitir lectura y paso visual peatonal.
- El hotel y la casa deben mantener escala compatible con las casillas del tablero.
- El render de multiples casas no debe desplazar la ficha del jugador ni tapar las etiquetas.

## Implementation Plan

### Files to create

- `scripts_blenders/casa_mvp_detallada_v3.py` - Script Blender configurable para generar la casa detallada.
- `scripts_blenders/hotel_mvp_detallado_v1.py` - Script Blender configurable para generar el hotel detallado.
- `public/models/casa_detallada.glb` - Asset GLB de la casa para el tablero.
- `public/models/hotel_detallado.glb` - Asset GLB del hotel para el tablero.
- `config/boardHouseAssets.ts` - Configuracion de assets de construcciones y placements por desarrollo.
- `casa_mvp_detallada_v3_preview.png` - Preview visual de la casa generada.
- `hotel_mvp_detallado_v1_preview.png` - Preview visual del hotel generado.

### Files to modify

- `pages/game.vue` - Cargar definiciones dinamicas de casa/hotel y renderizar placements segun `store.propertyDevelopments`.
- `composables/useBoardGeometry.ts` - Agregar slots para multiples construcciones en una misma propiedad.

### Ordered Steps

1. Mejorar el script de la casa para agregar techo, ventanas, marco, puerta, chimenea, tejas y bordes.
2. Separar `Casa_Borde_Base_Frontal` en dos partes para conservar un paso peatonal visual.
3. Separar `Casa_Techo_Linea_Teja_Der_2` para que no atraviese la chimenea.
4. Agregar variables de color rojo y azul a la casa para facilitar reutilizacion.
5. Crear el script del hotel inspirado en la casa, con volumen de varias plantas, terraza, balcones, letrero y chimeneas.
6. Quitar `Hotel_Portico_Techo_Rojo` y corregir puerta de terraza, ventanas laterales, barandales y tejas.
7. Agregar variables de color rojo y azul al hotel.
8. Exportar ambos modelos a GLB dentro de `public/models`.
9. Crear `boardHouseAssets.ts` para centralizar rutas, escalas y conversion desde casas/hotel a placements.
10. Actualizar el render del tablero para cargar y clonar modelos segun el desarrollo de propiedades.
11. Agregar slots multiples para distribuir hasta 4 casas en una misma casilla.
12. Ajustar offsets verticales y profundidad local para que casas/hoteles queden pegados al tablero y a la zona de propiedad.

## Acceptance Criteria

- [x] La casa tiene mas detalle visual que el modelo basico original.
- [x] La casa usa variables configurables para rojo de componentes y azul de ventanas.
- [x] El borde frontal de la casa esta dividido en dos partes.
- [x] La teja derecha de la casa no atraviesa la chimenea.
- [x] El hotel mantiene una estetica coherente con la casa.
- [x] El hotel usa variables configurables para rojo de componentes y azul de ventanas.
- [x] El hotel incluye puerta de terraza, ventanas laterales y barandales laterales.
- [x] Las tejas del hotel estan acomodadas para no atravesar otros objetos.
- [x] Existen GLB exportados para casa y hotel en `public/models`.
- [x] El tablero puede renderizar casas y hoteles desde el estado de desarrollo.
- [x] Las casas/hoteles se posicionan pegados al tablero y no flotan visualmente.

## Notes

- La escala de la casa se ajusta menor cuando hay multiples casas para que cuatro unidades entren en una casilla.
- El hotel usa una escala distinta a la casa porque su volumen es mayor.
- Los previews PNG sirven como validacion visual rapida de los scripts Blender.
- Esta spec se conecta directamente con economy/SPEC-003, donde se define cuando una propiedad muestra casas u hotel.
