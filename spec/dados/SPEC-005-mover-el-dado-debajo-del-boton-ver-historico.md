---
id: SPEC-002
title: Mover el dado debajo del botón "Ver Histórico"
created_at: 2026-06-10T00:00:00
status: done
---

# SPEC-002: Mover el dado debajo del botón "Ver Histórico"

## Descripción

El `.dado-wrapper` actualmente aparece flotando centrado en la parte superior de la pantalla (`position: absolute; top: 18px; left: 50%; transform: translateX(-50%)`). Debe moverse para quedar debajo del botón "Ver Histórico" dentro del `.minimap-wrapper` (columna izquierda del overlay), como tercer hijo en flujo normal de ese contenedor flex-column.

## Contexto y Motivación

Tras la implementación de SPEC-001, el área izquierda superior del overlay agrupa el mapa y el botón de histórico en una columna vertical (`.minimap-wrapper`). Colocar el dado en esa misma columna mantiene todos los elementos informativos del lado izquierdo, libera el espacio central superior de la pantalla y da más protagonismo al tablero 3D durante el lanzamiento.

## Análisis Técnico

### Componente afectado

- **`components/GameOverlay.vue`** — único archivo a modificar.

### Estado actual

- El `.dado-wrapper` es un elemento hermano de `.minimap-wrapper` en el template (línea ~211), renderizado a nivel raíz del componente.
- Su CSS lo posiciona absolutamente centrado en la parte superior:
  ```css
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 150;
  transform: translateX(-50%);
  ```
- La animación de salida `.sliding` usa `@keyframes slideUp` que incluye `translateX(-50%)` en ambos fotogramas para compensar el centrado. Al salir del flujo posicionado, esa compensación ya no es necesaria.

### Cambios necesarios

1. **Template**: mover el bloque `.dado-wrapper` para que sea el tercer hijo de `.minimap-wrapper`, justo después de `.history-trigger-btn`.
2. **CSS `.dado-wrapper`**: eliminar `position`, `top`, `left`, `z-index` y `transform: translateX(-50%)`. Añadir `width: 100%` para que ocupe el ancho del wrapper (226 px). Mantener `pointer-events: auto` (el wrapper padre no interfiere).
3. **CSS `@keyframes slideUp`**: reemplazar `translateX(-50%) translateY(0/–100px)` por solo `translateY(0)` y `translateY(-100px)`.

### Riesgos

- La animación de desaparición sube el dado fuera del viewport hacia arriba; al estar dentro de `.minimap-wrapper` en flujo normal, el overflow podría cortar la animación. Verificar que `.minimap-wrapper` no tenga `overflow: hidden` (actualmente no lo tiene).
- El dado puede empujar el `.minimap-wrapper` hacia abajo visualmente mientras es visible; el comportamiento es intencional y correcto.

## Plan de Implementación

### Archivos a crear

- _(ninguno)_

### Archivos a modificar

- `components/GameOverlay.vue` — mover el bloque `.dado-wrapper` en el template y ajustar su CSS.

### Pasos ordenados

1. En el template, cortar el bloque `<div v-if="store.isDiceVisible" class="dado-wrapper" ...>...</div>` de su posición actual (hermano raíz) y pegarlo como tercer hijo de `.minimap-wrapper`, después del `<button class="history-trigger-btn">`.
2. En el CSS, reemplazar los estilos posicionados de `.dado-wrapper` (eliminar `position`, `top`, `left`, `z-index`, `transform`) y añadir `width: 100%`.
3. En `@keyframes slideUp`, quitar `translateX(-50%)` de los fotogramas `from` y `to`.

## Criterios de Aceptación

- [x] El dado aparece debajo del botón "Ver Histórico" en la columna izquierda, no centrado en la parte superior.
- [x] El dado ocupa el ancho completo del `.minimap-wrapper` (226 px en desktop, 190 px en mobile).
- [x] La animación de salida (slide up) funciona correctamente sin saltos ni desplazamientos horizontales inesperados.
- [x] El dado no aparece cortado por overflow en ningún momento de la animación.
- [x] En mobile (≤720 px) el dado también aparece bajo el botón de histórico y no queda fuera del viewport.

## Notas

- No se requiere ningún cambio en la lógica JS/TS; solo es un reposicionamiento visual en template y CSS.
- Si en el futuro se desea animar la entrada del dado (slide-down), se puede añadir una transición `v-show` o `<Transition>` al `.dado-wrapper` dentro del wrapper.
