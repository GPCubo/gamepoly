---
id: SPEC-003
title: Casas, hoteles, hipotecas y alquiler desarrollado
created_at: 2026-06-06T10:39:15
status: done
---

# SPEC-003: Casas, hoteles, hipotecas y alquiler desarrollado

## Description

Agregar la logica economica para que un jugador pueda construir casas al completar un grupo de propiedades, ampliar una propiedad a hotel cuando tenga 4 casas, vender mejoras y manejar hipotecas. Las propiedades hipotecadas no cobran alquiler cuando otro jugador cae en ellas.

La hipoteca de propiedades puede hacerse aunque el jugador no tenga el grupo completo. Si una propiedad tiene casas u hotel, primero deben venderse todas las mejoras antes de poder hipotecarla. La construccion de casas y hoteles si requiere poseer el grupo completo de color.

## Context and Motivation

La economia base ya permitia comprar, subastar, cobrar alquiler y quebrar jugadores (economy/SPEC-001). Luego se agrego intercambio entre jugadores (economy/SPEC-002). Faltaba la progresion principal de Monopoly: invertir en casas/hoteles para aumentar alquiler y usar hipotecas para obtener liquidez.

Esta funcionalidad tambien alimenta el tablero visual de board/SPEC-003, porque el estado economico de cada propiedad decide si se muestra casa u hotel.

## Technical Analysis

- `stores/gameStore.ts` agrega `PropertyDevelopmentState` con `houses`, `hotel` y `mortgaged`.
- `GameState` agrega `propertyDevelopments: Record<number, PropertyDevelopmentState>`.
- Las propiedades compradas o ganadas en subasta inicializan su desarrollo con `_ensurePropertyDevelopment`.
- `ownsFullPropertyGroup(tileIndex, playerId)` valida que el jugador tenga todas las propiedades de un grupo de color.
- `canBuildHouse` requiere propiedad de color, grupo completo, no hipotecada, sin hotel, menos de 4 casas y fondos suficientes.
- `canBuildHotel` requiere propiedad de color, grupo completo, no hipotecada, exactamente el estado previo de 4 casas y fondos suficientes.
- `sellImprovement` vende hotel o casa y devuelve la mitad del costo.
- `mortgageProperty` marca una propiedad como hipotecada y suma efectivo al jugador, pero `canMortgageProperty` bloquea propiedades con casas u hotel.
- `unmortgageProperty` cobra el costo de deshipoteca y vuelve a activar alquiler.
- `calculateRent` centraliza alquiler de propiedades, ferrocarriles y servicios considerando hipotecas y mejoras.
- `pages/game.vue` usa `store.calculateRent` para cobrar o mostrar que la propiedad hipotecada no paga alquiler.
- `TileCard.vue` muestra acciones de desarrollo e hipoteca cuando el jugador cae en una propiedad propia.

Costos definidos:

- Casa: 50% del precio de compra, redondeado a decenas.
- Hotel: 75% del precio de compra, redondeado a decenas.
- Hipoteca: 50% del precio de compra.
- Levantar hipoteca: 110% del valor de hipoteca, redondeado a decenas.

Alquiler definido:

- Propiedad sin mejoras: 10% del precio de compra.
- Propiedad con casas: alquiler base multiplicado por `1 + houses * 2`.
- Propiedad con hotel: alquiler base multiplicado por `10`.
- Ferrocarril: `$25 * cantidad de ferrocarriles no hipotecados del propietario`.
- Servicio: dado total por 4 o 10 segun cantidad de servicios no hipotecados.
- Propiedad hipotecada: `$0`.

## Implementation Plan

### Files to create

- Ninguno especifico para economia; se integra en store y componentes existentes.

### Files to modify

- `stores/gameStore.ts` - Estado y acciones para mejoras, hoteles, hipotecas y calculo de alquiler.
- `pages/game.vue` - Usar alquiler centralizado, renderizar construcciones dinamicas y conectar acciones de TileCard.
- `components/TileCard.vue` - Mostrar desarrollo, costos, botones de construir, vender, hipotecar y levantar hipoteca.
- `config/boardHouseAssets.ts` - Convertir `propertyDevelopments` en placements visuales de casas/hoteles.

### Ordered Steps

1. Agregar `PropertyDevelopmentState` al store.
2. Inicializar desarrollo cuando se compra o gana una propiedad en subasta.
3. Implementar costos de casa, hotel, hipoteca y deshipoteca.
4. Implementar validaciones `canBuildHouse`, `canBuildHotel`, `canSellImprovement`, `canMortgageProperty` y `canUnmortgageProperty`.
5. Implementar acciones `buildHouse`, `buildHotel`, `sellImprovement`, `mortgageProperty` y `unmortgageProperty`.
6. Centralizar renta en `calculateRent`.
7. Actualizar cobro de alquiler para que las propiedades hipotecadas cobren `$0`.
8. Actualizar `TileCard.vue` para mostrar controles de desarrollo/hipoteca en propiedades propias.
9. Conectar `pages/game.vue` con los eventos de construccion, venta e hipoteca.
10. Renderizar casas/hoteles en tablero a partir de `propertyDevelopments`.

## Acceptance Criteria

- [x] El jugador puede construir casas solo si posee el grupo completo.
- [x] Una propiedad acepta hasta 4 casas.
- [x] Con 4 casas, el jugador puede ampliar a hotel pagando costo adicional.
- [x] Al ampliar a hotel, las casas se reemplazan por el hotel.
- [x] El jugador puede vender hotel o casas y recibir reembolso.
- [x] La hipoteca se puede hacer sin tener el grupo completo.
- [x] Una propiedad con casas u hotel no se puede hipotecar hasta vender todas sus mejoras.
- [x] Al vender la ultima casa, el conteo queda en 0 y desaparece el modelo visual del tablero.
- [x] Una propiedad hipotecada no cobra alquiler.
- [x] Ferrocarriles y servicios hipotecados no cuentan para calculo de renta.
- [x] El store centraliza el calculo de alquiler.
- [x] La UI de TileCard refleja costos, estado de desarrollo e hipoteca.
- [x] El tablero visual cambia entre casas y hotel segun el desarrollo.

## Notes

- La hipoteca exige vender mejoras primero para evitar estados ambiguos entre propiedad desarrollada e hipotecada.
- Los costos son simplificados y derivados del precio de compra para no agregar una tabla de rentas nueva por casilla.
- La subasta se movio a `buyAuctionedProperty` para inicializar desarrollo igual que una compra normal.
- En bancarrota se eliminan propietarios y desarrollo asociado.
