# Instalación de GameOverlay.vue en pages/index.vue

## Objetivo

Centralizar los controles del juego (estado, botón de dado, botón de cámara)
en el componente `components/GameOverlay.vue` y usarlo en `pages/index.vue`.

## Paso 1: Limpiar `pages/index.vue`

### Eliminar del template (líneas 67-143)

```vue
<!-- ELIMINAR -->
<div
  style="
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    ...
  "
>
  <div>Estado: {{ store.currentPosition }} | {{ statusMessage }}</div>
  <div style="display: flex; gap: 10px">
    <button @click="handleRoll">🎲 Tirar Dados</button>
    <button @click="isCamFollowActive = !isCamFollowActive">
      {{ isCamFollowActive ? "🎥 Cámara: Fija" : "🎥 Cámara: Libre" }}
    </button>
  </div>
</div>
```

### Agregar en el template (antes del `</div>` final)

```vue
<GameOverlay 
  :current-position="store.currentPosition"
  :status-message="statusMessage"
  :is-moving="store.isMoving"
  :is-rolling="store.isRolling"
  :is-cam-follow-active="isCamFollowActive"
  @roll="onDiceRoll"
  @toggle-camera="isCamFollowActive = !isCamFollowActive"
/>
```

### Agregar import en `<script setup>`

```typescript
import GameOverlay from '~/components/GameOverlay.vue';
```

### Modificar `handleRoll` / crear `onDiceRoll`

```typescript
function onDiceRoll() {
  throwDice();
}
```

---

## Paso 2: Actualizar `components/GameOverlay.vue`

### Props adicionales

```typescript
defineProps<{
  currentPosition: number;
  statusMessage: string;
  isMoving: boolean;
  isRolling: boolean;
  isCamFollowActive: boolean;
}>();
```

### Emits

```typescript
defineEmits<{
  (e: 'roll'): void;
  (e: 'toggle-camera'): void;
}>();
```

### Template básico (actual)

```vue
<template>
  <div class="overlay-container">
    <div class="status-badge">
      Casilla Actual: {{ currentPosition }} | Estado: {{ statusMessage }}
    </div>

    <div class="action-buttons">
      <button
        @click="$emit('roll')"
        :disabled="isMoving || isRolling"
        class="action-btn roll-btn"
        :class="{ 'disabled-btn': isMoving || isRolling }"
      >
        {{ isRolling ? "Rodando..." : isMoving ? "Moviendo..." : "🎲 Tirar Dados" }}
      </button>

      <button
        @click="$emit('toggle-camera')"
        class="action-btn cam-btn"
        :class="{ 'cam-active': isCamFollowActive }"
      >
        {{ isCamFollowActive ? "🎥 Cámara: Fija" : "🎥 Cámara: Libre" }}
      </button>
    </div>
  </div>
</template>
```

---

## Paso 3: Integrar Dado 2D en `GameOverlay.vue`

### Estados nuevos en script

```typescript
import { ref } from 'vue';

const isDiceVisible = ref(false);
const diceValue = ref(1);
const isDiceRolling = ref(false);

let resolveDice = null;

function rollDice() {
  isDiceVisible.value = true;
  isDiceRolling.value = true;
  diceValue.value = Math.floor(Math.random() * 6) + 1;

  return new Promise<number>((resolve) => {
    resolveDice = resolve;
    setTimeout(() => {
      isDiceRolling.value = false;
      setTimeout(() => {
        const result = diceValue.value;
        isDiceVisible.value = false;
        resolve(result);
      }, 600);
    }, 1500);
  });
}
```

### Modificar el emit `roll`

```vue
<button @click="onRollClick" ...>
```

```typescript
async function onRollClick() {
  const value = await rollDice();
  emit('roll', value);
}
```

### Agregar dado 2D en template

```vue
<div class="dado-overlay" v-if="isDiceVisible">
  <div class="dado-3d" :class="{ rolling: isDiceRolling }">
    <!-- 6 caras con puntos -->
    <div class="face face-1" :class="{ active: diceValue === 1 }">
      <span class="dot" style="grid-area: 2 / 2"></span>
    </div>
    <div class="face face-2" :class="{ active: diceValue === 2 }">
      <span class="dot" style="grid-area: 1 / 1"></span>
      <span class="dot" style="grid-area: 3 / 3"></span>
    </div>
    <div class="face face-3" :class="{ active: diceValue === 3 }">
      <span class="dot" style="grid-area: 1 / 1"></span>
      <span class="dot" style="grid-area: 2 / 2"></span>
      <span class="dot" style="grid-area: 3 / 3"></span>
    </div>
    <div class="face face-4" :class="{ active: diceValue === 4 }">
      <span class="dot" style="grid-area: 1 / 1"></span>
      <span class="dot" style="grid-area: 1 / 3"></span>
      <span class="dot" style="grid-area: 3 / 1"></span>
      <span class="dot" style="grid-area: 3 / 3"></span>
    </div>
    <div class="face face-5" :class="{ active: diceValue === 5 }">
      <span class="dot" style="grid-area: 1 / 1"></span>
      <span class="dot" style="grid-area: 1 / 3"></span>
      <span class="dot" style="grid-area: 2 / 2"></span>
      <span class="dot" style="grid-area: 3 / 1"></span>
      <span class="dot" style="grid-area: 3 / 3"></span>
    </div>
    <div class="face face-6" :class="{ active: diceValue === 6 }">
      <span class="dot" style="grid-area: 1 / 1"></span>
      <span class="dot" style="grid-area: 1 / 3"></span>
      <span class="dot" style="grid-area: 2 / 1"></span>
      <span class="dot" style="grid-area: 2 / 3"></span>
      <span class="dot" style="grid-area: 3 / 1"></span>
      <span class="dot" style="grid-area: 3 / 3"></span>
    </div>
  </div>
</div>
```

### Estilos CSS para el dado (agregar en `<style scoped>`)

```css
.dado-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}

.dado-3d {
  width: 100px;
  height: 100px;
  position: relative;
  transform-style: preserve-3d;
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
  display: none;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 10px;
}

.face.active {
  display: grid;
}

.face-1 { transform: translateZ(50px); }
.face-2 { transform: rotateY(90deg) translateZ(50px); }
.face-3 { transform: rotateY(180deg) translateZ(50px); }
.face-4 { transform: rotateY(-90deg) translateZ(50px); }
.face-5 { transform: rotateX(90deg) translateZ(50px); }
.face-6 { transform: rotateX(-90deg) translateZ(50px); }

.dot {
  width: 16px;
  height: 16px;
  background: #333;
  border-radius: 50%;
  justify-self: center;
  align-self: center;
}
```

---

## Paso 4: Ajustar `pages/index.vue` para recibir el valor

```typescript
async function onDiceRoll(value: number) {
  store.rollDice(value);
}
```

---

## Archivos modificados

| Archivo | Acción |
|---------|--------|
| `pages/index.vue` | Eliminar overlay hard-codeado, importar `GameOverlay`, crear `onDiceRoll(value)` |
| `components/GameOverlay.vue` | Agregar dado 2D, lógica de `rollDice()`, emit `roll(value)` |

## Notas

- El dado 3D (`diceScene` en TresCanvas) puede eliminarse o dejarse como respaldo
- `GameOverlay` ya existe, solo se le integra el dado 2D
- Los estilos del dado usan CSS puro (sin librerías extra)
