---
id: SPEC-004
title: Precio de construccion por propiedad y alquiler escalado exponencial
created_at: 2026-06-09T19:15:07
status: done
---

# SPEC-004: Precio de construccion por propiedad y alquiler escalado exponencial

## Description

Rediseñar el modelo economico de mejoras para que:

1. El costo de construir una casa dependa del precio de la propiedad, dentro de un rango fijo: la casa mas barata cuesta **$50** y la mas cara **$200**. El costo crece de forma proporcional al precio de la propiedad entre ese minimo y maximo.
2. El alquiler que paga otro jugador al caer en la propiedad **suba de forma exponencial** segun la cantidad de casas y, finalmente, el hotel. El tope de alquiler es de aproximadamente **$2000** en la propiedad mas cara con hotel.
3. El **valor de la hipoteca** se calcule en funcion de lo valiosa que es la propiedad (a mayor precio, mayor liquidez al hipotecar).
4. El **costo de levantar la hipoteca** se calcule en funcion del precio (la deshipoteca incluye un interes sobre el valor recibido).

Todas las formulas redondean a decenas y toman el rango de precios **dinamicamente de `config/boardTilesConfig.ts`** (`BOARD_TILES`), de modo que si se cambian los precios de las casillas, los costos de casa/hotel/hipoteca se reescalan solos sin tocar constantes hardcodeadas.

Esto reemplaza los costos y rentas simplificados definidos en `economy/SPEC-003`, donde la casa costaba el 50% del precio (minimo ~$30) y el alquiler con hotel del inmueble mas caro apenas llegaba a ~$400.

Las propiedades del tablero van de **$60** (mas barata, grupo marron) a **$400** (mas cara, grupo azul oscuro), valores que se derivan de `BOARD_TILES` y no se escriben a mano.

## Context and Motivation

`economy/SPEC-003` introdujo casas, hoteles, hipotecas y alquiler desarrollado, pero con una escala muy plana:

- `getHouseCost = round10(price * 0.5)` -> la casa mas barata costaba $30, no habia piso de $50.
- `calculateRent` usaba `base * (1 + houses * 2)` y `base * 10` para hotel, con `base = floor(price * 0.1)`. El maximo (propiedad de $400 con hotel) era `40 * 10 = $400`.

Con esa curva, construir casas casi no cambia la partida: el alquiler crece lineal y bajo, por lo que invertir en mejoras no genera la presion economica caracteristica de Monopoly. El objetivo es que:

- Construir tenga un costo de entrada claro y acotado ($50 a $200 por casa).
- Caer en una propiedad muy desarrollada sea realmente caro (hasta ~$2000), de modo que el alquiler crezca de forma exponencial con cada casa/hotel.

Esta spec toca el mismo flujo que `economy/SPEC-003` y alimenta la UI de `components/TileCard.vue` (tabla de alquileres) y el cobro en `pages/game.vue`.

## Technical Analysis

Estado actual en `stores/gameStore.ts`:

- `getHouseCost(tileIndex)` -> `roundToNearest10((price) * 0.5)`.
- `getHotelCost(tileIndex)` -> `roundToNearest10((price) * 0.75)`.
- `calculateRent(tile, ownerId)` -> `base = floor(price * 0.1)`; hotel `base * 10`; casas `base * (1 + houses * 2)`; sin mejoras `base`.
- `sellImprovement` reembolsa la mitad de `getHouseCost`/`getHotelCost`, por lo que sigue automaticamente cualquier cambio de costo.

Duplicacion a corregir: `components/TileCard.vue` define su propia `propertyRentSchedule` con multiplicadores **hardcodeados** (`base*3, *5, *7, *9, *10`). Si solo se cambia el store, la tarjeta mostraria valores distintos a los que cobra el juego. Para evitar divergencia se centralizan costo de casa, costo de hotel, alquiler base, multiplicadores, hipoteca y deshipoteca en un unico modulo `config/economyConfig.ts`, consumido tanto por el store como por la tarjeta.

### Rango de precios dinamico y redondeo

`config/economyConfig.ts` deriva el rango de precios de las propiedades directamente de `BOARD_TILES` (solo `type === "property"`, excluyendo ferrocarriles y servicios), y expone un helper de redondeo reusado por todas las formulas:

