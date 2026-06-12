---
id: SPEC-005
title: Responsive y simplificacion de index y lobby multiplayer
created_at: 2026-06-12T12:36:16
status: done
---

# SPEC-017: Responsive y simplificacion de index y lobby multiplayer

## Description

Mejorar la experiencia en pantallas pequenas de `pages/index.vue` y `pages/multiplayer/lobby.vue`, donde actualmente los formularios no se pueden completar o leer comodamente. Tambien se debe reducir informacion redundante entre el tab de multijugador del index y la pagina de lobby multiplayer.

El tab de multijugador en `pages/index.vue` no deberia pedir o mostrar datos que luego se vuelven a pedir en `pages/multiplayer/lobby.vue`, como cantidad de jugadores, nombre u opciones que pertenecen a la creacion de mesa. La pagina de lobby debe concentrar el formulario real para crear o unirse a una mesa.

Un punto importante a conservar es el boton/opcion de `Unirse a mesa` en el lobby, porque es util para entrar con un codigo compartido.

## Context and Motivation

La pantalla inicial (`pages/index.vue`) funciona como selector de modo y configurador de partida local/bots. Sin embargo, cuando se selecciona multijugador, parte de la configuracion se solapa con el lobby multiplayer. Esto crea friccion y duplicacion: el usuario ve cantidad de jugadores, nombre y otros datos en index, pero luego debe pasar por `pages/multiplayer/lobby.vue`, donde tambien existen nombre, creacion de mesa y unirse a mesa.

En pantallas pequenas, ambos formularios necesitan una revision responsive. El usuario reporta que no puede completar ni leer bien los formularios. Esto apunta a problemas de altura disponible, scroll interno, densidad de tarjetas, tamanos de campos, grillas que no colapsan bien, botones fuera de viewport o contenido redundante ocupando espacio critico.

## Technical Analysis

Archivos relevantes:

- `pages/index.vue` contiene tabs de modo (`bots`, `familiar`, `multiplayer`), selector de cantidad de jugadores, formularios de jugadores, opciones avanzadas y boton de inicio. Actualmente `startGame()` redirige a `/multiplayer/lobby` cuando `activeMode === 'multiplayer'`.
- `pages/multiplayer/lobby.vue` contiene dos modos internos: crear mesa y unirse a mesa. Tiene inputs de nombre, codigo de mesa, slots, configuracion economica y botones para crear/unirse.

Problemas probables:

- `pages/index.vue` muestra el mismo configurador aunque el modo multijugador solo redirige al lobby.
- En mobile, `index.vue` puede tener demasiadas secciones visibles para un modo que no necesita configuracion local.
- `lobby.vue` tiene una tarjeta principal (`.lobby-card`) con secciones densas, slots de jugadores, rangos, checkboxes y acciones, lo que puede exceder altura de pantalla.
- Los estilos responsive actuales solo aparecen en `@media (max-width: 600px)` y probablemente no alcanzan para pantallas chicas en alto o ancho.
- Algunos textos/botones en mayusculas y layouts horizontales pueden forzar overflow.

La solucion debe diferenciar claramente responsabilidades:

- `index.vue`: selector de modo. Para multijugador, mostrar una experiencia simple que explique "crear o unirse a una mesa" y lleve al lobby.
- `lobby.vue`: formulario real de multiplayer, optimizado para mobile, con tabs o selector claro entre `Crear mesa` y `Unirse a mesa`.

## Implementation Plan

### Files to create

- Ninguno.

### Files to modify

- `pages/index.vue` - simplificar el contenido cuando `activeMode === 'multiplayer'`; ocultar configuracion redundante de jugadores/opciones; mostrar CTA hacia lobby; ajustar estilos responsive.
- `pages/multiplayer/lobby.vue` - mejorar layout mobile del formulario de crear/unirse; asegurar scroll, legibilidad, tamanos de campos y botones; mantener visible/accesible el flujo de `Unirse a mesa`.

### Ordered Steps

1. Revisar en `pages/index.vue` que secciones dependen de `activeMode` y separar el contenido de multiplayer.
2. Para `activeMode === 'multiplayer'`, reemplazar formulario redundante por un panel simple con acciones:
   - `Crear mesa`
   - `Unirse a mesa`
   - breve texto de que la configuracion se hace en el lobby.
3. Hacer que los CTAs naveguen a `/multiplayer/lobby`, idealmente con query `?mode=create` o `?mode=join` si se decide soportarlo.
4. En `pages/multiplayer/lobby.vue`, aceptar query inicial opcional para abrir `create` o `join`.
5. Reorganizar lobby en mobile:
   - tarjeta con `max-height` y scroll natural si hace falta;
   - formularios a una columna;
   - botones full-width en pantallas pequenas;
   - inputs con ancho completo y texto legible;
   - slots de jugadores compactos pero legibles;
   - controles economicos apilados.
6. Eliminar textos duplicados o secundarios que no aportan en mobile.
7. Mantener destacado el boton para `Unirse a mesa`, tanto desde index como dentro del lobby.
8. Probar visualmente al menos en anchos 360px, 390px y 600px.
9. Ejecutar `npm run build`.

## Acceptance Criteria

- [x] En mobile, `pages/index.vue` permite seleccionar multijugador sin mostrar formularios redundantes de jugadores/opciones.
- [x] En mobile, `pages/index.vue` muestra acciones claras para ir a crear o unirse a mesa.
- [x] En `pages/multiplayer/lobby.vue`, el formulario de crear mesa se puede leer y completar en pantallas pequenas.
- [x] En `pages/multiplayer/lobby.vue`, el formulario de unirse a mesa se puede leer y completar en pantallas pequenas.
- [x] El boton/opcion `Unirse a mesa` sigue visible y facil de encontrar en lobby.
- [x] No hay overflow horizontal en 360px de ancho.
- [x] Los botones principales no quedan fuera de la pantalla sin posibilidad clara de scroll.
- [x] Los inputs y selects tienen tamanos tactiles adecuados.
- [x] La informacion duplicada entre el tab multijugador del index y el lobby queda reducida.
- [x] `npm run build` pasa sin errores.

## Notes

Conviene que `index.vue` siga siendo el lugar rico para configurar partida local o con bots, pero multiplayer debe tratarse como una entrada al lobby. El lobby es el lugar correcto para nombre, codigo de mesa, slots y opciones de mesa. Si se agrega `?mode=join`, se debe mantener compatibilidad con abrir `/multiplayer/lobby` sin query usando `create` como default.
