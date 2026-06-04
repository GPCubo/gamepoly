---
id: SPEC-002
title: Etiquetas de propiedades en tablero 3D
created_at: 2026-05-22T03:30:00
updated_at: 2026-05-22T23:45:00
status: in-progress
---

# SPEC-002: Etiquetas de propiedades en tablero 3D

## Description

Agregar configuracion de datos y renderizado visual de etiquetas con el nombre de cada casilla sobre el tablero 3D. No todas las casillas son propiedades: algunas son esquinas sin accion, otras son para recoger tarjetas (Suerte, Arca Comunal), otras cobran impuestos, y otras son estaciones de tren o companias de servicios. Se necesita:

1. Un archivo de configuracion editable (`boardTilesConfig.ts`) con los 40 tiles del tablero, cada uno con su tipo, grupo, nombre editable y metadata.
2. Un composable (`useTileLabels.ts`) que genere texturas canvas con los nombres para cada casilla.
3. Extender `useBoardGeometry.ts` para proveer posicion y rotacion de cada etiqueta.
4. Modificar `game.vue` para renderizar los meshes de las etiquetas sobre cada casilla.

El listado de nombres es facilmente editable para personalizacion futura.

## Context and Motivation

Actualmente el tablero 3D (`tablero.glb`) muestra casillas con colores diferenciados pero sin texto. Los jugadores no pueden identificar que propiedad estan pisando sin referirse a una guia externa. Agregar etiquetas con nombres mejora drasticamente la experiencia de juego y hace el tablero auto-explicativo.

Este spec pertenece al modulo GAME (tablero y renderizado 3D).

## Estado actual — observado con Playwright

Inspeccion visual realizada el 2026-05-22 arrancando el servidor (`npm run dev`) y navegando a `/game`.

**Lo que ya funciona:**
- Los 40 tiles estan configurados en `boardTilesConfig.ts` con tipos, grupos, nombres y `shortName` donde el texto es largo.
- Los labels se renderizan como `PlaneGeometry` con `CanvasTexture` sobre cada casilla.
- La banda de color del grupo ocupa el 15% superior del canvas.
- La rotacion es correcta en los 4 lados (texto legible desde afuera del tablero).
- El fondo semitransparente (`rgba(0,0,0,0.65)`) genera buen contraste con el tile blanco.

**Problemas visuales identificados:**

| Problema | Valor actual | Valor correcto | Efecto visual |
|----------|-------------|----------------|---------------|
| Label demasiado angosto | `LABEL_PLANE_WIDTH: 0.34` | `~0.35–0.37` | No cubre el ancho del tile |
| Label demasiado bajo | `LABEL_PLANE_HEIGHT: 0.18` | `~0.28–0.30` | Cubre solo la mitad del area util |
| Label descentrado a lo largo del borde | offset ~0.05 unidades (ver analisis) | offset 0.00 | Label aparece entre 2 propiedades |
| Label mal centrado en profundidad | `LABEL_PADDING_Z: -0.20` | `~-0.13` | Label demasiado adentro hacia el centro del tablero |

## Technical Analysis

### Dimensiones exactas del tablero — fuente: `scripts_blenders/create_monopoly_table.py`

```python
BOARD_SIZE   = 4.5
CORNER_SIZE  = 0.45
TILE_WIDTH   = (4.5 - 0.9) / 9  = 0.4      # paso entre centros de tiles
TILE_DEPTH   = 0.45                           # profundidad del tile (perp. al borde)
BAND_DEPTH   = 0.10                           # banda de color (borde exterior)

# Dimensiones de la base blanca:
base_mesh.dimensions = (TILE_WIDTH * 0.94, TILE_DEPTH, ...)  = (0.376, 0.45, ...)

# Posicion del centro de la banda (local, respecto al container del tile):
band_mesh.location = (0, TILE_DEPTH/2 - BAND_DEPTH/2, ...)  = (0, 0.175, ...)
# La banda ocupa el extremo exterior (positive local-Y del container)
```

### Espacio disponible por tipo de casilla

| Tipo | Ancho (a lo largo del borde) | Alto (area no-banda) | Notas |
|------|------------------------------|----------------------|-------|
| Propiedad | 0.376 | 0.35 (= 0.45 - 0.10) | Debajo de la banda |
| Especial (Suerte, Tren, etc.) | 0.376 | 0.45 (sin banda) | Area completa |
| Esquina | 0.45 | 0.45 | Area completa de la esquina |

