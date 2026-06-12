---
id: SPEC-006
title: Deuda recuperable antes de bancarrota en multiplayer
created_at: 2026-06-12T13:23:44
status: done
---

# SPEC-006: Deuda recuperable antes de bancarrota en multiplayer

## Description

En modo multijugador, cuando un jugador cae en una casilla o recibe una tarjeta que le deja el dinero en negativo, no debe ser declarado en bancarrota de inmediato si todavia puede sanar la deuda vendiendo casas, vendiendo hoteles o hipotecando propiedades. El flujo debe comportarse como el modo local en `pages/game.vue` y `stores/gameStore.ts`: si el jugador tiene patrimonio liquidable suficiente, la partida debe bloquear el avance normal hasta que resuelva la deuda, mostrando acciones disponibles de gestion economica. Solo debe quedar en bancarrota cuando su efectivo mas el valor de liquidacion de emergencia no alcance para cubrir la deuda.

El caso aplica para deudas generadas por alquileres, impuestos, tarjetas de Suerte, tarjetas de Arca Comunal, casillas especiales y cualquier otro pago que deje el saldo bajo cero en multiplayer.

## Context and Motivation

El modo local ya permite recuperarse de una deuda si el jugador puede vender mejoras o hipotecar propiedades. En multiplayer, el backend Go es la fuente de verdad y actualmente puede avanzar o emitir eventos de bancarrota sin garantizar que el jugador humano tenga una oportunidad clara de liquidar activos desde `pages/multiplayer/game.vue`.

Esto es importante porque en Monopoly la bancarrota no ocurre simplemente por tener saldo negativo: ocurre cuando el jugador no puede pagar ni siquiera liquidando propiedades y mejoras permitidas. En una partida multijugador, una declaracion de bancarrota prematura elimina jugadores injustamente y desincroniza la expectativa visual del frontend con la regla de negocio.

## Technical Analysis

El modo local contiene el patron a reutilizar en `stores/gameStore.ts`: `getEmergencyLiquidationValue`, `canPlayerAvoidBankruptcy` y `_checkBankruptcy` calculan si el jugador puede cubrir deuda con venta de mejoras e hipotecas. Si puede, se muestra un mensaje de deuda y no se llama a `declareBankruptcy`.

El backend multiplayer ya tiene piezas equivalentes en `backend/internal/game/engine.go`: `checkBankruptcy`, `CanPlayerAvoidBankruptcy` y `EmergencyLiquidationValue`. La especificacion debe validar que todas las rutas que descuentan dinero llamen a `checkBankruptcy` despues del pago, pero que `DeclareBankruptcy` solo se ejecute cuando `CanPlayerAvoidBankruptcy` sea falso. Tambien debe revisar el flujo de `backend/internal/table/table.go`, porque ahi se procesan acciones websocket como `roll`, `buy`, `auction`, `build_house`, `build_hotel`, `sell_improvement`, `mortgage`, `unmortgage` y se emiten eventos como `player_bankrupt`.

En frontend, `pages/multiplayer/game.vue` ya muestra acciones de propiedades: vender mejoras, hipotecar, hipotecar todo y gestionar grupos. Ese panel debe quedar disponible cuando el jugador activo tenga efectivo negativo recuperable. El boton de siguiente turno o cualquier accion de avance debe quedar bloqueado mientras `myPlayer.cash < 0` y `mpStore.isBankrupt(myPlayer.id)` sea falso. La UI debe explicar que hay una deuda pendiente y que se puede resolver vendiendo mejoras o hipotecando.

`stores/multiplayerStore.ts` solo refleja el estado recibido desde el servidor, por lo que no debe decidir bancarrota por su cuenta. Si se necesita exponer helpers calculados para la UI, deben derivarse del `state`, `propertyOwners` y `propertyDevelopments`, pero la fuente final debe seguir siendo el backend.

Riesgos principales:

- Declarar bancarrota desde una ruta de backend que no use `checkBankruptcy`.
- Permitir `finish_turn` o `next` con saldo negativo recuperable.
- Calcular distinto el valor de liquidacion entre local y multiplayer.
- Que el bot dificil liquide automaticamente mientras un humano necesita resolver manualmente.
- Que el frontend oculte acciones de hipoteca/venta por no estar en el turno esperado, dejando al jugador atrapado.

## Implementation Plan

