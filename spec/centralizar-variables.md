# Centralizar Variables de GameOverlay.vue en Pinia

## Objetivo
Mover el estado reactivo del dado 2D y controles UI desde `GameOverlay.vue`
a un store de Pinia para que sea consumible por otros componentes.

## Variables a Centralizar

### Estado local actual en GameOverlay.vue
| Variable | Tipo | Descripción |
|----------|------|-------------|
| `isDiceVisible` | `ref<boolean>` | Muestra/oculta overlay del dado |
| `diceValue` | `ref<number>` | Valor del dado (1-6) |
| `isDiceRolling` | `ref<boolean>` | ¿Está rodando? |

### Estado en pages/index.vue (local)
| Variable | Tipo | Descripción |
|----------|------|-------------|
| `statusMessage` | `ref<string>` | Mensaje de estado |
| `isCamFollowActive` | `ref<boolean>` | ¿Cámara siguiendo? |

## Propuesta: Extender `stores/gameStore.ts`

### Nuevo State
```typescript
state: () => ({
  // ... estado existente
  currentPosition: 0,
  isMoving: false,
  isRolling: false,
  lastDiceRoll: null,
  
  // NUEVO: Estado UI
  isDiceVisible: false,
  diceValue: 1,
  isDiceRolling: false,
  statusMessage: "Cargando entorno...",
  isCamFollowActive: false,
}),
```

### Nuevas Actions
```typescript
actions: {
  // ... actions existentes (movePlayer)
  
  showDice() {
    this.isDiceVisible = true;
    this.isDiceRolling = true;
    this.diceValue = Math.floor(Math.random() * 6) + 1;
  },
  
  hideDice() {
    this.isDiceVisible = false;
  },
  
  finishDiceRoll() {
    this.isDiceRolling = false;
  },
  
  toggleCameraFollow() {
    this.isCamFollowActive = !this.isCamFollowActive;
  },
  
  setStatusMessage(msg: string) {
    this.statusMessage = msg;
  },
}
```

## Cambios en GameOverlay.vue

### Antes (props + estado local)
```typescript
const props = defineProps<{
  currentPosition: number;
  statusMessage: string;
  isMoving: boolean;
  isCamFollowActive: boolean;
}>();

const isDiceVisible = ref(false);
const diceValue = ref(1);
const isDiceRolling = ref(false);
```

### Después (usa store)
```vue
<script setup lang="ts">
import { useGameStore } from '~/stores/gameStore';
const store = useGameStore();

const props = defineProps<{
  currentPosition: number;
  isMoving: boolean;
}>();

const emit = defineEmits<{
  (e: 'roll', value: number): void;
  (e: 'toggle-camera'): void;
}>();

async function onRollClick() {
  store.showDice();
  await new Promise(resolve => {
    setTimeout(() => {
      store.finishDiceRoll();
      setTimeout(() => {
        const result = store.diceValue;
        store.hideDice();
        emit('roll', result);
      }, 600);
    }, 1500);
  });
}
</script>
```

### Template
```vue
<template>
  <div class="overlay-container">
    <div class="status-badge">
      Casilla Actual: {{ currentPosition }} | Estado: {{ store.statusMessage }}
    </div>

    <div class="action-buttons">
      <button
        @click="onRollClick"
        :disabled="isMoving || store.isDiceRolling"
        class="action-btn roll-btn"
        :class="{ 'disabled-btn': isMoving || store.isDiceRolling }"
      >
        {{ store.isDiceRolling ? "Rodando..." : isMoving ? "Moviendo..." : "🎲 Tirar Dados" }}
      </button>

      <button
        @click="emit('toggle-camera')"
        class="action-btn cam-btn"
        :class="{ 'cam-active': store.isCamFollowActive }"
      >
        {{ store.isCamFollowActive ? "🎥 Cámara: Fija" : "🎥 Cámara: Libre" }}
      </button>
    </div>
  </div>

  <!-- Dado 2D Overlay -->
  <div class="dado-overlay" v-if="store.isDiceVisible">
    <div class="dado-3d" :class="{ rolling: store.isDiceRolling }">
      <div class="face face-1" :class="{ active: store.diceValue === 1 }">
        <span class="dot" style="grid-area: 2 / 2"></span>
      </div>
      <!-- ... resto de caras igual -->
    </div>
  </div>
</template>
```

## Cambios en pages/index.vue

### Eliminar estado local
```typescript
// ELIMINAR:
const statusMessage = ref("Cargando entorno...");
const isCamFollowActive = ref(false);
```

### Usar store
```typescript
const store = useGameStore();

// En onRenderTick:
// controls.target.x = playerPosition.x; ... (igual)

// En onDiceRoll:
function onDiceRoll(value: number) {
  store.lastDiceRoll = value;
  store.movePlayer(value);
}

// En template GameOverlay:
<GameOverlay 
  :current-position="store.currentPosition"
  :is-moving="store.isMoving"
  @roll="onDiceRoll"
  @toggle-camera="store.toggleCameraFollow()"
/>
```

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `stores/gameStore.ts` | Agregar estado UI y actions |
| `components/GameOverlay.vue` | Usar store, eliminar `isDiceVisible/Value/Rolling` locales |
| `pages/index.vue` | Usar store, eliminar `statusMessage`/`isCamFollowActive` locales |

## Notas

- `currentPosition` y `isMoving` siguen como props (vienen de `pages/index.vue`)
- El store centraliza TODO el estado compartido
- Cualquier componente puede acceder: `const store = useGameStore();`
