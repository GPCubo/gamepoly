---
id: SPEC-001
title: Botón "Ver Histórico" fuera del mapa con dialog de historial completo
created_at: 2026-06-10T00:00:00
status: done
---

# SPEC-001: Botón "Ver Histórico" fuera del mapa con dialog de historial completo

## Descripción

Mover el acceso al histórico económico fuera del sidebar y colocarlo visualmente debajo del mapa/croquis (`.board-minimap`) en `GameOverlay.vue`. El botón "Ver Histórico" abrirá un dialog modal que muestra el historial económico completo (hasta 100 entradas almacenadas en `gameStore.economicHistory`), en lugar del panel lateral actual que solo muestra 20 ítems.

## Contexto y Motivación

Actualmente el botón de histórico vive dentro de `SidebarConfig.vue` como parte de las "quick-actions" del sidebar, lo que lo hace poco visible y contextualmente alejado del mapa. El mapa es el punto de referencia visual principal del juego, por lo que agrupar el acceso al historial justo debajo de él mejora la ergonomía. Además, el panel actual está limitado a 20 transacciones; un dialog modal permite mostrar el historial completo con scroll cómodo.

## Análisis Técnico

### Componentes afectados

- **`components/GameOverlay.vue`** — contiene el minimap (`.board-minimap`, líneas 57-113). Se añade el botón debajo de ese bloque y se implementa el dialog modal dentro del mismo componente. Accede a `gameStore` ya importado.
- **`components/SidebarConfig.vue`** — actualmente tiene el botón "Historico" (líneas 58-66) y el panel `.history-panel` (líneas 69-98). Se eliminan o desactivan para evitar duplicidad.

### Store

- **`stores/gameStore.ts`** — `economicHistory: EconomicHistoryItem[]` (línea 116), máx. 100 ítems. `EconomicHistoryType` enum (líneas 66-74), `EconomicHistoryItem` interface (líneas 76-84).
- La función `historyIcon()` (líneas 575-587 de `SidebarConfig.vue`) debe copiarse/moverse a `GameOverlay.vue` o extraerse a un composable/util compartido.

### Riesgos

- El dialog debe bloquearse correctamente sobre el overlay del juego sin interferir con otros modales existentes (gestión de z-index).
- Eliminar el botón del sidebar no debe romper otras referencias a `showHistory` en `SidebarConfig.vue`.

## Plan de Implementación

### Archivos a crear

- _(ninguno — todo se resuelve modificando archivos existentes)_

### Archivos a modificar

- `components/GameOverlay.vue` — añadir botón debajo del minimap y dialog modal de histórico completo.
- `components/SidebarConfig.vue` — eliminar botón "Historico" y panel `.history-panel` del sidebar.

### Pasos ordenados

1. En `GameOverlay.vue`, tras el cierre del bloque `.board-minimap` (línea ~113), añadir un botón `<button class="history-trigger-btn">Ver Histórico</button>`.
2. Añadir en `GameOverlay.vue` el estado reactivo `showHistoryDialog = ref(false)` y vincularlo al botón (`@click="showHistoryDialog = true"`).
3. Implementar el dialog modal en `GameOverlay.vue`: overlay semitransparente, contenedor con scroll, lista completa de `gameStore.economicHistory` (sin límite de 20), y botón de cierre.
4. Copiar la función `historyIcon()` de `SidebarConfig.vue` a `GameOverlay.vue` (o extraerla a `utils/historyIcon.ts` para reutilización).
5. Importar y usar `useGameStore` en `GameOverlay.vue` si no está ya disponible para acceder a `economicHistory`.
6. En `SidebarConfig.vue`, eliminar el botón "Historico" (líneas 58-66), el bloque `.history-panel` (líneas 69-98), la variable `showHistory`, y la función `historyIcon()` si ya fue movida.
7. Limpiar los estilos CSS huérfanos de `.history-btn`, `.history-panel`, `.history-list`, `.history-item` en `SidebarConfig.vue`.
8. Añadir estilos en `GameOverlay.vue` para `.history-trigger-btn` y el dialog modal.

## Criterios de Aceptación

- [x] El botón "Ver Histórico" es visible debajo del mapa/croquis en el overlay del juego.
- [x] Al hacer clic en "Ver Histórico" se abre un dialog modal con el histórico completo (hasta 100 entradas).
- [x] El dialog tiene un botón o mecanismo para cerrarse (X o clic fuera).
- [x] Cada entrada del histórico muestra icono, título, detalle y monto tal como en el panel anterior.
- [x] El sidebar ya no muestra el botón "Historico" ni el panel de histórico.
- [x] No hay errores de consola ni referencias rotas al eliminar el código del sidebar.
- [x] El dialog no interfiere visualmente con otros modales del juego (z-index correcto).

## Notas

- Considerar extraer `historyIcon()` a `utils/historyIcon.ts` si otros componentes pudieran necesitarla en el futuro; de lo contrario, copiarla inline en `GameOverlay.vue` es suficiente.
- El dialog puede reutilizar los estilos de otros dialogs existentes en el proyecto para mantener consistencia visual.
- Si el histórico está vacío, mostrar un mensaje "Sin transacciones registradas" dentro del dialog.
