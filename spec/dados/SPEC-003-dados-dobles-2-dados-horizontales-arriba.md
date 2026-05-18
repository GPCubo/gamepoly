---
id: SPEC-003
title: Dados Dobles — 2 Dados Horizontales Arriba con Suma
created_at: 2026-05-18T00:15:00
status: done
---

# SPEC-003: Dados Dobles — 2 Dados Horizontales Arriba con Suma

## Descripción

Cambiar el dado único actual por **2 dados** alineados horizontalmente en el centro de la **parte superior** de la pantalla. Ambos dados aparecen al tirar con animación de caída (slideDown), y el resultado del movimiento es la **suma de ambos** (rango 2-12). Después de la animación, los dados desaparecen.

## Contexto y Motivación

Actualmente (SPEC-001, SPEC-002) el juego usa un solo dado (`store.diceValue`, rango 1-6) posicionado abajo (`bottom: 80px`). Se necesita:

1. **2 dados** para más dinamismo tipo monopolio
2. **Posición arriba** — cambiar de `bottom: 80px` a `top`
3. **Suma de ambos** — el jugador avanza `dado1 + dado2` casillas (2-12)
4. **Animación aparición/desaparición** — slideDown adaptado a posición superior

## Análisis Técnico

### Estado actual

- **Store** (`gameStore.ts`): `diceValue: number` (1 solo valor 1-6), `showDice()` genera 1 número
- **Template** (`GameOverlay.vue`): 1 solo `.dado-pequeño` con `facePositions[store.diceValue]`
- **Emisión**: `emit('roll', store.diceValue)` → `onDiceRoll(value)` → `store.movePlayer(value)`
- **CSS**: `.dado-wrapper` con `position: absolute; bottom: 80px; flex-direction: column`

### Cambios necesarios

**Store (`gameStore.ts`)**:
- `diceValue: number` → `diceValues: [number, number]` con inicial `[1, 1]`
- Getter `diceTotal` → `diceValues[0] + diceValues[1]`
- `showDice()` → generar `[random1, random2]`

**Template (`GameOverlay.vue`)**:
- Renderizar 2 dados con `v-for="(value, idx) in store.diceValues"`
- Cada dado usa `facePositions[value]` para sus círculos
- Texto: "Total: X · Casilla: Y"

**CSS (`GameOverlay.vue`)**:
- `.dado-wrapper`: `bottom: 80px` → `top: 20px`
- Alinear dados horizontalmente con `flex-direction: row` y `gap`
- Animación slideDown ya funciona (caída translate + opacity)

**Emisión**:
- `emit('roll', store.diceTotal)`

### Diseño visual

```
┌──────────────────────────────────┐
│      Total: 8  ·  Casilla: 14   │
│        ┌────┐    ┌────┐        │
│        │ ●● │    │ ●● │        │
│        │ ●● │    │ ●  │        │
│        │ ●● │    │ ●● │        │
│        └────┘    └────┘        │
└──────────────────────────────────┘
   (arriba, centrado horizontalmente)
```

## Plan de Implementación

### Archivos a modificar

- `stores/gameStore.ts` — `diceValue` → `diceValues`, agregar `diceTotal`, modificar `showDice()`
- `components/GameOverlay.vue` — template 2 dados, CSS arriba horizontal, emisión suma

### Pasos ordenados

1. **Modificar `gameStore.ts`**: cambiar `diceValue: number` por `diceValues: [number, number]`, agregar getter `diceTotal`, modificar `showDice()` para generar 2 valores
2. **Modificar template de `GameOverlay.vue`**: renderizar 2 dados con `v-for`, actualizar texto a "Total: X · Casilla: Y"
3. **Modificar CSS de `.dado-wrapper`**: mover a `top: 20px`, alinear dados horizontalmente (`flex-direction: row` + contenedor para dados)
4. **Modificar emisión**: `emit('roll', store.diceTotal)`
5. **Verificar compatibilidad**: confirmar que `pages/index.vue` recibe un `number` y `movePlayer()` funciona sin cambios

## Criterios de Aceptación

- [x] Se muestran 2 dados alineados horizontalmente en la parte superior central
- [x] Cada dado muestra correctamente los puntos (1-6) usando facePositions
- [x] El resultado del movimiento es la suma de ambos dados (2-12)
- [x] El contenedor muestra "Total: X · Casilla: Y"
- [x] La animación slideUp funciona desde la posición superior (desaparece hacia arriba)
- [x] El botón "Tirar Dados" se deshabilita correctamente durante la animación
- [x] `gameStore.ts` usa `diceValues` array de 2 elementos (no `diceValue` único)
- [x] La integración con `movePlayer()` funciona sin cambios adicionales

## Notas

- El rango de movimiento cambia de 1-6 a 2-12, lo que afecta la velocidad del juego significativamente
- Los 2 dados generan valores independientes en `showDice()`
- Gap visual entre dados: 8-12px