### Files to create

- Ninguno.

### Files to modify

- `backend/internal/game/engine.go` - asegurar que toda deuda use `checkBankruptcy`, que la bancarrota solo ocurra si no hay liquidacion suficiente, y exponer estado/mensaje de deuda recuperable si hace falta.
- `backend/internal/game/validators.go` - impedir finalizar turno o ejecutar acciones no permitidas mientras el jugador tenga saldo negativo recuperable.
- `backend/internal/table/table.go` - revisar handlers websocket, broadcasts de bancarrota y bloqueo de avance para jugadores con deuda pendiente.
- `backend/internal/proto/messages.go` - agregar payload/evento de deuda pendiente si el frontend necesita una senal explicita.
- `stores/multiplayerStore.ts` - agregar helpers derivados para deuda pendiente y valor liquidable si la UI lo necesita.
- `pages/multiplayer/game.vue` - mostrar estado de deuda, habilitar gestion de venta/hipoteca y deshabilitar avance hasta resolver.
- `stores/gameStore.ts` - usar como referencia de comportamiento; modificar solo si se extrae una utilidad compartida frontend.

### Ordered Steps

1. Auditar todas las rutas de pago en `backend/internal/game/engine.go`: alquiler, impuestos, tarjetas, carcel, compras, subastas, intercambios y pagos especiales.
2. Confirmar que cada ruta que puede dejar `Cash < 0` llama a `checkBankruptcy`.
3. Ajustar `checkBankruptcy` para que, cuando el jugador puede recuperarse, deje un `StatusMessage` claro y no emita bancarrota.
4. Agregar o reforzar validacion de turno para que un jugador con deuda negativa recuperable no pueda terminar turno hasta tener `Cash >= 0`.
5. Revisar `backend/internal/table/table.go` para que `player_bankrupt` solo se emita si `State.IsBankrupt(playerID)` despues de resolver liquidacion posible.
6. Asegurar que las acciones `sell_improvement`, `mortgage` y `mortgage all` puedan ejecutarse durante el estado de deuda pendiente.
7. Ajustar `pages/multiplayer/game.vue` para mostrar una indicacion visible de deuda pendiente y abrir/dirigir al jugador al panel de propiedades.
8. Bloquear botones de siguiente turno, tirar dados y acciones de avance mientras exista deuda pendiente.
9. Verificar que bots puedan resolver deuda con la logica existente de hipoteca de emergencia y que humanos queden en control manual.
10. Probar casos de tarjeta, impuesto, alquiler y casilla especial que dejan saldo negativo con y sin patrimonio suficiente.

## Acceptance Criteria

- [x] Si un jugador multiplayer queda con saldo negativo pero puede cubrirlo vendiendo mejoras o hipotecando, no se emite `player_bankrupt`.
- [x] El jugador con deuda recuperable ve un mensaje claro de deuda pendiente.
- [x] El jugador puede vender casas, vender hoteles, hipotecar propiedades o usar hipotecar todo para recuperar efectivo.
- [x] El turno no puede finalizar mientras el jugador tenga saldo negativo y no este declarado en bancarrota.
- [x] Si despues de calcular efectivo mas liquidacion de emergencia no alcanza para cubrir la deuda, el jugador si queda en bancarrota.
- [x] Las tarjetas de Suerte y Arca Comunal que generan pagos respetan la misma regla.
- [x] Las casillas de impuestos, alquileres y pagos especiales respetan la misma regla.
- [x] El comportamiento coincide con el flujo local implementado en `pages/game.vue` y `stores/gameStore.ts`.
- [x] El estado se mantiene sincronizado para todos los clientes conectados.
- [ ] Hay prueba manual o automatizada para deuda recuperable y deuda irrecuperable en multiplayer. *(blocked: requiere Go toolchain disponible para ejecutar go test)*

## Notes

La solucion preferida es mantener la decision de bancarrota en backend, porque multiplayer usa el servidor como autoridad. El frontend solo debe reflejar y facilitar la resolucion de deuda. No se debe duplicar una regla divergente en Vue salvo para calculos visuales o ayudas de UI.

El flujo local debe servir como referencia funcional, pero no conviene mover toda la logica al frontend multiplayer porque abriria inconsistencias entre clientes. Si se agrega un evento de deuda pendiente, debe ser informativo y no sustituir la validacion del servidor.
