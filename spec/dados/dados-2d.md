# Dados 2D con CSS — Gameplay

## Objetivo

Reemplazar el dado 3D (TresJS `diceScene`) por un dado 2D animado que
aparece como overlay al hacer click en "🎲 Tirar Dados".

## Comportamiento

1. Usuario hace click en **"🎲 Tirar Dados"**
2. Aparece un overlay con el dado 2D centrado
3. El dado "gira" con animación CSS durante ~1.5 segundos
4. Se detiene mostrando un número aleatorio del 1 al 6
5. Desaparece el overlay y el jugador se mueve esa cantidad de casillas

## Diseño del Dado 2D (CSS)

### Estructura HTML
```vue
<div class="dado-overlay" v-if="visible">
  <div class="dado-3d">
    <div class="face face-1" :class="{ active: result === 1 }">...</div>
    <div class="face face-2" :class="{ active: result === 2 }">...</div>
    <div class="face face-3" :class="{ active: result === 3 }">...</div>
    <div class="face face-4" :class="{ active: result === 4 }">...</div>
    <div class="face face-5" :class="{ active: result === 5 }">...</div>
    <div class="face face-6" :class="{ active: result === 6 }">...</div>
  </div>
</div>
```

### Caras del dado
Cada cara tiene el patrón de puntos:

| Número | Posición de puntos |
|--------|-------------------|
| 1 | Centro |
| 2 | Esquina sup-izq + inf-der |
| 3 | Esquina sup-izq + centro + inf-der |
| 4 | Las 4 esquinas |
| 5 | Las 4 esquinas + centro |
| 6 | 3 puntos en columna izquierda + 3 en derecha |

### Estilos CSS
```css
.dado-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dado-3d {
  width: 100px;
  height: 100px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s;
}

.dado-3d.rolling {
  animation: roll 0.1s linear infinite;
}

@keyframes roll {
  0%   { transform: rotateX(0deg) rotateY(0deg); }
  25%  { transform: rotateX(90deg) rotateY(180deg); }
  50%  { transform: rotateX(180deg) rotateY(360deg); }
  75%  { transform: rotateX(270deg) rotateY(540deg); }
  100% { transform: rotateX(360deg) rotateY(720deg); }
}

.face {
  position: absolute;
  width: 100px;
  height: 100px;
  background: white;
  border: 2px solid #333;
  border-radius: 10px;
  display: none; /* ocultas por defecto */
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 10px;
}

.face.active { display: grid; }

/* Posicionamiento 3D de cada cara */
.face-1 { transform: translateZ(50px); }
.face-2 { transform: rotateY(90deg) translateZ(50px); }
.face-3 { transform: rotateY(180deg) translateZ(50px); }
.face-4 { transform: rotateY(-90deg) translateZ(50px); }
.face-5 { transform: rotateX(90deg) translateZ(50px); }
.face-6 { transform: rotateX(-90deg) translateZ(50px); }

/* Puntos */
.dot {
  width: 16px;
  height: 16px;
  background: #333;
  border-radius: 50%;
  justify-self: center;
  align-self: center;
}
```

## Implementación

### Nuevo componente: `components/Dado2D.vue`

```vue
<template>
  <div class="dado-overlay" v-if="visible">
    <div class="dado-3d" :class="{ rolling: isRolling }">
      <div class="face face-1" :class="{ active: displayValue === 1 }">
        <span class="dot" style="grid-area: 2/2"></span>
      </div>
      <div class="face face-2" :class="{ active: displayValue === 2 }">
        <span class="dot" style="grid-area: 1/1"></span>
        <span class="dot" style="grid-area: 3/3"></span>
      </div>
      <div class="face face-3" :class="{ active: displayValue === 3 }">
        <span class="dot" style="grid-area: 1/1"></span>
        <span class="dot" style="grid-area: 2/2"></span>
        <span class="dot" style="grid-area: 3/3"></span>
      </div>
      <div class="face face-4" :class="{ active: displayValue === 4 }">
        <span class="dot" style="grid-area: 1/1"></span>
        <span class="dot" style="grid-area: 1/3"></span>
        <span class="dot" style="grid-area: 3/1"></span>
        <span class="dot" style="grid-area: 3/3"></span>
      </div>
      <div class="face face-5" :class="{ active: displayValue === 5 }">
        <span class="dot" style="grid-area: 1/1"></span>
        <span class="dot" style="grid-area: 1/3"></span>
        <span class="dot" style="grid-area: 2/2"></span>
        <span class="dot" style="grid-area: 3/1"></span>
        <span class="dot" style="grid-area: 3/3"></span>
      </div>
      <div class="face face-6" :class="{ active: displayValue === 6 }">
        <span class="dot" style="grid-area: 1/1"></span>
        <span class="dot" style="grid-area: 1/3"></span>
        <span class="dot" style="grid-area: 2/1"></span>
        <span class="dot" style="grid-area: 2/3"></span>
        <span class="dot" style="grid-area: 3/1"></span>
        <span class="dot" style="grid-area: 3/3"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const visible = ref(false);
const isRolling = ref(false);
const displayValue = ref(1);
let resolvePromise = null;

function roll() {
  visible.value = true;
  isRolling.value = true;
  displayValue.value = Math.floor(Math.random() * 6) + 1;

  return new Promise((resolve) => {
    resolvePromise = resolve;
    setTimeout(() => {
      isRolling.value = false;
      setTimeout(() => {
        const result = displayValue.value;
        visible.value = false;
        resolve(result);
      }, 500); // tiempo para ver el resultado
    }, 1500); // tiempo de animación
  });
}

defineExpose({ roll });
</script>
```

### Integración en `pages/index.vue`

Reemplazar la lógica de `throwDice` o `handleRoll`:

```typescript
// Importar componente
import Dado2D from '~/components/Dado2D.vue';

// Referencia al componente
const dado2DRef = ref(null);

// Modificar throwDice o handleRoll
async function throwDice() {
  if (!store.isMyTurn || store.diceResult) return;

  const result = await dado2DRef.value.roll();
  store.rollDice(result);
  // ... resto de la lógica original
}
```

### Template de `pages/index.vue`

Agregar el componente en el template:
```vue
<Dado2D ref="dado2DRef" />
```

## Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `components/Dado2D.vue` | **Crear** — componente del dado 2D |
| `pages/index.vue` | **Modificar** — integrar Dado2D, quitar/reemplazar diceScene |

## Notas

- El dado 3D (`diceScene`, `TresCanvas` en `pages/index.vue`) puede mantenerse
  como respaldo o eliminarse si el dado 2D funciona bien
- La animación `rolling` usa `animation: roll 0.1s linear infinite` para simular
  el giro rápido, luego se detiene mostrando la cara final
- El valor se genera con `Math.random()` antes de la animación para que sea
  determinista visualmente
