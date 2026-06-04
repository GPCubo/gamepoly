---
name: gen-spec
description: Generate spec files in ./spec/ following the folder-scoped SPEC-NNN-kebab-title.md format. Each subfolder has its own sequential counter starting at 001. Use when the user asks to create a spec document.
---

# gen-spec Skill

Generate specification files in the `./spec/` directory following the standard format with **per-subfolder sequential numbering**.

## Spec Directory Structure

Specs are organized into subfolders by module/domain under `./spec/`:

```
spec/
  board/          → SPEC-001, SPEC-002, ...
  dados/          → SPEC-001, SPEC-002, ...
  economy/        → SPEC-001, SPEC-002, ...
  gameoverlay/    → SPEC-001, SPEC-002, ...
  player/         → SPEC-001, SPEC-002, ...
  settings/       → SPEC-001, SPEC-002, ...
  (new-subfolder)/ → SPEC-001, ...
```

**Each subfolder has its own independent counter starting at 001.** There is no global numbering — `board/SPEC-002` and `dados/SPEC-002` are different specs.

## Spec Format

Every spec file follows this exact structure:

```markdown
---
id: SPEC-NNN
title: Exact title from user input
created_at: YYYY-MM-DDTHH:MM:SS
status: draft
---

# SPEC-NNN: Title

## Description

## Context and Motivation

## Technical Analysis

## Implementation Plan

### Files to create

### Files to modify

### Ordered Steps

1.
2.

## Acceptance Criteria

- [ ]
- [ ]

## Notes
```

## Steps to Generate

### Step 1 - Determine the subfolder

Ask the user which module the spec belongs to, or infer it from the topic:

| Topic keywords           | Subfolder     |
|--------------------------|---------------|
| tablero, casilla, tile, board | `board/`    |
| dado, dice, roll         | `dados/`      |
| economía, compra, alquiler, dinero, auction, bankruptcy | `economy/` |
| overlay, UI, GameOverlay, buttons | `gameoverlay/` |
| ficha, jugador, player, movimiento, cámara, turn | `player/`  |
| configuración, settings, game config | `settings/` |

If the topic does not match any existing subfolder, create a new one with a descriptive kebab-case name.

### Step 2 - Determine next ID

1. Read the `./spec/{subfolder}/` directory.
2. Look for files matching `SPEC-NNN-*.md`.
3. Extract the highest number found in that subfolder and increment by 1.
4. If the subfolder is empty or has no matching files, ID is `001`.
5. Always format with 3 digits: `001`, `002`, `023`, `100`.

### Step 3 - Build filename

- Take the title from user input.
- Convert to kebab-case (lowercase, spaces → hyphens, no special chars).
- Final name: `SPEC-NNN-kebab-title.md`
- Path: `./spec/{subfolder}/SPEC-NNN-kebab-title.md`

### Step 4 - Write the spec file

Use current timestamp (ISO 8601 format: `YYYY-MM-DDTHH:MM:SS`) and create the file with this exact structure:

```markdown
---
id: SPEC-NNN
title: { Exact title from user input }
created_at: { ISO timestamp }
status: draft
---

# SPEC-NNN: {Title}

## Description

{Explain in detail what is to be built or solved, including all additional data provided by the user.}

## Context and Motivation

{Why this functionality is needed. What problem it solves. Which module or flow of the system it belongs to (GAME, CAE, SGA, EPIS, STAFF, etc.).}

## Technical Analysis

{Deep analysis: dependencies, project patterns to reuse, affected components, technical risks or restrictions. Reference concrete project files and classes when relevant.}

## Implementation Plan

### Files to create

- `path/file.ext` - description

### Files to modify

- `path/file.ext` - what changes and why

### Ordered Steps

1. ...
2. ...

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Notes

{Design decisions, discarded alternatives, external dependencies if any.}
```

### Step 5 - Confirm

After creating the file, respond with a single line:
`✔ Spec created: ./spec/{subfolder}/SPEC-NNN-kebab-title.md`

## Cross-references

When referencing other specs from within a spec, always use the **folder/NNN** format to avoid ambiguity:

- ✅ `board/SPEC-001` — unambiguous reference to a spec in the board subfolder
- ✅ `player/SPEC-006` — unambiguous reference to a spec in the player subfolder
- ❌ `SPEC-001` — ambiguous since multiple subfolders could have the same number

## Existing specs (as of last reorganization)

| Subfolder   | File                                                                           | ID       | Title                                                                   |
|-------------|--------------------------------------------------------------------------------|----------|-------------------------------------------------------------------------|
| board       | SPEC-001-tarjetas-de-casilla-al-caer---overlay-css-con-info-de-la-casilla.md   | SPEC-001 | Tarjetas de casilla al caer - overlay CSS con info de la casilla       |
| board       | SPEC-002-etiquetas-propiedades-tablero-3d.md                                  | SPEC-002 | Etiquetas de propiedades en tablero 3D                                 |
| dados       | SPEC-001-dados-2d-con-css-gameplay.md                                         | SPEC-001 | Dados 2D con CSS — Gameplay                                            |
| dados       | SPEC-002-rediseno-dado-2d-con-animacion.md                                    | SPEC-002 | Rediseño Dado 2D con Animación                                        |
| dados       | SPEC-003-correccion-visual-puntos-dado.md                                     | SPEC-003 | Corrección Visual Puntos Dado 2D                                       |
| dados       | SPEC-004-dados-dobles-2-dados-horizontales-arriba.md                         | SPEC-004 | Dados Dobles — 2 Dados Horizontales Arriba con Suma                    |
| economy     | SPEC-001-economia-del-juego---compra-subasta-alquiler-quiebra-y-condicion-de-victoria.md | SPEC-001 | Economía del juego — compra, subasta, alquiler, quiebra y condición de victoria |
| gameoverlay | SPEC-001-centralizar-variables-gameoverlay-pinia.md                           | SPEC-001 | Centralizar Variables de GameOverlay.vue en Pinia                      |
| gameoverlay | SPEC-002-instalar-gameoverlay-vue.md                                          | SPEC-002 | Instalación de GameOverlay.vue en pages/index.vue                      |
| gameoverlay | SPEC-003-casilla-normalizada-posicion-1-40.md                               | SPEC-003 | Casilla Normalizada — Posición 1-40 en la UI                           |
| player      | SPEC-001-agregar-dedal-al-tablero.md                                          | SPEC-001 | Agregar Dedal al Tablero                                               |
| player      | SPEC-002-board-geometry-por-jugador.md                                       | SPEC-002 | Board Geometry por Jugador — Cada Jugador con su useBoardGeometry      |
| player      | SPEC-003-boton-siguiente-al-terminar-movimiento.md                           | SPEC-003 | Botón Siguiente — Aparece al Terminar Movimiento                       |
| player      | SPEC-004-cambio-de-turno-camara-reajuste.md                                  | SPEC-004 | Cambio de Turno — Cámara se Reajusta al Siguiente Jugador              |
| player      | SPEC-005-trayecto-unico-mismo-camino.md                                       | SPEC-005 | Trayecto Único — Fichas Comparten el Mismo Camino                      |
| player      | SPEC-006-animacion-salto-por-casilla.md                                      | SPEC-006 | Animación de Salto por Casilla para Fichas                             |
| player      | SPEC-007-camara-orbital-bordeando-tablero.md                                 | SPEC-007 | Cámara Orbital Bordeando el Tablero                                    |
| player      | SPEC-008-separacion-fichas-misma-casilla.md                                  | SPEC-008 | Separación de Fichas en Misma Casilla y Escala Reducida               |
| player      | SPEC-009-animacion-crecimiento-casilla-libre.md                              | SPEC-009 | Animación de Crecimiento al Llegar a Casilla Libre                     |
| player      | SPEC-010-configuracion-multiples-jugadores.md                                | SPEC-010 | Configuración de Múltiples Jugadores con Fichas Seleccionables         |
| settings    | SPEC-001-configuracion-cash-y-variables-de-juego.md                          | SPEC-001 | Configuración de cash y otras variables de juego previo al inicio      |