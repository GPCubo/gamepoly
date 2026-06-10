---
id: SPEC-002
title: Intercambios, carcel y deuda del Bot Dificil
created_at: 2026-06-10T08:00:00
status: done
---

# SPEC-002: Intercambios, carcel y deuda del Bot Dificil

## Description

Mejorar el comportamiento del Bot Dificil para que juegue con mas criterio economico: puede proponer intercambios utiles sin spamear ofertas, acepta intercambios cuando el balance le conviene, decide si pagar la carcel o quedarse, y resuelve deudas automaticamente cuando queda sin cash.

## Context and Motivation

El modo bots ya permitia automatizar turnos, compras, subastas, construccion y respuestas basicas. Faltaba que el Bot Dificil se comportara como un oponente mas creible:

- No debe proponer intercambios cada turno sin control.
- Debe aceptar ofertas segun valor estrategico, no por reglas demasiado simples.
- En carcel, a veces conviene quedarse si salir lo expone a rentas fuertes.
- Si queda con cash negativo, debe intentar cubrir su deuda igual que un humano antes de quebrar.

## Technical Analysis

- `composables/useBotEngine.ts` concentra las decisiones puras del bot.
- `composables/useBotTurn.ts` orquesta el timing, ejecuta acciones del store y evita que el usuario tenga que intervenir en turnos bot.
- `pages/game.vue` integra propuestas de intercambio iniciadas por bots:
  - Si el objetivo es humano, abre el modal normal para que responda.
  - Si el objetivo es bot, resuelve automaticamente la respuesta.
- `stores/gameStore.ts` sigue siendo la fuente de verdad para intercambios, hipotecas, mejoras, carcel y bancarrota.

## Implementation Plan

### Files to modify

- `composables/useBotEngine.ts`
- `composables/useBotTurn.ts`
- `pages/game.vue`
- `stores/gameStore.ts`

### Ordered Steps

1. Agregar evaluacion de valor para intercambios, separando valor entrante y saliente.
2. Ponderar grupos completos, grupos a una propiedad de completarse, ferrocarriles, servicios, propiedades hipotecadas, dinero neto y efectivo restante.
3. Hacer que el Bot Dificil proponga ofertas solo cuando:
   - Completa o se acerca a completar un grupo.
   - La ventaja estimada supera un minimo.
   - Conserva una reserva de cash.
4. Agregar cooldowns:
   - Cooldown general por bot.
   - Cooldown por par de jugadores.
   - Cooldown mas largo si una oferta fue aceptada.
5. Hacer que el Bot Dificil responda ofertas comparando ventaja y cash restante.
6. Cambiar decision de carcel del Bot Dificil:
   - Calcula peligro esperado de rentas segun posibles tiradas.
   - Calcula oportunidad de comprar propiedades libres al salir.
   - Considera si ya tiene monopolios y si el tablero sigue teniendo buenos objetivos.
7. Agregar resolucion automatica de deuda al finalizar acciones del bot.
8. Si el bot queda negativo:
   - Hipoteca todas las propiedades disponibles sin mejoras.
   - Vende mejoras por grupo respetando reglas.
   - Vende mejoras individuales si hace falta.
   - Vuelve a hipotecar propiedades que quedaron disponibles.
   - Si sigue negativo, declara bancarrota.
9. Cancelar turno extra pendiente si el bot quiebra.

## Acceptance Criteria

- [x] El Bot Dificil puede iniciar intercambios estrategicos.
- [x] El Bot Regular no inicia intercambios.
- [x] Las ofertas de bots tienen cooldown y no aparecen como spam constante.
- [x] El Bot Dificil no ofrece propiedades que rompen un grupo valioso propio sin una compensacion clara.
- [x] El Bot Dificil acepta una oferta solo si el balance le conviene y no lo deja sin cash peligroso.
- [x] Si un bot propone a un humano, el humano ve la oferta en el modal.
- [x] Si un bot propone a otro bot, la respuesta se resuelve automaticamente.
- [x] El Bot Dificil decide pagar fianza o quedarse en carcel segun peligro y oportunidad.
- [x] El Bot Regular conserva una regla de carcel simple.
- [x] Cuando un bot queda con cash negativo, intenta resolver la deuda sin intervencion humana.
- [x] Si no puede cubrir la deuda tras liquidar activos legales, el bot quiebra.
- [x] Si el bot quiebra, no conserva turno extra por dobles.
- [x] `npm run build` pasa despues de los cambios.

## Notes

- La estrategia de deuda usa las mismas acciones legales del store que usa el humano; el bot no salta reglas.
- Para emergencia, se prefiere hipotecar propiedades ya disponibles antes de vender casas/hoteles, porque preserva mejoras cuando es posible.
- La resolucion de deuda ocurre antes de construir/intercambiar y tambien despues de la fase de gestion del bot.
- Los delays se mantienen para que el usuario pueda leer que esta haciendo el bot.