```
import { BOARD_TILES } from "~/config/boardTilesConfig";

const PROPERTY_PRICES = BOARD_TILES
  .filter((t) => t.type === "property" && typeof t.price === "number")
  .map((t) => t.price as number);

export const PRICE_MIN = Math.min(...PROPERTY_PRICES); // 60 hoy
export const PRICE_MAX = Math.max(...PROPERTY_PRICES); // 400 hoy

export function roundToStep(value: number, step = 10): number {
  return Math.round(value / step) * step;
}

function priceRatio(price: number): number {
  if (PRICE_MAX === PRICE_MIN) return 0;
  return Math.min(1, Math.max(0, (price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)));
}
```

Asi, si cambian los precios en `boardTilesConfig.ts`, `PRICE_MIN`/`PRICE_MAX` se recalculan y todas las formulas siguen acotadas correctamente.

### Nuevo costo de casa (rango $50–$200)

Mapeo lineal del precio de la propiedad `[PRICE_MIN, PRICE_MAX]` al rango `[HOUSE_COST_MIN=50, HOUSE_COST_MAX=200]`, redondeado a decenas:

```
houseCostForPrice(price) =
  roundToStep(HOUSE_COST_MIN + priceRatio(price) * (HOUSE_COST_MAX - HOUSE_COST_MIN))
```

Tabla resultante (redondeada a decenas):

| Precio | Casa |
|--------|------|
| 60     | 50   |
| 100    | 70   |
| 140    | 90   |
| 180    | 100  |
| 200    | 110  |
| 240    | 130  |
| 280    | 150  |
| 320    | 160  |
| 350    | 180  |
| 400    | 200  |

### Nuevo costo de hotel

El hotel se construye sobre 4 casas ya pagadas. Se define como multiplo del costo de casa para mantener la proporcion:

```
hotelCost = round10(houseCost * 4)   // rango aprox. $200–$800
```

(Tunable; queda en `economyConfig.ts`.)

### Nuevo alquiler exponencial (tope ~$2000)

Alquiler base `base = round(price * 0.1)`. Se aplica un multiplicador por nivel de desarrollo que aproxima crecimiento exponencial:

| Nivel        | Multiplicador |
|--------------|---------------|
| 0 casas      | x1            |
| 1 casa       | x5            |
| 2 casas      | x12           |
| 3 casas      | x25           |
| 4 casas      | x40           |
| Hotel        | x50           |

Verificacion en la propiedad mas cara (`$400`, `base = 40`):

| Nivel   | Alquiler |
|---------|----------|
| 0 casas | 40       |
| 1 casa  | 200      |
| 2 casas | 480      |
| 3 casas | 1000     |
| 4 casas | 1600     |
| Hotel   | **2000** |

Y en la mas barata (`$60`, `base = 6`): 6 / 30 / 72 / 150 / 240 / 300.

`calculateRent` para ferrocarriles, servicios e hipotecadas se mantiene igual que en `economy/SPEC-003`.

### Valor de hipoteca (en funcion de lo valiosa que es la propiedad)

A mayor precio, mayor liquidez. Proporcional al precio, redondeado a decenas:

```
MORTGAGE_RATE = 0.5
mortgageValueForPrice(price) = roundToStep(price * MORTGAGE_RATE)
```

| Precio | Hipoteca |
|--------|----------|
| 60     | 30       |
| 200    | 100      |
| 400    | 200      |

### Costo de levantar la hipoteca (en funcion del precio)

Devolver lo recibido mas un interes, redondeado a decenas:

```
UNMORTGAGE_INTEREST = 0.1
unmortgageCostForPrice(price) =
  roundToStep(mortgageValueForPrice(price) * (1 + UNMORTGAGE_INTEREST))
```

| Precio | Hipoteca | Levantar |
|--------|----------|----------|
| 60     | 30       | 30       |
| 200    | 100      | 110      |
| 400    | 200      | 220      |

Esto formaliza lo que hoy hacen `getMortgageValue` (`price / 2`) y `getUnmortgageCost` (`mortgage * 1.1`) en el store, pero centralizado y redondeado a decenas de forma consistente. `MORTGAGE_RATE` y `UNMORTGAGE_INTEREST` quedan tunables en `economyConfig.ts`.

## Implementation Plan

### Files to create