El `LABEL_PLANE_WIDTH` optimo es **0.35** (ligeramente menor que 0.376 para dejar 0.013 de margen en cada lado y absorber el error de posicionamiento).

El `LABEL_PLANE_HEIGHT` optimo para propiedades es **0.28** (0.35 disponible menos 0.035 de margen superior bajo la banda y 0.035 de margen inferior).

### Bug de centrado a lo largo del borde — causa raiz

`getCasillaCoordinates()` fue disenada para posicionar **piezas**, no para centrar labels exactamente sobre tiles. Existe una discrepancia sistematica de **±0.05 unidades** entre las coordenadas que devuelve y los centros reales de los tiles en el modelo Blender.

**Derivacion matematica:**

Para el lado inferior (tiles 1–9), el centro real de cada tile en Three.js es:

```
X_real = -H + CORNER_SIZE + (rem - 0.5) * TILE_WIDTH + PIECE_ORIGIN_OFFSET.x
       = -2.25 + 0.45 + (rem - 0.5) * 0.4 + (-2.15)   [incorrecto, ver abajo]
```

Valor correcto (del script Blender, mapeado a Three.js):

```
X_blender = -H + CORNER_SIZE + (rem - 0.5) * TILE_WIDTH
          = -2.25 + 0.45 + rem*0.4 - 0.20
          = rem * 0.4 - 2.00
```

Valor de getCasillaCoordinates + PIECE_ORIGIN_OFFSET:

```
X_codigo = inicioX + rem * pasoCasilla + PIECE_ORIGIN_OFFSET.x
         = 0.1 + rem*0.4 + (-2.15)
         = rem * 0.4 - 2.05
```

**Diferencia: `X_codigo - X_blender = -0.05` para todos los tiles del lado inferior.**

La misma discrepancia de 0.05 se replica en los otros 3 lados (signo varia segun el eje). Esto significa que el centro del `PlaneGeometry` esta desplazado ~0.05 unidades del centro geometrico del tile. Con un plano de ancho 0.376, este offset es suficiente para que visualmente el label parezca estar entre dos propiedades.

**Tabla de discrepancias por lado:**

| Lado | Indices | Eje del desplazamiento | Offset (codigo - Blender) |
|------|---------|------------------------|--------------------------|
| Inferior | 1–9 | X | -0.05 (codigo queda a la izquierda) |
| Derecho | 11–19 | Z | +0.05 (codigo queda mas al norte) |
| Superior | 21–29 | X | +0.05 (codigo queda a la derecha) |
| Izquierdo | 31–39 | Z | +0.05 (codigo queda mas al sur) |

### Bug de centrado en profundidad (Z del plano, eje perp. al borde)

El area util del tile en profundidad es:
- Total: 0.45
- Banda: 0.10 (en el extremo exterior)
- Disponible: 0.35

El centro del area disponible, desde el centro del tile, es:
```
offset_profundidad = (BAND_DEPTH / 2) * -1 = -0.05
```
(0.05 unidades hacia el interior del tablero desde el centro del tile)

`LABEL_PADDING_Z` actual es **-0.20**, que desplaza el label 0.15 unidades demasiado hacia el interior. El valor correcto es aproximadamente **-0.05** a **-0.08**.

### Solucion propuesta para el centrado

En lugar de corregir `getCasillaCoordinates` (que afectaria el movimiento de piezas), la correccion se implementa exclusivamente en `getTileLabelTransform` ajustando el offset en el eje lateral:

**Nuevo `LABEL_PADDING_X` recomendado: `0.05`** (aumentar desde 0.03)

Con `LABEL_PADDING_X = 0.05`:
- Lado inferior (rotZ=0): worldOffX = +0.05, corrige el -0.05 del codigo → centrado perfecto ✓
- Lado derecho (rotZ=-π/2): worldOffZ = -0.05, corrige el +0.05 del codigo → centrado perfecto ✓
- Lado superior (rotZ=π): worldOffX = -0.05, corrige el +0.05 del codigo → centrado perfecto ✓
- Lado izquierdo (rotZ=π/2): worldOffZ = +0.05, pero el codigo tiene offset +0.05 → necesita -0.05 ✗

El lado izquierdo sigue teniendo discrepancia con un padding uniforme. Esto requiere una de dos opciones:
- **Opcion A (recomendada):** Calcular el centro real del tile directamente desde la formula Blender en `getTileLabelTransform`, ignorando el resultado de `getCasillaCoordinates` para el eje lateral.
- **Opcion B:** Usar `LABEL_PADDING_X` distinto por lado mediante un `Map` indexado por `side`.

