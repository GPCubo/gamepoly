---
id: SPEC-002
title: Persistencia PostgreSQL de partidas finalizadas y abandono de humanos en multiplayer
created_at: 2026-06-12T13:35:54
status: done
---

# SPEC-002: Persistencia PostgreSQL de partidas finalizadas y abandono de humanos en multiplayer

## Description

Implementar persistencia permanente en PostgreSQL para guardar los datos de una partida multijugador cuando la partida finaliza o cuando todos los jugadores humanos salen de la mesa. El guardado debe conservar un resumen de la partida, jugadores, ganador si existe, configuracion usada, estado final, historico economico, historico de movimientos por casillas y historico de tarjetas de Suerte/Arca Comunal.

La implementacion debe incluir la instalacion y configuracion de PostgreSQL en servidor, nuevas variables de entorno, migraciones SQL, conexion desde el backend Go y comandos documentados para operar la base de datos. La persistencia en Postgres debe ser permanente y separada del estado temporal de Redis.

## Context and Motivation

Actualmente el backend multijugador mantiene mesas activas en memoria con `backend/internal/table/manager.go` y `backend/internal/table/table.go`. Redis existe en `backend/internal/store/redis.go` para estado temporal, sesiones y lobby, pero no hay integracion real de PostgreSQL ni guardado permanente al terminar partidas.

`backend/DEPLOY.md` ya menciona PostgreSQL como una fase futura para persistencia al finalizar partidas. Esta spec convierte esa fase en un trabajo concreto: al emitir `game_over` o al detectar que todos los humanos abandonaron/desconectaron, el backend debe crear un registro durable que luego pueda consultarse para historicos, auditoria, rankings y pantallas futuras.

## Technical Analysis

El backend Go no tiene dependencia actual de PostgreSQL en `backend/go.mod`. Se debe agregar un driver, preferiblemente `github.com/jackc/pgx/v5/pgxpool`, para manejar conexiones con pool y `context.Context`. La configuracion debe salir de variables de entorno en `backend/cmd/server/main.go`.

Puntos de integracion principales:

- `backend/internal/table/table.go`: `checkGameOver()` es el punto donde hoy se emite `game_over` y se llama `t.Close()`. Antes de cerrar, debe persistir la partida una sola vez.
- `backend/internal/table/table.go`: `RemoveConn()` marca `slot.Conn = nil` y emite `player_disconnected`. Debe agregarse una deteccion de "sin humanos conectados" para cerrar/persistir cuando todos los humanos salieron.
- `backend/internal/table/manager.go`: puede necesitar recibir un servicio de persistencia o callback para que las mesas creadas tengan acceso al repositorio Postgres.
- `backend/internal/game/state.go`: `GameState` ya contiene jugadores, estado final, propietarios, desarrollos, bancarrotas, historicos y configuracion suficiente para construir el snapshot final.
- `backend/internal/game/history.go`: debe usarse como fuente para guardar eventos economicos, movimientos y tarjetas.
- `backend/internal/proto/messages.go`: no necesariamente cambia, salvo que se quiera emitir un evento informativo de "partida archivada".

Se debe evitar que la persistencia bloquee indefinidamente el goroutine de mesa. La operacion debe usar timeout, ser idempotente por `table_id` y tolerar reintentos. Si falla la base de datos, debe registrarse el error en logs sin panicar ni tumbar el servidor.

Modelo sugerido:

- `finished_games`: una fila por partida archivada.
- `finished_game_players`: una fila por jugador final.
- `finished_game_economic_events`: eventos de dinero.
- `finished_game_movements`: eventos de dados y movimiento entre casillas.
- `finished_game_cards`: tarjetas robadas y efecto registrado.

Variables de entorno nuevas:

```env
POSTGRES_DSN=postgres://gamepoly:CHANGE_ME@127.0.0.1:5432/gamepoly?sslmode=disable
POSTGRES_MAX_CONNS=10
POSTGRES_MIN_CONNS=1
POSTGRES_CONNECT_TIMEOUT_SECONDS=5
ENABLE_FINISHED_GAME_PERSISTENCE=true
```

