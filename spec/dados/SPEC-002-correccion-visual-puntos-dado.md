---
id: SPEC-002
title: Corrección Visual Puntos Dado 2D
created_at: 2026-05-17T23:50:00
status: done
---

# SPEC-002: Corrección Visual Puntos Dado 2D

## Descripción

El dado 2D actual muestra la cantidad correcta de puntos (1-6) pero la disposición visual es incorrecta: los puntos se renderizan como elementos flex que se acomodan en filas en lugar de seguir el patrón posicional de un dado real. Se necesita corregir la posición de cada punto según el valor de la cara para que el dado se vea como un dado auténtico.

## Contexto y Motivación

El componente `GameOverlay.vue` (SPEC-001) implementó un dado 2D diminuto con puntos negros sobre fondo blanco, pero la representación visual no coincide con un dado real:

- **Valor 2**: muestra dos puntos en fila horizontal → debería ser diagonal (arriba-derecha, abajo-izquierda)
- **Valor 3**: muestra tres puntos en fila → debería ser diagonal (arriba-derecha, centro, abajo-izquierda)
- **Valor 4**: muestra 2x2 grid → debería ser 4 esquinas
- **Valor 5**: muestra 2+3 wrap → debería ser quincunce (4 esquinas + centro)
- **Valor 6**: muestra 3+3 wrap → debería ser 2 columnas de 3

La causa raíz es triple:

1. El template usa `v-for="n in store.diceValue"` que genera N elementos idénticos sin posicionamiento
2. No se aplica `:style` a cada `<span>` (la función `getCircleStyle(n)` existe pero nunca se invoca)
3. La clase `.circulo` carece de `position: absolute`, y el contenedor usa `display: flex; flex-wrap: wrap` en lugar de `position: relative` como contexto de posicionamiento

## Análisis Técnico

### Problemas en `GameOverlay.vue`

#### Template (líneas 31-35)

```vue
<span v-for="n in store.diceValue" :key="n" class="circulo"></span>
```

- `v-for="n in store.diceValue"` itera 1..N, pero no usa `:style="getCircleStyle(n)"`
- Incluso si se usara, `getCircleStyle` indexa posiciones secuenciales (0..N-1) en vez de seleccionar las posiciones correctas para la cara N

#### JS — `getCircleStyle()` (líneas 60-72)

```js
const positions = [
  { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }, // [0] centro
  { top: "15%", left: "15%" }, // [1] sup-izq
  { top: "15%", right: "15%" }, // [2] sup-der
  { bottom: "15%", left: "15%" }, // [3] inf-izq
  { bottom: "15%", right: "15%" }, // [4] inf-der
  { top: "50%", left: "15%", transform: "translateY(-50%)" }, // [5] centro-izq
  { top: "50%", right: "15%", transform: "translateY(-50%)" }, // [6] centro-der
];
return positions[n - 1];
```

- Para cara 2 retorna [centro, sup-izq] en vez de [sup-der, inf-izq]
- Para cara 3 retorna [centro, sup-izq, sup-der] en vez de [sup-der, centro, inf-izq]
- Para cara 5 retorna [centro, sup-izq, sup-der, inf-izq, inf-der] en vez de [sup-izq, sup-der, centro, inf-izq, inf-der]
- Para cara 6 retorna [centro, sup-izq, sup-der, inf-izq, inf-der, centro-izq] en vez de 2 columnas de 3

#### CSS — `.dado-pequeño` (líneas 123-136)

```css
.dado-pequeño {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 4px;
}
```

- Flex-wrap causa que los puntos se acomoden en filas, no en posiciones absolutas
- Debe ser solo `position: relative` como contexto para hijos absolutos

#### CSS — `.circulo` (líneas 138-143)

```css
.circulo {
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 50%;
}
```

- Falta `position: absolute` → las propiedades `top`, `left`, `right`, `bottom` no tienen efecto

### Posiciones correctas por cara

```
Grilla de 9 posiciones (3x3):
  TL    TC    TR
  ML    CC    MR
  BL    BC    BR
```