#### Formula de posicion exacta para labels (Opcion A)

```typescript
// En getTileLabelTransform, reemplazar la X/Z lateral con calculo directo:
const H = 2.25;  // BOARD_SIZE / 2
const C = 0.45;  // CORNER_SIZE
const W = 0.4;   // TILE_WIDTH
const rem = ((idx - 1) % 10) + 1;  // posicion dentro del lado (1-9)

let lateralCenter: number;
if (idx < 10)       lateralCenter = -H + C + (rem - 0.5) * W + PIECE_ORIGIN_OFFSET.x;  // lado inferior, eje X
else if (idx < 20)  lateralCenter = H - C - (rem - 0.5) * W + PIECE_ORIGIN_OFFSET.z;   // lado derecho, eje Z
else if (idx < 30)  lateralCenter = H - C - (rem - 0.5) * W + PIECE_ORIGIN_OFFSET.x;   // lado superior, eje X
else                lateralCenter = H - C - (rem - 0.5) * W + PIECE_ORIGIN_OFFSET.z;   // lado izquierdo, eje Z
```

### Configuracion de labels — valores actuales vs valores corregidos

```typescript
// gameConfig.ts — valores actuales:
LABEL_FONT_SIZE:            22,
LABEL_CANVAS_WIDTH:        256,
LABEL_CANVAS_HEIGHT:        96,
LABEL_PLANE_WIDTH:          0.34,    // ← demasiado angosto
LABEL_PLANE_HEIGHT:         0.18,    // ← demasiado bajo
LABEL_Y_OFFSET:             0.0,
LABEL_PADDING_X:            0.03,    // ← insuficiente para centrar
LABEL_PADDING_Z:           -0.20,    // ← demasiado adentro
LABEL_CORNER_PLANE_WIDTH:   0.36,
LABEL_CORNER_PLANE_HEIGHT:  0.18,
LABEL_CORNER_PADDING_X:     0,
LABEL_CORNER_PADDING_Z:     0,

// Valores corregidos propuestos:
LABEL_PLANE_WIDTH:          0.35,    // cubre tile dejando 0.013 de margen/lado
LABEL_PLANE_HEIGHT:         0.28,    // cubre 80% del area no-banda
LABEL_PADDING_X:            0.05,    // corrige offset sistematico de getCasillaCoordinates (3 de 4 lados)
LABEL_PADDING_Z:           -0.08,    // centra en area no-banda (centro = -0.05, + margen bajo la banda)
LABEL_CORNER_PLANE_WIDTH:   0.38,    // esquinas: 0.45 * 0.85
LABEL_CORNER_PLANE_HEIGHT:  0.28,
```

### Rotacion de etiquetas por lado

| Lado | Tiles | Rotacion Z (radianes) | Observacion |
|------|-------|----------------------|-------------|
| Inferior | 1–9 | 0 | Legible mirando al tablero desde el sur |
| Derecho | 11–19 | -Math.PI / 2 | Legible mirando desde el este |
| Superior | 21–29 | Math.PI | Legible mirando desde el norte |
| Izquierdo | 31–39 | Math.PI / 2 | Legible mirando desde el oeste |
| Esquina GO (0) | — | Math.PI / 4 | Diagonal |
| Esquina Carcel (10) | — | -Math.PI / 4 | Diagonal |
| Esquina Parking (20) | — | -3*Math.PI / 4 | Diagonal |
| Esquina Ve-Carcel (30) | — | 3*Math.PI / 4 | Diagonal |

La rotacion `x: -Math.PI / 2` hace que el plano quede horizontal (tumbado sobre el tile). El `z: rotZ` orienta el texto hacia el exterior del tablero.

### Enfoque tecnico: Canvas Texture sobre PlaneGeometry

Se renderiza texto en un `<canvas>` HTML, se convierte en textura Three.js (`CanvasTexture`), y se aplica a un `PlaneGeometry` posicionado y rotado sobre cada casilla.

**Ventajas**:
- Integracion natural con TresJS (`<TresMesh>`, `<TresPlaneGeometry>`, `<TresMeshBasicMaterial>`)
- Las etiquetas rotan con el tablero (pertenecen a la escena 3D)
- Fuentes personalizables, buen rendimiento
- Facil de ajustar (font size, color, padding via configuracion)

**Alternativas descartadas**:
- Sprites (siempre miran a la camara, no rotan con el tablero)
- TextGeometry (requiere archivos de fuente JSON, pesado y complejo)
- CSS2D overlay (no se integra con la escena 3D, z-fighting issues)

