---
id: SPEC-001
title: Rediseño Dado 2D con Animación
created_at: 2026-05-17T23:37:36
status: draft
---

# SPEC-001: Rediseño Dado 2D con Animación

## Descripción

Rediseñar el dado 2D actual para que sea más pequeño (diminuto), se muestre dentro de un contenedor padre que imitate el estilo del status badge ("Casilla Actual: X | Estado: ..."), y tenga una animación de caída hacia abajo hasta desaparecer.

En lugar de mostrar caras complejas de dado (patrones de puntos), simplemente se cambia la **cantidad de círculos** (1-6) para simular la aleatoriedad.

## Contexto y Motivación

El dado 2D actual (`components/GameOverlay.vue`) es demasiado grande y no tiene una estética coherente con el resto de la UI. Se busca:

1. Un **contenedor padre** similar al `status-badge` (mismo `width`, `height` 2-3x mayor)
2. El dado sea **más pequeño** (diminuto) dentro del contenedor
3. El dado **no parezca un dado tradicional** → solo círculos blancos sobre fondo blanco
4. Animación de **caída hacia abajo** con desaparición
5. Mostrar la **casilla actual** dentro del contenedor padre

## Análisis Técnico

### Diseño Visual

#### Contenedor Padre (`.dado-wrapper`)
- **Estilo:** Similar al `.status-badge` actual
  - `background: rgba(0, 0, 0, 0.8)`
  - `border-radius: 20px`
  - `color: #4ade80`
  - `font-family: monospace`
  - `font-size: 12px`
  - `border: 1px solid rgba(74, 222, 128, 0.2)`
- **Dimensiones:**
  - `width`: mismo ancho que `.status-badge` (aprox. auto-ajustable según contenido)
  - `height`: 2x o 3x mayor que `.status-badge` (unos 40-60px)
- **Contenido:**
  - Texto: `"Casilla: X"` (arriba, pequeño)
  - Dado (centrado abajo)

#### Dado 2D (`.dado-pequeño`)
- **Tamaño:** mucho más pequeño que el actual (ej. `40px x 40px`)
- **Fondo:** blanco sólido (`background: white`)
- **Borde:** `1px solid #333`
- **Círculos:** blancos... NO, los círculos deben ser **negros** sobre fondo blanco
  - Solo se cambia la **cantidad** de círculos (1 al 6)
  - No hay patrón de dados real, solo círculos aleatorios en posición fija

### Animación

1. Al hacer click en "🎲 Tirar Dados":
   - Aparece el contenedor con el dado
   - El dado muestra `N` círculos (N = valor aleatorio 1-6)
2. Transcurridos ~1.5 segundos:
   - Animación: `translateY(100px)` + `opacity: 0`
   - Duración: `0.5s ease-in`
3. Al terminar:
   - `display: none`
   - Se emite el valor al `pages/index.vue`

### Comparación con Estado Actual

| Elemento | Actual | Propuesto |
|----------|--------|-----------|
| Contenedor | `.dado-overlay` (fixed, fullscreen) | `.dado-wrapper` (inline, estilo status-badge) |
| Dado | `100px x 100px` | `40px x 40px` (diminuto) |
| Visual | Caras CSS 3D | Solo círculos (1-6) sobre blanco |
| Animación | Rotación 3D infinita | Caída hacia abajo + desaparición |
| Posición | Centrado pantalla | Junto al status badge (abajo-centro) |

## Plan de Implementación

### Archivos a modificar

- `components/GameOverlay.vue` — rediseño completo del template y estilos

### Pasos ordenados

1. **Cambiar estructura del template:**
   - Agregar contenedor `.dado-wrapper` con texto "Casilla: X"
   - Dado `.dado-pequeño` dentro con círculos dinámicos
   - Quitar el overlay fullscreen (`.dado-overlay`)

2. **Actualizar estilos CSS:**
   - Copiar estilos de `.status-badge` para `.dado-wrapper`
   - Ajustar `height` a 2-3x (unos 50-60px)
   - Dado: `40px x 40px`, fondo blanco, círculos negros
   - Animación: `@keyframes slideDown { from { opacity:1; transform: translateY(0); } to { opacity:0; transform: translateY(100px); } }`

3. **Lógica de círculos:**
   - En lugar de 6 caras con patrones, tener un solo div `.dado-pequeño`
   - Usar `v-for` para renderizar N círculos (1-6)
   - Posiciones fijas (centro, esquinas, etc. según N)

4. **Animación de salida:**
   - Al terminar el "rodar" (1.5s), agregar clase `.sliding`
   - `.sliding { animation: slideDown 0.5s ease-in forwards; }`
   - Al terminar animación: `emit('roll', valor)`

### Ejemplo de Template

```vue
<!-- Contenedor tipo status-badge -->
<div class="dado-wrapper" v-if="store.isDiceVisible">
  <div class="dado-titulo">Casilla: {{ currentPosition }}</div>
  <div class="dado-pequeño">
    <span 
      v-for="n in store.diceValue" 
      :key="n" 
      class="circulo"
      :style="getCircleStyle(n)"
    ></span>
  </div>
</div>
```

### Ejemplo de Estilos

```css
.dado-wrapper {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  color: #4ade80;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 150;
  position: absolute;
  bottom: 80px; /* arriba del status-badge */
  left: 50%;
  transform: translateX(-50%);
}

.dado-pequeño {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #333;
  border-radius: 6px;
  position: relative;
}

.circulo {
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 50%;
  position: absolute;
}

/* Posiciones fijas según cantidad */
.circulo:nth-child(1) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
.circulo:nth-child(2) { top: 25%; left: 25%; }
/* ... etc. */
```

## Criterios de Aceptación

- [ ] El dado es notablemente más pequeño (40px vs 100px actual)
- [ ] El contenedor imitate al `.status-badge` en estilo
- [ ] Muestra "Casilla: X" dentro del contenedor
- [ ] Solo cambia la cantidad de círculos (1-6), no hay caras reales
- [ ] Animación de caída hacia abajo con desaparición
- [ ] El juego funciona igual (se mueve el jugador)

## Notas

- **No es un dado real:** solo círculos negros sobre fondo blanco
- **Aleatoriedad:** se genera `N = 1-6` y se muestran `N` círculos
- El contenedor debe estar **debajo del status badge** (stacking) o integrado en el flujo del `overlay-container`
