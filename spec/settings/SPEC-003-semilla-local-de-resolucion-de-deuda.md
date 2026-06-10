---
id: SPEC-003
title: Semilla local de resolucion de deuda
created_at: 2026-06-10T08:00:00
status: done
---

# SPEC-003: Semilla local de resolucion de deuda

## Description

Agregar una semilla local para probar escenarios de deuda sin tener que construir manualmente una partida avanzada. La semilla se activa con `debt=true` y prepara un estado donde el jugador activo esta en negativo, tiene propiedades hipotecables, grupos con mejoras y una obligacion economica reciente.

## Context and Motivation

La resolucion de deuda tiene varias ramas:

- Hipotecar propiedades sin mejoras.
- Vender casas/hoteles por grupo.
- Vender mejoras una a una.
- Evitar avanzar turno mientras hay cash negativo.
- Declarar bancarrota solo si no hay activos suficientes.

Probar todo eso desde una partida normal toma demasiado tiempo. Una semilla reproducible permite validar rapidamente el flujo manual.

## Technical Analysis

- `config/localScenarioSeeds.ts` registra la semilla `debt`.
- `stores/gameStore.ts` expone `seedDebtResolutionScenario`.
- La semilla solo aplica en entorno local, igual que `allproperties=true` y `allhotels=true`.
- La URL de prueba es:

`http://127.0.0.1:3001/?debt=true`

Tambien puede usarse el puerto local que este activo:

`http://localhost:3000/?debt=true`

## Scenario State

La semilla prepara:

- Jugador activo con cash negativo.
- Turno marcado como completo para mostrar `Resolver deuda`.
- Propiedades sueltas hipotecables.
- Un grupo con casas.
- Un grupo con hoteles.
- Otro jugador con propiedades desarrolladas para simular presion de renta.

## Implementation Plan

### Files to modify

- `config/localScenarioSeeds.ts`
- `stores/gameStore.ts`

### Ordered Steps

1. Agregar accion `seedDebtResolutionScenario` al store.
2. Fijar el jugador activo y su cash negativo.
3. Marcar `isTurnComplete = true`.
4. Asignar propiedades hipotecables al jugador activo.
5. Asignar grupo con casas al jugador activo.
6. Asignar grupo con hoteles al jugador activo.
7. Asignar grupo desarrollado a un oponente.
8. Registrar la semilla `debt` en `LOCAL_SCENARIO_SEEDS`.
9. Activarla con `debt=true` solo en local.
10. Probar que al iniciar partida aparece el flujo de `Resolver deuda`.

## Acceptance Criteria

- [x] `debt=true` solo aplica en local.
- [x] Sin el parametro, la partida inicia normal.
- [x] Con el parametro, el jugador activo inicia con cash negativo.
- [x] El boton principal muestra `Resolver deuda`.
- [x] El sidebar permite hipotecar propiedades disponibles.
- [x] El sidebar permite vender mejoras por grupo.
- [x] El sidebar permite vender mejoras individuales.
- [x] El jugador no puede avanzar turno hasta cubrir la deuda.
- [x] La semilla vive en el registro reusable de semillas locales.
- [x] `npm run build` pasa despues del cambio.

## Notes

- Esta semilla es para pruebas manuales, no para produccion.
- Si el puerto local cambia, el parametro sigue siendo el mismo: `?debt=true`.
- El objetivo no es simular una partida real completa, sino cubrir rapidamente las ramas de deuda.
