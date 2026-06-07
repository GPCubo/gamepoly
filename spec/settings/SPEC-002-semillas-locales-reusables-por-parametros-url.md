---
id: SPEC-002
title: Semillas locales reusables por parametros URL
created_at: 2026-06-06T10:39:15
status: done
---

# SPEC-002: Semillas locales reusables por parametros URL

## Description

Permitir configurar escenarios de prueba al iniciar una partida usando semillas reutilizables activadas por parametros en la URL, solo cuando la app corre en local. Cada semilla debe declararse en un registro central para que futuras pruebas se agreguen sin duplicar condicionales en la pantalla de inicio.

La primera semilla implementada es `allproperties=true`, que asigna todas las propiedades al jugador activo y fija su dinero en `$100000` al iniciar la partida.

Ejemplo:

`http://localhost:3000/?allproperties=true`

## Context and Motivation

Probar reglas economicas como casas, hoteles, venta de mejoras e hipotecas puede tomar mucho tiempo si los jugadores deben comprar propiedades de forma natural. Las semillas locales aceleran pruebas manuales sin afectar produccion ni partidas normales.

El sistema debe ser reutilizable porque se usara para muchas pruebas futuras: partidas con propiedades hipotecadas, jugadores con hoteles, estados de bancarrota, turnos en carcel, combinaciones de efectivo inicial, etc.

Esta spec complementa settings/SPEC-001, que configura variables de partida antes de iniciar.

## Technical Analysis

- `pages/index.vue` es el punto correcto para leer la URL porque la partida se configura alli antes de navegar a `/game`.
- `config/localScenarioSeeds.ts` centraliza el registro de semillas locales disponibles.
- Cada semilla declara:
  - `key` - identificador interno estable.
  - `queryParam` - parametro URL que documenta como se activa.
  - `description` - descripcion humana de lo que prepara.
  - `isEnabled(params)` - regla de activacion.
  - `apply(context)` - mutacion que prepara el estado de partida.
- La activacion debe ser local-only para evitar que parametros externos modifiquen partidas en produccion.
- La deteccion local usa `window.location.hostname` y permite:
  - `localhost`
  - `127.0.0.1`
  - `::1`
  - `[::1]`
- `applyLocalScenarioSeeds(params, store)` recorre todas las semillas registradas y aplica las que esten habilitadas.
- `store.seedAllPropertiesForActivePlayer(100000)` asigna todas las propiedades comprables al jugador activo.
- La semilla fija el dinero del jugador activo exactamente en `$100000`.
- Cada propiedad asignada inicializa su `PropertyDevelopmentState`.

## Implementation Plan

### Files to create

- `config/localScenarioSeeds.ts` - Registro reusable de semillas locales, helpers de activacion y aplicador comun.

### Files to modify

- `pages/index.vue` - Leer parametros de URL local antes de navegar a `/game`.
- `stores/gameStore.ts` - Agregar `seedAllPropertiesForActivePlayer` para asignar propiedades y dinero de prueba.

### Ordered Steps

1. Agregar accion `seedAllPropertiesForActivePlayer`.
2. En la accion, tomar el jugador activo.
3. Fijar el dinero del jugador activo en `$100000`.
4. Asignar todas las propiedades comprables al jugador activo.
5. Inicializar desarrollo para cada propiedad asignada.
6. Crear `config/localScenarioSeeds.ts`.
7. Declarar `LocalScenarioSeed`, `LocalScenarioSeedContext` y `LOCAL_SCENARIO_SEEDS`.
8. Registrar la semilla `all-properties` para el parametro `allproperties=true`.
9. Agregar `applyLocalScenarioSeeds` para aplicar cualquier semilla habilitada.
10. En `pages/index.vue`, agregar `isLocalGameUrl`.
11. Despues de `store.setupGame`, ejecutar `applyLocalScenarioSeeds` solo si la URL es local.
12. Navegar a `/game` como flujo normal.
13. Verificar manualmente la ruta local con `?allproperties=true`.

## Acceptance Criteria

- [x] El parametro `allproperties=true` solo se aplica en entorno local.
- [x] Sin el parametro, la partida inicia normal.
- [x] Con el parametro, el jugador activo recibe todas las propiedades comprables.
- [x] Con el parametro, el jugador activo queda con `$100000`.
- [x] Las propiedades asignadas quedan disponibles para construir casas.
- [x] Las propiedades asignadas aparecen en el sidebar de gestion.
- [x] Las semillas se declaran en un registro reusable.
- [x] Agregar una nueva semilla no requiere crear otro `if` en `pages/index.vue`.
- [x] La app navega a `/game` despues de aplicar el escenario.
- [x] La build de Nuxt pasa despues del cambio.

## Notes

- Los parametros estan pensados para pruebas manuales, no para gameplay de produccion.
- La URL de ejemplo debe abrirse en la pantalla de configuracion antes de iniciar partida.
- El mensaje superior puede cambiar al entrar al tablero, pero el estado sembrado queda reflejado en `propertyOwners` y en el sidebar.
- Nuevos escenarios deben agregarse en `LOCAL_SCENARIO_SEEDS` y, si necesitan mutar estado complejo, exponer una accion especifica en `gameStore.ts`.
- El nombre "semilla" se usa como concepto de testing: prepara un estado inicial reproducible para validar reglas o UI.