| Cara | Posiciones de puntos   |
| ---- | ---------------------- |
| 1    | CC                     |
| 2    | TR, BL                 |
| 3    | TR, CC, BL             |
| 4    | TL, TR, BL, BR         |
| 5    | TL, TR, CC, BL, BR     |
| 6    | TL, ML, BL, TR, MR, BR |

### Mapeo a CSS (position: absolute, contenedor 40px, punto 8px)

| Pos | top | left/right | transform             |
| --- | --- | ---------- | --------------------- |
| TL  | 15% | left: 15%  | —                     |
| TC  | 15% | left: 50%  | translateX(-50%)      |
| TR  | 15% | right: 15% | —                     |
| ML  | 50% | left: 15%  | translateY(-50%)      |
| CC  | 50% | left: 50%  | translate(-50%, -50%) |
| MR  | 50% | right: 15% | translateY(-50%)      |
| BL  | 75% | left: 15%  | —                     |
| BC  | 75% | left: 50%  | translateX(-50%)      |
| BR  | 75% | right: 15% | —                     |

## Plan de Implementación

### Archivos a modificar

- `components/GameOverlay.vue` — corregir template, lógica JS y estilos CSS del dado

### Pasos ordenados

1. **Reemplazar `getCircleStyle` por mapa de posiciones por cara** en `<script setup>`:

   ```js
   const facePositions: Record<number, Record<string, string>[]> = {
     1: [{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
     2: [{ top: '15%', right: '15%' }, { bottom: '15%', left: '15%' }],
     3: [{ top: '15%', right: '15%' }, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, { bottom: '15%', left: '15%' }],
     4: [{ top: '15%', left: '15%' }, { top: '15%', right: '15%' }, { bottom: '15%', left: '15%' }, { bottom: '15%', right: '15%' }],
     5: [{ top: '15%', left: '15%' }, { top: '15%', right: '15%' }, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, { bottom: '15%', left: '15%' }, { bottom: '15%', right: '15%' }],
     6: [{ top: '15%', left: '15%' }, { top: '50%', left: '15%', transform: 'translateY(-50%)' }, { bottom: '15%', left: '15%' }, { top: '15%', right: '15%' }, { top: '50%', right: '15%', transform: 'translateY(-50%)' }, { bottom: '15%', right: '15%' }],
   };
   ```

2. **Actualizar template del dado** para iterar sobre posiciones por cara:

   ```vue
   <div class="dado-pequeño" :class="{ sliding: isSliding }">
     <span
       v-for="(pos, i) in facePositions[store.diceValue]"
       :key="i"
       class="circulo"
       :style="pos"
     ></span>
   </div>
   ```

3. **Corregir CSS de `.dado-pequeño`**: quitar `display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; padding: 4px;` y mantener solo `position: relative`

4. **Agregar `position: absolute`** a `.circulo`

5. **Eliminar función `getCircleStyle`** (ya no se necesita)

## Criterios de Aceptación

- [x] Cada valor del dado (1-6) muestra los puntos en las posiciones correctas de un dado real
- [x] Cara 1: 1 punto centrado
- [x] Cara 2: 2 puntos en diagonal (arriba-derecha, abajo-izquierda)
- [x] Cara 3: 3 puntos en diagonal descendente
- [x] Cara 4: 4 puntos en las esquinas
- [x] Cara 5: 5 puntos en quincunce (4 esquinas + centro)
- [x] Cara 6: 6 puntos en 2 columnas de 3
- [x] La animación slideDown sigue funcionando correctamente
- [x] El dado se ve proporcional y limpio dentro del contenedor de 40x40px

## Notas

- El contenedor `.dado-pequeño` mantiene 40x40px con fondo blanco y borde gris
- Los puntos (`.circulo`) mantienen 8x8px, color `#333`, `border-radius: 50%`
- La función `getCircleStyle()` se elimina completamente y se reemplaza por el mapa estático `facePositions`
- El tamaño del punto (8px) puede necesitar ajuste si visualmente se ve muy grande o pequeño en 40px de contenedor; considerar 7px como alternativa
