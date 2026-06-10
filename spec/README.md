# Specs — GamePoly Web

Índice de todas las especificaciones del proyecto. Cada spec documenta un cambio significativo: qué se construyó, por qué, y cómo verificarlo.

Genera nuevas specs con:
```bash
node scripts/gen-spec.js "Título del cambio"
```

---

## Estado actual

| ID | Título | Estado | Área |
|---|---|---|---|
| [SPEC-001](./SPEC-001-boton-ver-historico-fuera-del-mapa-con-dialog-de-historial-completo.md) | Botón "Ver Histórico" fuera del mapa con dialog | ✅ done | UI / Frontend |
| [SPEC-002](./SPEC-002-mover-el-dado-debajo-del-boton-ver-historico.md) | Mover el dado debajo del botón "Ver Histórico" | ✅ done | UI / Frontend |
| [SPEC-003](./SPEC-003-deshabilitar-botones-subasta-hasta-turno-del-usuario.md) | Deshabilitar botones de subasta hasta el turno del usuario | ✅ done | UI / Frontend |
| [SPEC-004](./SPEC-004-arquitectura-multijugador-multimesa-en-tiempo-real.md) | Arquitectura multijugador multi-mesa en tiempo real | 🔄 in-progress | Backend / Full-stack |

---

## Leyenda de estados

| Símbolo | Significado |
|---|---|
| 📝 `draft` | Redactada, pendiente de implementación |
| 🔄 `in-progress` | Implementación parcial — ver criterios bloqueados en el archivo |
| ✅ `done` | Todos los criterios de aceptación cumplidos |

---

## Pendiente por fases (SPEC-004)

SPEC-004 está en `in-progress`. Las fases aún abiertas son:

- **Fase 2** — Persistencia PostgreSQL: guardar partidas terminadas, limpiar mesas inactivas.
- **Fase 3** — Escalado horizontal: Redis pub/sub entre múltiples instancias Go.
- **Fase 4** — Cuentas, estadísticas, spectators, OAuth.

Ver [DEPLOY.md](../backend/DEPLOY.md) para instrucciones de despliegue del servidor Go.