### Dependencias existentes

- `@tresjs/core`: `<TresMesh>`, `<TresPlaneGeometry>`, `<TresMeshBasicMaterial>`
- `three`: `CanvasTexture`, `DoubleSide`
- `useBoardGeometry.ts`: posicion de casillas
- `config/gameConfig.ts`: constantes centralizadas

### Configuracion de los 40 tiles

```typescript
type TileType = "corner" | "property" | "card" | "tax" | "railroad" | "utility";
type TileGroup = "go" | "brown" | "lightBlue" | "pink" | "orange" | "red" |
  "yellow" | "green" | "darkBlue" | "railroad" | "utility" | "tax" |
  "chance" | "community" | "jail" | "parking" | "gotojail";

interface BoardTile {
  index: number;
  type: TileType;
  group: TileGroup;
  name: string;
  shortName?: string;   // texto corto para canvas cuando name supera el ancho
  price?: number;
}
```

Listado completo de los 40 tiles (implementado en `config/boardTilesConfig.ts`):

| # | Type | Group | Name | shortName | Price |
|---|------|-------|------|-----------|-------|
| 0 | corner | go | Salida | — | — |
| 1 | property | brown | Ronda de Arrieta | — | 60 |
| 2 | card | community | Arca Comunal | — | — |
| 3 | property | brown | Plaza de Lavapies | — | 60 |
| 4 | tax | tax | Impuesto s/Renta | Impuesto | — |
| 5 | railroad | railroad | Estacion Norte | — | 200 |
| 6 | property | lightBlue | Calle de la Montera | La Montera | 100 |
| 7 | card | chance | Suerte | — | — |
| 8 | property | lightBlue | Calle de Alcala | — | 100 |
| 9 | property | lightBlue | Gran Via | — | 120 |
| 10 | corner | jail | Carcel | Carcel (Visita) | — |
| 11 | property | pink | Paseo del Prado | — | 140 |
| 12 | utility | utility | Cia. Electrica | Electrica | 150 |
| 13 | property | pink | Calle de Serrano | — | 140 |
| 14 | property | pink | Paseo de Recoletos | — | 160 |
| 15 | railroad | railroad | Estacion Este | — | 200 |
| 16 | property | orange | Calle de Goya | — | 180 |
| 17 | card | community | Arca Comunal | — | — |
| 18 | property | orange | Calle de Velazquez | — | 180 |
| 19 | property | orange | P. de la Castellana | Castellana | 200 |
| 20 | corner | parking | Parking Gratuito | Parking | — |
| 21 | property | red | Plaza de Espana | — | 220 |
| 22 | card | chance | Suerte | — | — |
| 23 | property | red | Calle de Fuencarral | Fuencarral | 220 |
| 24 | property | red | Paseo de la Reforma | Reforma | 240 |
| 25 | railroad | railroad | Estacion Sur | — | 200 |
| 26 | property | yellow | Av. de America | America | 260 |
| 27 | property | yellow | Calle Bravo Murillo | Bravo Murillo | 260 |
| 28 | utility | utility | Cia. de Agua | Agua | 150 |
| 29 | property | yellow | Calle Alberto Aguilera | Alberto Aguilera | 280 |
| 30 | corner | gotojail | Ve a la Carcel | Ve Carcel | — |
| 31 | property | green | Paseo de Gracia | — | 300 |
| 32 | property | green | Rambla de Cataluna | — | 300 |
| 33 | card | community | Arca Comunal | — | — |
| 34 | property | green | Avenida Diagonal | — | 320 |
| 35 | railroad | railroad | Estacion Oeste | — | 200 |
| 36 | card | chance | Suerte | — | — |
| 37 | property | darkBlue | Paseo de la Habana | La Habana | 350 |
| 38 | tax | tax | Impuesto de Lujo | Lujo | — |
| 39 | property | darkBlue | Paseo del Arte | — | 400 |

**Todos los nombres son editables.** Son placeholders inspirados en calles de ciudades espanolas al estilo Monopoly clasico.

## Implementation Plan

### Files to create

- `config/boardTilesConfig.ts` ✅ — Configuracion editable de los 40 tiles
- `composables/useTileLabels.ts` ✅ — Composable que genera texturas canvas

### Files to modify

- `composables/useBoardGeometry.ts` ✅ parcial — Tiene `getTileLabelTransform` pero con posicionamiento incorrecto
- `config/gameConfig.ts` ✅ parcial — Tiene constantes de labels pero con valores incorrectos
- `pages/game.vue` ✅ — Labels renderizados

