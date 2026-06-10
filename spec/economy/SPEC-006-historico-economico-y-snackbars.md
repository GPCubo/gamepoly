---
id: SPEC-006
title: Historico economico y snackbars
created_at: 2026-06-10T08:00:00
status: done
---

# SPEC-006: Historico economico y snackbars

## Description

Guardar un historico de eventos economicos importantes y mostrar cada evento nuevo como un SnackBar superior con detalles. El sidebar de configuracion debe incluir un boton para consultar el historico completo reciente.

## Context and Motivation

Durante una partida con bots, cartas, impuestos, alquileres e intercambios, el estado economico puede cambiar rapidamente. El usuario necesita entender por que alguien gano o perdio dinero sin depender solo del mensaje temporal del turno.

## Eventos registrados

El historico registra:

- Compra de propiedad.
- Propiedad ganada en subasta.
- Hipoteca individual o masiva.
- Ganancia de dinero por carta.
- Perdida de dinero por carta.
- Pago de impuesto.
- Pago de alquiler a otro jugador.
- Intercambio aceptado.

## Technical Analysis

- `stores/gameStore.ts` agrega:
  - `EconomicHistoryType`.
  - `EconomicHistoryItem`.
  - `economicHistory`.
  - `addEconomicHistory`.
  - Helpers para resumir lados de un intercambio.
- Los eventos se agregan desde las acciones del store, no desde componentes, para mantener una sola fuente de verdad.
- `components/GameOverlay.vue` observa el ultimo item del historico y muestra SnackBars desde la parte superior.
- `components/SidebarConfig.vue` agrega boton `Historico` y un panel con los items recientes.

## Implementation Plan

### Files to modify

- `stores/gameStore.ts`
- `components/GameOverlay.vue`
- `components/SidebarConfig.vue`

### Ordered Steps

1. Definir tipos de historico economico.
2. Agregar `economicHistory` al estado del store.
3. Resetear `economicHistory` en `setupGame`.
4. Crear `addEconomicHistory` para insertar items con id y fecha.
5. Registrar compras y subastas.
6. Registrar hipotecas individuales y masivas.
7. Registrar cartas que suman dinero.
8. Registrar cartas que restan dinero.
9. Registrar impuestos.
10. Registrar alquileres entre jugadores.
11. Registrar intercambios aceptados con resumen de propiedades y dinero.
12. Mostrar SnackBars superiores al llegar un item nuevo.
13. Limitar SnackBars visibles para evitar saturar pantalla.
14. Agregar boton `Historico` al sidebar.
15. Mostrar lista reciente de eventos con icono, titulo, detalle y monto.

## Acceptance Criteria

- [x] Cada compra queda registrada en el historico.
- [x] Cada subasta ganada queda registrada.
- [x] Cada hipoteca individual queda registrada.
- [x] `Hipotecar todo` registra un evento agrupado con detalle de propiedades.
- [x] Las cartas que entregan dinero registran ganancia.
- [x] Las cartas que cobran dinero registran perdida.
- [x] Los impuestos quedan registrados.
- [x] Los pagos de alquiler muestran pagador, receptor y saldos.
- [x] Los intercambios aceptados quedan registrados con detalle.
- [x] Cada evento nuevo muestra SnackBar superior.
- [x] Los SnackBars muestran detalles, no solo titulo.
- [x] El sidebar tiene boton `Historico`.
- [x] El panel de historico muestra eventos recientes.
- [x] `npm run build` pasa despues de los cambios.

## Notes

- El historico es de partida y se limpia al iniciar una partida nueva.
- Los SnackBars son una vista temporal; el sidebar conserva la consulta manual.
- Los eventos de intercambio se registran cuando se acepta, no cuando se propone.
