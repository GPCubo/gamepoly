---
id: SPEC-005
title: Resolucion de deuda y bancarrota manual
created_at: 2026-06-10T08:00:00
status: done
---

# SPEC-005: Resolucion de deuda y bancarrota manual

## Description

Permitir que un jugador humano que queda sin dinero pueda resolver su deuda antes de ser declarado en bancarrota. Si cae en una propiedad, paga alquiler, paga impuesto o pierde dinero por una carta y queda con cash negativo, el juego debe darle oportunidad de vender mejoras e hipotecar propiedades.

## Context and Motivation

Antes, un jugador podia quedar en bancarrota inmediatamente al no poder costear una obligacion. Eso bloqueaba un flujo central de Monopoly: usar activos para conseguir liquidez. La UI necesitaba una forma clara de entrar en modo deuda, con foco accesible y herramientas rapidas para hipotecar o vender mejoras.

## Technical Analysis

- `stores/gameStore.ts` calcula si un jugador puede evitar la bancarrota con `getEmergencyLiquidationValue` y `canPlayerAvoidBankruptcy`.
- `_checkBankruptcy` no elimina al jugador automaticamente si su patrimonio liquidable cubre la deuda.
- `components/GameOverlay.vue` cambia el boton principal a `Resolver deuda` cuando el jugador activo esta en negativo y el turno termino.
- `components/SidebarConfig.vue` contiene las acciones economicas necesarias:
  - Hipotecar todo lo disponible.
  - Vender mejoras por grupo.
  - Vender mejoras una a una.
  - Hipotecar propiedades individuales.
- `pages/game.vue` impide avanzar el turno si el jugador activo sigue con cash negativo.

## Implementation Plan

### Files to modify

- `stores/gameStore.ts`
- `components/GameOverlay.vue`
- `components/SidebarConfig.vue`
- `pages/game.vue`

### Ordered Steps

1. Agregar calculo de valor liquidable de emergencia:
   - Valor de hipotecas disponibles.
   - Reembolso por casas.
   - Reembolso por hoteles y casas subyacentes.
2. Cambiar `_checkBankruptcy` para diferir la bancarrota si el jugador puede cubrir la deuda.
3. Agregar `mortgageAllAvailable(playerId)` para hipotecar todas las propiedades legalmente hipotecables.
4. Mostrar `Resolver deuda` en el boton principal cuando el jugador activo esta en negativo.
5. Al pulsar `Resolver deuda`, abrir el sidebar de configuracion.
6. Enfocar automaticamente el boton mas relevante del sidebar, priorizando `Hipotecar todo`.
7. Agregar boton `Hipotecar todo` que no hipotecara propiedades con casas/hoteles ni grupos bloqueados por mejoras.
8. Mantener venta de mejoras:
   - Por grupo, usando las reglas balanceadas existentes.
   - Individual, una mejora a la vez.
9. Evitar `finishTurn` mientras el jugador activo siga en negativo.
10. Declarar bancarrota solo cuando el jugador no tenga activos suficientes para cubrir la deuda.

## Acceptance Criteria

- [x] Si un jugador queda negativo pero puede cubrir con activos, no quiebra automaticamente.
- [x] El boton principal muestra `Resolver deuda` en vez de avanzar turno.
- [x] El boton `Resolver deuda` tiene focus y puede activarse con teclado.
- [x] El sidebar se abre para permitir acciones economicas.
- [x] `Hipotecar todo` hipoteca solo propiedades legalmente hipotecables.
- [x] `Hipotecar todo` no hipoteca propiedades con casas/hoteles ni grupos bloqueados por mejoras.
- [x] El jugador puede vender casas/hoteles por grupo respetando reglas.
- [x] El jugador puede vender mejoras una a una respetando reglas.
- [x] El turno no avanza mientras el jugador siga con cash negativo.
- [x] El jugador quiebra solo si no puede cubrir la deuda con liquidacion legal.
- [x] `npm run build` pasa despues de los cambios.

## Notes

- La bancarrota se decide por capacidad real de liquidacion, no solamente por `cash < 0`.
- Las casas/hoteles no se hipotecan; primero se venden como mejoras y luego las propiedades quedan disponibles para hipoteca.
- El boton de deuda esta pensado como una puerta rapida al sidebar, no como una accion automatica para humanos.