### Bugs corregidos (2026-05-22)

#### Bug 1: Labels demasiado pequenos ✅

**Archivo:** `config/gameConfig.ts`

```typescript
LABEL_PLANE_WIDTH:         0.35   // era 0.34
LABEL_PLANE_HEIGHT:        0.28   // era 0.18
LABEL_CORNER_PLANE_WIDTH:  0.38   // era 0.36
LABEL_CORNER_PLANE_HEIGHT: 0.28   // era 0.18
```

#### Bug 2: Labels aparecen entre 2 propiedades ✅

**Causa:** `getCasillaCoordinates` tiene un offset sistematico de 0.05 unidades del centro real del tile. El error es siempre en el mismo eje independientemente del sentido de recorrido: +0.05 en X para lados inferior/superior, +0.05 en Z para lados derecho/izquierdo.

**Por que `LABEL_PADDING_X` rotado no funciona:** Al rotar el padding con la matrix del plano, `cos(π) = -1` para el lado superior y `sin(π/2) = +1` (signo erroneo) para el lado izquierdo invierten la correccion. El mismo valor que alinea el lado inferior *desalinea* el superior.

**Solucion implementada en `getTileLabelTransform` (`useBoardGeometry.ts`):**

```typescript
// Correccion lateral directa por eje (no rotada) — LABEL_PADDING_X = 0
if (!isCorner) {
  if (idx < 10 || (idx >= 20 && idx < 30)) {
    position.x += 0.05;  // lados inferior y superior: error en eje X
  } else {
    position.z -= 0.05;  // lados derecho e izquierdo: error en eje Z
  }
}
```

#### Bug 3: LABEL_PADDING_Z demasiado grande ✅

**Archivo:** `config/gameConfig.ts`

```typescript
LABEL_PADDING_X: 0.0    // correccion lateral movida a getTileLabelTransform (per-side)
LABEL_PADDING_Z: -0.13  // era -0.20 — centra en area no-banda
```

`getCasillaCoordinates` posiciona las piezas 0.075 unidades mas hacia el borde exterior que el centro del tile. Con eso:
- Centro del area no-banda desde getCasillaCoordinates = -0.13 (= tile_depth/2 - band_depth/2 - 0.075 ≈ -0.125)
- `LABEL_PADDING_Z = -0.13` centra el label height=0.28 dentro del area no-banda [1.83, 2.11] vs disponible [1.80, 2.15]

## Acceptance Criteria

- [x] Los 40 tiles del tablero estan configurados en `boardTilesConfig.ts` con nombre, tipo, grupo y precio editable
- [x] Las esquinas (0, 10, 20, 30) muestran su nombre correctamente posicionado
- [x] Las propiedades muestran su nombre sobre la casilla
- [x] Las casillas de Suerte y Arca Comunal muestran su nombre
- [x] Las estaciones de tren muestran su nombre
- [x] Las casillas de impuestos muestran su nombre
- [x] Las companias de servicios muestran su nombre
- [x] Las etiquetas rotan correctamente en cada lado del tablero (cada lado mira hacia afuera)
- [x] Cada etiqueta esta centrada sobre su propia casilla — no aparece entre 2 propiedades
- [x] Las etiquetas cubren el area no-banda completa de cada tile (ancho 0.35, alto 0.28)
- [ ] Las etiquetas son legibles desde la camara orbital a distancia media
- [x] Los nombres son facilmente editables en `boardTilesConfig.ts` sin tocar logica de renderizado
- [x] No se instalaron dependencias nuevas (solo se usan Three.js y TresJS existentes)

## Notes

- Los nombres de propiedades son placeholders editables. Se usan nombres de calles espanolas al estilo Monopoly clasico y pueden cambiarse libremente.
- `getCasillaCoordinates` NO se modifica para corregir el centrado de labels: esa funcion esta calibrada para el movimiento de piezas y modificarla puede romper la logica de juego. El fix va exclusivamente en `getTileLabelTransform`.
- Se usa Canvas Texture como tecnica principal. Si se necesita mejor calidad de texto en el futuro, se podra migrar a MSDF fonts.
- Las texturas canvas se generan una vez al montar el componente y se cachean (no se regeneran en cada frame).
- Los precios se incluyen en la config pero su renderizado en la etiqueta es opcional y puede implementarse en un spec futuro (board/SPEC-003+).
- La formula geometrica exacta de `getTileLabelTransform` (Opcion A) requiere validacion de signos en los 4 lados tras el primer render.
