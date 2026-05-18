---
name: implement-spec
description: Implementa un spec paso a paso, marcando criterios de aceptación como completados a medida que se realizan, y actualiza el estado del spec al terminar. Usa cuando el usuario pida implementar un spec por ID o nombre (p.ej. "implement SPEC-002").
---

# Skill: implement-spec

Implementa un spec paso a paso, marcando los criterios de aceptación como completados (`- [x]`) a medida que se realizan, y actualiza el estado del spec al terminar.

**Entrada del usuario:** $ARGUMENTS
(Nombre o ID del spec, p.ej. `SPEC-002` o `SPEC-002-correccion-visual-puntos-dado.md`. Si no se pasa argumento, busca en `./spec/` el spec más reciente con `status: draft`.)

---

## Paso 1 — Localizar el spec

Si `$ARGUMENTS` está vacío:

- Busca recursivamente en `./spec/` todos los archivos `SPEC-*.md`.
- Abre cada uno y lee el frontmatter hasta encontrar `status: draft`. Usa ese archivo.
- Si hay varios en `draft`, elige el de ID más bajo.

Si `$ARGUMENTS` contiene un ID o nombre:

- Busca el archivo en `./spec/` (recursivamente) que coincida por prefijo `SPEC-NNN` o nombre exacto.
- Si no existe, comunica el error y detente.

Lee el archivo completo y memoriza:

- El **frontmatter** (`id`, `title`, `status`).
- Los **Pasos ordenados** del Plan de Implementación (sección `### Pasos ordenados` o sección numerada `1. 2. ...`).
- Los **Criterios de Aceptación** (`- [ ]` pendientes y `- [x]` ya completados).
- Los **Archivos a crear** y **Archivos a modificar**.
- Las **Notas** y cualquier detalle técnico relevante de **Análisis Técnico**.

---

## Paso 2 — Auditar el estado actual

Antes de implementar nada, determina qué ya está hecho:

1. Por cada archivo listado en "Archivos a crear", comprueba si ya existe en disco.
2. Por cada criterio de aceptación ya marcado `- [x]`, confírmalo como completado.
3. Revisa `git status` y `git log --oneline -10` para entender qué cambios hay en la rama.

Construye mentalmente dos listas:

- **Ya completado**: criterios `[x]` y archivos que ya existen.
- **Pendiente**: criterios `[ ]` cuyos archivos aún no existen o cuya lógica no está implementada.

Si todo está ya completado, actualiza el frontmatter (`status: done`) y comunícalo. No hagas nada más.

---

## Paso 3 — Implementar paso a paso

Sigue el orden del **Plan de Implementación → Pasos ordenados**. Para cada paso:

### 3a. Implementar el paso

- Lee los archivos relevantes del proyecto para entender los patrones antes de escribir código nuevo.
- Aplica los skills disponibles cuando corresponda (p.ej. `gen-spec` si necesitas generar un spec derivado).
- Sigue los patrones del proyecto: revisa componentes existentes en `components/`, stores en `stores/`, páginas en `pages/`. Respeta la estructura y convenciones (Vue 3 + Nuxt, `<script setup lang="ts">`, composables, etc.).
- Implementa el código real (no pseudocódigo). Crea o modifica cada archivo necesario.
- Usa utilidades y librerías ya instaladas en el proyecto (no instales dependencias nuevas sin confirmar con el usuario).

### 3b. Marcar criterios cubiertos

Inmediatamente después de implementar el código que satisface un criterio, edita el archivo spec:

- Cambia `- [ ] Criterio` → `- [x] Criterio`
- Haz esto con cada criterio que el código recién escrito satisfaga.
- **No esperes al final** — marca criterios conforme se cumplen.

### 3c. Continuar con el siguiente paso

Repite 3a–3b hasta que todos los criterios estén marcados `[x]`.

---

## Paso 4 — Actualizar el frontmatter

Cuando todos los criterios estén marcados `[x]`:

1. Edita el frontmatter del spec:
   ```
   status: draft  →  status: done
   ```
2. Comunica el resumen: cuántos criterios se implementaron, archivos creados/modificados.

Si quedan criterios sin completar (por depender de otro spec, datos externos, o limitación técnica), deja `status: in-progress` y añade una nota al final del archivo spec indicando qué bloquea cada criterio pendiente.

---

## Reglas importantes

- **Nunca marques un criterio `[x]` sin haberlo implementado realmente.**
- Si un criterio depende de otro spec (p.ej. `hasta SPEC-003`), márcalo como bloqueado con un comentario inline: `- [ ] Criterio *(bloqueado: requiere SPEC-003)*` — no lo marques `[x]`.
- Sigue los patrones del proyecto: revisa archivos existentes antes de crear nuevos.
- No instales dependencias npm sin confirmar con el usuario.
- Ejecuta `npm run lint` o el comando de lint/typecheck disponible si el spec incluye cambios verificables.

---

## Formato de salida al terminar

Al terminar cada paso, escribe una línea:

```
✔ Paso N completado — [N] criterios ✓
```

Al terminar todo, muestra **siempre** estas dos secciones:

### Sección 1 — Estado

```
✔ SPEC-NNN implementado — N/N criterios completados — status: done
```

O si hay pendientes:

```
⚠ SPEC-NNN parcialmente implementado — N/M criterios completados — status: in-progress
Bloqueados: [lista de criterios no completados y motivo]
```

### Sección 2 — Comandos para completar en terminal (SIEMPRE obligatoria)

Genera siempre este bloque al final, incluso cuando no haya pasos pendientes. Incluye todos los comandos de verificación o activación que el desarrollador debe ejecutar manualmente:

```
## Pasos pendientes en terminal

# [Descripción del paso]
<comando exacto>

# [Descripción del paso]
<comando exacto>
```