- `config/economyConfig.ts` - Constantes y helpers compartidos, derivando el rango de precios de `BOARD_TILES`:
  - `PRICE_MIN`, `PRICE_MAX` (calculados desde `boardTilesConfig`).
  - `roundToStep(value, step=10)` y `priceRatio(price)`.
  - `houseCostForPrice(price)`, `hotelCostForPrice(price)`.
  - `rentBaseForPrice(price)` y `RENT_MULTIPLIERS` (0-4 casas + hotel).
  - `mortgageValueForPrice(price)`, `unmortgageCostForPrice(price)`.

### Files to modify

- `stores/gameStore.ts` - `getHouseCost`/`getHotelCost`/`getMortgageValue`/`getUnmortgageCost` delegan en los helpers de `economyConfig`. `calculateRent` usa `rentBaseForPrice` y `RENT_MULTIPLIERS` en lugar de `base * (1 + houses * 2)` y `base * 10`. Se puede eliminar el `roundToNearest10` local en favor de `roundToStep`.
- `components/TileCard.vue` - `propertyRentSchedule` y `rentBase` se calculan con los mismos helpers/multiplicadores de `economyConfig` (eliminar multiplicadores hardcodeados) para que la tarjeta y el cobro coincidan exactamente.

### Ordered Steps

1. Crear `config/economyConfig.ts` que importe `BOARD_TILES`, calcule `PRICE_MIN`/`PRICE_MAX` y exponga `roundToStep` y `priceRatio`.
2. Agregar a `economyConfig.ts` los helpers de costo de casa, costo de hotel, alquiler base y `RENT_MULTIPLIERS`.
3. Agregar a `economyConfig.ts` `mortgageValueForPrice` y `unmortgageCostForPrice`.
4. Refactorizar `getHouseCost`, `getHotelCost`, `getMortgageValue` y `getUnmortgageCost` en el store para delegar en los helpers.
5. Refactorizar `calculateRent` para usar `RENT_MULTIPLIERS` segun casas/hotel.
6. Refactorizar `TileCard.vue` para derivar la tabla de alquileres de `economyConfig` (sin numeros hardcodeados).
7. Verificar que `sellImprovement` (reembolso = mitad del costo) sigue coherente con los nuevos costos.
8. Probar manualmente: costo de casa $50 (propiedad de $60) y $200 (propiedad de $400); alquiler hasta ~$2000 con hotel en la mas cara; valores de hipoteca y deshipoteca coherentes.
9. Verificar que la build de Nuxt pasa.

## Acceptance Criteria

- [x] La casa mas barata (propiedad de $60) cuesta exactamente $50.
- [x] La casa mas cara (propiedad de $400) cuesta exactamente $200.
- [x] El costo de casa crece de forma proporcional al precio entre $50 y $200.
- [x] El alquiler crece de forma exponencial con cada casa y con el hotel.
- [x] El alquiler maximo (propiedad de $400 con hotel) es de aproximadamente $2000.
- [x] El alquiler mostrado en `TileCard.vue` coincide con el que cobra el juego al caer otro jugador.
- [x] El valor de la hipoteca crece con el precio de la propiedad y se redondea a decenas.
- [x] El costo de levantar la hipoteca es funcion del precio (hipoteca + interes) y se redondea a decenas.
- [x] `PRICE_MIN` y `PRICE_MAX` se derivan de `BOARD_TILES`, no se escriben a mano.
- [x] Cambiar los precios en `boardTilesConfig.ts` reescala los costos sin tocar `economyConfig.ts`.
- [x] El reembolso al vender mejoras sigue siendo la mitad del costo de construccion vigente.
- [x] Las propiedades hipotecadas siguen cobrando $0.
- [x] Los costos, base, multiplicadores, hipoteca y deshipoteca estan centralizados en `config/economyConfig.ts`.
- [x] La build de Nuxt pasa despues del cambio.

## Notes

- Los multiplicadores de alquiler son una tabla discreta que aproxima crecimiento exponencial; se eligio sobre una formula `base * factor^nivel` por legibilidad y por permitir afinar el tope a ~$2000 sin decimales. Quedan tunables en `economyConfig.ts`.
- Esta spec actualiza los valores definidos en `economy/SPEC-003`; la mecanica de validaciones (grupo completo, construccion balanceada, hipoteca) no cambia.
- El costo de hotel se deriva del costo de casa (`x4`) para no introducir una tabla por casilla; puede ajustarse luego sin tocar el store.
- Centralizar en `economyConfig.ts` elimina la duplicacion actual entre el calculo del store y la tabla hardcodeada de `TileCard.vue`.
