# Specs — GamePoly Web

Índice de todas las especificaciones del proyecto, organizadas por módulo.  
Cada spec documenta qué se construyó, por qué y cómo verificarlo.

Genera una nueva spec con:
```bash
node scripts/gen-spec.js "Título del cambio"
```
El script detecta el próximo ID **dentro del directorio raíz** (`spec/SPEC-NNN-...`).  
Después de generarla, muévela a la carpeta correspondiente y renúmera si es necesario.

---

## Carpetas

| Carpeta | Área | Specs |
|---|---|---|
| [`board/`](#board) | Tablero 3D, casillas, modelos | 4 |
| [`bot/`](#bot) | IA de bots (Regular / Difícil) | 4 |
| [`cards/`](#cards) | Cartas Suerte y Arca Comunal | 0 |
| [`dados/`](#dados) | Visualización y animación de dados | 5 |
| [`economy/`](#economy) | Compra, alquiler, hipotecas, subasta, deuda | 7 |
| [`gameoverlay/`](#gameoverlay) | HUD, sidebar, mapa, histórico | 8 |
| [`server/`](#server) | Despliegue, SSH, nginx, systemd, SSL | 1 |
| [`multiplayer/`](#multiplayer) | Backend Go, WebSocket, multi-mesa | 1 |
| [`player/`](#player) | Fichas, animación, cámara, configuración | 11 |
| [`settings/`](#settings) | Reglas de partida, semillas de debug | 3 |

---

## board

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./board/SPEC-001-tarjetas-de-casilla-al-caer---overlay-css-con-info-de-la-casilla.md) | Tarjetas de casilla al caer — overlay CSS con info de la casilla | ✅ done |
| [SPEC-002](./board/SPEC-002-etiquetas-propiedades-tablero-3d.md) | Etiquetas propiedades tablero 3D | ✅ done |
| [SPEC-003](./board/SPEC-003-modelos-3d-detallados-de-casas-y-hoteles.md) | Modelos 3D detallados de casas y hoteles | ✅ done |
| [SPEC-004](./board/SPEC-004-casas-con-offsets-locales-hacia-el-centro.md) | Casas con offsets locales hacia el centro | ✅ done |

---

## bot

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./bot/SPEC-001-modo-bots-regular-y-dificil.md) | Modo bots Regular y Difícil | ✅ done |
| [SPEC-002](./bot/SPEC-002-intercambios-carcel-y-deuda-del-bot-dificil.md) | Intercambios, cárcel y deuda del bot Difícil | ✅ done |
| [SPEC-003](./bot/SPEC-003-intercambio-bot-a-bot-con-modal-espectador.md) | Intercambio bot-a-bot con modal espectador | ✅ done |
| [SPEC-004](./bot/SPEC-004-partidas-solo-bots-sin-jugador-humano.md) | Partidas solo bots sin jugador humano | ✅ done |

---

## cards

_Sin specs aún. Área reservada para cartas Suerte y Arca Comunal._

---

## dados

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./dados/SPEC-001-dados-2d-con-css-gameplay.md) | Dados 2D con CSS gameplay | ✅ done |
| [SPEC-002](./dados/SPEC-002-rediseno-dado-2d-con-animacion.md) | Rediseño dado 2D con animación | ✅ done |
| [SPEC-003](./dados/SPEC-003-correccion-visual-puntos-dado.md) | Corrección visual puntos dado | ✅ done |
| [SPEC-004](./dados/SPEC-004-dados-dobles-2-dados-horizontales-arriba.md) | Dados dobles — 2 dados horizontales arriba | ✅ done |
| [SPEC-005](./dados/SPEC-005-mover-el-dado-debajo-del-boton-ver-historico.md) | Mover el dado debajo del botón "Ver Histórico" | ✅ done |

---

## economy

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./economy/SPEC-001-economia-del-juego---compra-subasta-alquiler-quiebra-y-condicion-de-victoria.md) | Economía del juego — compra, subasta, alquiler, quiebra y condición de victoria | ✅ done |
| [SPEC-002](./economy/SPEC-002-intercambio-de-propiedades-y-dinero.md) | Intercambio de propiedades y dinero | ✅ done |
| [SPEC-003](./economy/SPEC-003-casas-hoteles-hipotecas-y-alquiler-desarrollado.md) | Casas, hoteles, hipotecas y alquiler desarrollado | ✅ done |
| [SPEC-004](./economy/SPEC-004-precio-de-construccion-por-propiedad-y-alquiler-escalado-exponencial.md) | Precio de construcción por propiedad y alquiler escalado exponencial | ✅ done |
| [SPEC-005](./economy/SPEC-005-resolucion-de-deuda-y-bancarrota-manual.md) | Resolución de deuda y bancarrota manual | ✅ done |
| [SPEC-006](./economy/SPEC-006-historico-economico-y-snackbars.md) | Histórico económico y snackbars | ✅ done |
| [SPEC-007](./economy/SPEC-007-deshabilitar-botones-subasta-hasta-turno-del-usuario.md) | Deshabilitar botones de subasta hasta el turno del usuario | ✅ done |

---

## gameoverlay

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./gameoverlay/SPEC-001-centralizar-variables-gameoverlay-pinia.md) | Centralizar variables GameOverlay → Pinia | ✅ done |
| [SPEC-002](./gameoverlay/SPEC-002-instalar-gameoverlay-vue.md) | Instalar GameOverlay.vue | ✅ done |
| [SPEC-003](./gameoverlay/SPEC-003-casilla-normalizada-posicion-1-40.md) | Casilla normalizada posición 1–40 | ✅ done |
| [SPEC-004](./gameoverlay/SPEC-004-focus-navegacion-teclado-botones-accion.md) | Focus y navegación teclado en botones de acción | ✅ done |
| [SPEC-005](./gameoverlay/SPEC-005-reconfiguracion-botones-sidebar-configuracion.md) | Reconfiguración botones sidebar configuración | ✅ done |
| [SPEC-006](./gameoverlay/SPEC-006-gestion-de-propiedades-desde-sidebar.md) | Gestión de propiedades desde sidebar | ✅ done |
| [SPEC-007](./gameoverlay/SPEC-007-croquis-con-iconos-de-propietario.md) | Croquis con iconos de propietario | ✅ done |
| [SPEC-008](./gameoverlay/SPEC-008-boton-ver-historico-fuera-del-mapa-con-dialog-de-historial-completo.md) | Botón "Ver Histórico" fuera del mapa con dialog de historial completo | ✅ done |

---

## server

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./server/SPEC-001-despliegue-servidor-tarragona.md) | Despliegue servidor Tarragona (gamepoly.chamvea.dev) | ✅ done |

---

## multiplayer

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./multiplayer/SPEC-001-arquitectura-multijugador-multimesa-en-tiempo-real.md) | Arquitectura multijugador multi-mesa en tiempo real | 🔄 in-progress |

**Fases pendientes de SPEC-001:**
- Fase 2 — Persistencia PostgreSQL (`backend/internal/store/postgres.go`)
- Fase 3 — Redis pub/sub multi-servidor (`backend/internal/table/broadcast.go`)
- Fase 4 — Cuentas, estadísticas, spectators

Ver [`backend/DEPLOY.md`](../backend/DEPLOY.md) para instrucciones de despliegue del servidor Go.

---

## player

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./player/SPEC-001-agregar-dedal-al-tablero.md) | Agregar dedal al tablero | ✅ done |
| [SPEC-002](./player/SPEC-002-board-geometry-por-jugador.md) | Board geometry por jugador | ✅ done |
| [SPEC-003](./player/SPEC-003-boton-siguiente-al-terminar-movimiento.md) | Botón "Siguiente" al terminar movimiento | ✅ done |
| [SPEC-004](./player/SPEC-004-cambio-de-turno-camara-reajuste.md) | Cambio de turno — cámara reajuste | ✅ done |
| [SPEC-005](./player/SPEC-005-trayecto-unico-mismo-camino.md) | Trayecto único por el mismo camino | ✅ done |
| [SPEC-006](./player/SPEC-006-animacion-salto-por-casilla.md) | Animación salto por casilla | ✅ done |
| [SPEC-007](./player/SPEC-007-camara-orbital-bordeando-tablero.md) | Cámara orbital bordeando tablero | ✅ done |
| [SPEC-008](./player/SPEC-008-separacion-fichas-misma-casilla.md) | Separación fichas en misma casilla | ✅ done |
| [SPEC-009](./player/SPEC-009-animacion-crecimiento-casilla-libre.md) | Animación crecimiento casilla libre | ✅ done |
| [SPEC-010](./player/SPEC-010-configuracion-multiples-jugadores.md) | Configuración múltiples jugadores | ✅ done |
| [SPEC-011](./player/SPEC-011-color-por-ficha-badge-moneda-tilecard.md) | Color por ficha — badge moneda TileCard | ✅ done |

---

## settings

| ID | Título | Estado |
|---|---|---|
| [SPEC-001](./settings/SPEC-001-configuracion-cash-y-variables-de-juego.md) | Configuración cash y variables de juego | ✅ done |
| [SPEC-002](./settings/SPEC-002-semillas-locales-reusables-por-parametros-url.md) | Semillas locales reusables por parámetros URL | ✅ done |
| [SPEC-003](./settings/SPEC-003-semilla-local-de-resolucion-de-deuda.md) | Semilla local de resolución de deuda | ✅ done |

---

## Leyenda

| Símbolo | Estado |
|---|---|
| 📝 `draft` | Redactada, pendiente de implementación |
| 🔄 `in-progress` | Parcialmente implementada — ver criterios bloqueados en el archivo |
| ✅ `done` | Todos los criterios de aceptación cumplidos |