Comandos base para servidor Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql --no-pager
```

Crear usuario y base de datos:

```bash
sudo -u postgres psql
```

Dentro de `psql`:

```sql
CREATE USER gamepoly WITH PASSWORD 'CAMBIA_ESTA_PASSWORD';
CREATE DATABASE gamepoly OWNER gamepoly;
GRANT ALL PRIVILEGES ON DATABASE gamepoly TO gamepoly;
\q
```

Probar conexion:

```bash
psql "postgres://gamepoly:CAMBIA_ESTA_PASSWORD@127.0.0.1:5432/gamepoly?sslmode=disable" -c "select now();"
```

Configurar variables en el servicio systemd:

```bash
sudo systemctl edit gamepoly-backend
```

Agregar:

```ini
[Service]
Environment=POSTGRES_DSN=postgres://gamepoly:CAMBIA_ESTA_PASSWORD@127.0.0.1:5432/gamepoly?sslmode=disable
Environment=POSTGRES_MAX_CONNS=10
Environment=POSTGRES_MIN_CONNS=1
Environment=POSTGRES_CONNECT_TIMEOUT_SECONDS=5
Environment=ENABLE_FINISHED_GAME_PERSISTENCE=true
```

Recargar y reiniciar:

```bash
sudo systemctl daemon-reload
sudo systemctl restart gamepoly-backend
sudo journalctl -u gamepoly-backend -f
```

## Implementation Plan

### Files to create

- `backend/internal/store/postgres.go` - conexion `pgxpool`, ping, cierre del pool y helpers de configuracion.
- `backend/internal/store/finished_games.go` - repositorio para guardar partidas finalizadas, jugadores y eventos historicos.
- `backend/internal/store/migrations/001_finished_games.sql` - migracion inicial de tablas e indices.
- `backend/internal/store/migrations.go` - runner simple de migraciones al iniciar, o adaptador para ejecutar migraciones versionadas.

### Files to modify

- `backend/go.mod` - agregar dependencia PostgreSQL `github.com/jackc/pgx/v5`.
- `backend/cmd/server/main.go` - leer variables de entorno, abrir Postgres, ejecutar migraciones y pasar el repositorio al manager.
- `backend/internal/table/manager.go` - aceptar dependencia opcional de persistencia y pasarla a cada `Table`.
- `backend/internal/table/table.go` - persistir una sola vez en `game_over`, en cierre por abandono total de humanos y opcionalmente en timeout de inactividad.
- `backend/internal/game/state.go` - agregar metadatos finales si falta `FinishedAt`, motivo de cierre o ganador serializable.
- `backend/DEPLOY.md` - documentar instalacion de PostgreSQL, variables nuevas, migraciones y comandos de verificacion.
- `.env.example` - agregar variables PostgreSQL si existe; crear si no existe.

### Ordered Steps

1. Agregar dependencia `pgx/v5` y crear `PostgresStore` con `NewPostgresStoreFromEnv`.
2. Definir migracion SQL para tablas de partidas finalizadas, jugadores y eventos.
3. Implementar runner de migraciones idempotente con tabla `schema_migrations`.
4. Crear `FinishedGameRepository.SaveFinishedGame(ctx, state, reason)` con transaccion.
5. Guardar snapshot completo de `GameState` como JSONB en `finished_games.final_state`.
6. Guardar tambien campos normalizados: `table_id`, `winner_player_id`, `finish_reason`, `started_at`, `finished_at`, `turn_count`, `created_at`.
7. Insertar jugadores finales con nombre, bot/humano, dificultad, cash final, casilla final, bancarrota y propiedades poseidas.
8. Insertar historicos economicos, movimientos y tarjetas desde las estructuras existentes del estado.
9. Modificar `Table` para tener bandera `persisted bool` protegida por mutex o confinada al goroutine de mesa.
10. En `checkGameOver()`, persistir antes de `t.Close()` con motivo `game_over`.
11. En `RemoveConn()`, detectar si no queda ningun humano conectado y enviar accion al goroutine de mesa para persistir/cerrar con motivo `all_humans_left`.
12. Revisar timeout de inactividad para decidir si tambien persiste con motivo `inactivity_timeout`.
13. Agregar logs claros para exito/fallo de persistencia.
14. Actualizar `backend/DEPLOY.md` con comandos de instalacion, configuracion y prueba de PostgreSQL.
15. Probar creando una partida, finalizandola y verificando filas con `psql`.

## Acceptance Criteria

- [x] El backend conecta a PostgreSQL usando `POSTGRES_DSN`.
- [x] Si `ENABLE_FINISHED_GAME_PERSISTENCE=true`, el backend guarda partidas finalizadas en Postgres.
- [x] Al emitirse `game_over`, se crea exactamente una fila en `finished_games`.
- [x] Si todos los jugadores humanos salen de la mesa, se guarda la partida con motivo `all_humans_left`.
- [x] El guardado es idempotente por `table_id` y no duplica partidas ante reintentos.
- [x] Se guardan jugadores finales, ganador, bancarrotas, propiedades, efectivo y estado final.
- [x] Se guardan historicos economicos, movimientos y tarjetas.
- [x] Si Postgres no esta disponible, el servidor no crashea y deja logs claros.
- [x] `backend/DEPLOY.md` contiene comandos para instalar PostgreSQL, crear DB/usuario, configurar variables y probar conexion.
- [x] Existe al menos una prueba manual documentada con `psql` para verificar los datos guardados.

## Notes

Redis debe seguir siendo para estado activo/temporal y PostgreSQL para archivo permanente. No se debe reemplazar Redis por Postgres en el flujo de tiempo real.

Para una primera version, guardar `final_state` como JSONB permite preservar toda la informacion aunque el esquema normalizado evolucione. Las tablas normalizadas se agregan para consultas rapidas de ranking, historico y auditoria.

La deteccion de "todos los humanos salieron" debe diferenciar humanos desconectados de bots. Una partida solo con bots podria continuar o cerrarse segun reglas futuras, pero esta spec se enfoca en mesas multijugador donde ya no queda ningun humano conectado.
