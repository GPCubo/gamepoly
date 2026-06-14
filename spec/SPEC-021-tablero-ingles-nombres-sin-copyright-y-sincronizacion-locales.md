---
id: SPEC-021
title: Tablero en inglés con nombres sin copyright, sincronización de locales y selección automática por idioma
created_at: 2026-06-15T00:00:00
status: done
---

# SPEC-021: Tablero en inglés con nombres sin copyright, sincronización de locales y selección automática por idioma

## Descripción

Actualmente el juego solo tiene un tablero (`monopoly-es`) con nombres en español. Este spec crea un segundo tablero completamente en inglés con nombres propios distintos (sin referencias a Monopoly ni a las calles reales de Atlantic City), incluyendo nombres alternativos para las casillas especiales ("Fortune" en lugar de "Chance", "City Fund" en lugar de "Community Chest").

Los cambios se dividen en:

1. **Definición del tablero inglés**: nuevo archivo `config/boardTilesConfigEn.ts` con los 40 tiles y un archivo `config/boardCardsConfigEn.ts` con las 32 cartas en inglés.
2. **Sincronización a DB**: extender `scripts/sync-db.mjs` para insertar el tablero inglés en `boards`, `board_tiles` y `board_cards`.
3. **Actualización del `boardStore`**: el store selecciona automáticamente el slug de board según el locale activo de la app.
4. **Actualización de locales**: completar `locales/en.ts` con los 55 claves `tile.X.name`/`tile.X.short` (hoy solo tiene 25, faltan los nombres de las 27 propiedades) y las 32 claves `card.X.text` para el tablero inglés.
5. **Actualización de `locales/es.ts`**: completar cualquier clave faltante (hoy tiene 55 claves pero faltan algunos shorts y las claves de cartas).

## Contexto y Motivación

- Con SPEC-019 el frontend ya carga el tablero desde API. El locale del usuario determina qué tablero debe cargarse, pero `plugins/board.client.ts` siempre pide `monopoly-es` sin importar el idioma.
- Los locales actuales tienen los nombres de propiedades hardcodeados como claves `tile.X.name` — si se cambia el idioma a inglés, se verían los nombres en español (o en inglés con nombres de Madrid) hasta que exista un tablero inglés propio.
- Copyright: los nombres reales del Monopoly clásico (Boardwalk, Park Place, Mayfair, etc.) son marcas registradas de Hasbro. El tablero inglés debe usar nombres ficticios originales.

## Análisis Técnico

### Mapa de casillas propuesto para el tablero inglés

El tablero inglés usa el nombre interno "Crestwood City" — una ciudad ficticia portuaria. Los **grupos de carta** se renombran: `chance` → "Fortune" (tile display), `community` → "City Fund". Los identificadores internos en DB siguen siendo `"chance"` y `"community"` (el engine no cambia).

| Index | Tipo | Grupo | Nombre propuesto | Short |
|---|---|---|---|---|
| 0 | corner | go | Go | Go |
| 1 | property | brown | Watermill Road | Watermill |
| 2 | card | community | City Fund | City Fund |
| 3 | property | brown | Harbor Lane | Harbor |
| 4 | tax | tax | Income Tax | Tax |
| 5 | railroad | railroad | North Terminal | N. Terminal |
| 6 | property | lightBlue | Bay Street | Bay St |
| 7 | card | chance | Fortune | Fortune |
| 8 | property | lightBlue | Market Square | Market Sq |
| 9 | property | lightBlue | Riverside Walk | Riverside |
| 10 | corner | jail | Jail | Jail |
| 11 | property | pink | Grand Avenue | Grand Ave |
| 12 | utility | utility | Power & Light Co. | Power Co. |
| 13 | property | pink | Sunset Boulevard | Sunset Blvd |
| 14 | property | pink | Palm Drive | Palm Dr |
| 15 | railroad | railroad | East Terminal | E. Terminal |
| 16 | property | orange | Maple Drive | Maple Dr |
| 17 | card | community | City Fund | City Fund |
| 18 | property | orange | Oak Street | Oak St |
| 19 | property | orange | Elm Park | Elm Park |
| 20 | corner | parking | Free Parking | Parking |
| 21 | property | red | Crown Plaza | Crown |
| 22 | card | chance | Fortune | Fortune |
| 23 | property | red | Empire Square | Empire Sq |
| 24 | property | red | Liberty Street | Liberty St |
| 25 | railroad | railroad | South Terminal | S. Terminal |
| 26 | property | yellow | Sunrise Avenue | Sunrise |
| 27 | property | yellow | Horizon Drive | Horizon |
| 28 | utility | utility | City Water Works | Water Works |
| 29 | property | yellow | Valley Road | Valley |
| 30 | corner | gotojail | Go to Jail | Go to Jail |
| 31 | property | green | Crescent Park | Crescent |
| 32 | property | green | Forest Boulevard | Forest Blvd |
| 33 | card | community | City Fund | City Fund |
| 34 | property | green | Lakeside Drive | Lakeside |
| 35 | railroad | railroad | West Terminal | W. Terminal |
| 36 | card | chance | Fortune | Fortune |
| 37 | property | darkBlue | Skyline Tower | Skyline |
| 38 | tax | tax | Luxury Tax | Luxury |
| 39 | property | darkBlue | Diamond Court | Diamond |

Los precios se mantienen iguales que el tablero español (misma mecánica económica).

### Cartas en inglés (card texts)

Las cartas mantienen la misma mecánica (`action`, `amount`, `tileIndex`) pero con texto en inglés y referenciando los nombres del tablero inglés vía `{tileName}`. Ejemplo:
- `ch01`: "Advance to {tileName}. Collect $200." → GO (index 0)
- `ch07`: "Go to {tileName}. Do not pass Go." → Jail (index 10)
- `co01`: "Advance to {tileName}. Collect $200." → GO
- etc.

### Estructura de locales

**`locales/es.ts` — claves a agregar (faltantes):**
- Las 32 claves `card.ch01.text` ... `card.co16.text` (hoy tiene 34 claves de cartas, verificar cuáles faltan)
- Verificar completitud de `tile.X.short` para casillas con shortName

**`locales/en.ts` — claves a agregar:**
- `tile.1.name` ... `tile.39.name` para todas las propiedades (hoy solo tiene especiales)
- `tile.X.short` para tiles con nombre corto
- `card.ch01.text` ... `card.co16.text` con textos en inglés

### URL como fuente de locale (nuevo)

La URL define el idioma activo:
- `/` `/setup` `/game` `/multiplayer/...` → **español** (sin prefijo)
- `/en/` `/en/setup` `/en/game` `/en/multiplayer/...` → **inglés**

**Prioridad de detección** (de mayor a menor):
1. Prefijo en la URL (`/en/` → inglés)
2. `localStorage` (preserva selección manual previa)
3. Idioma del browser
4. `DEFAULT_LOCALE` (`es`)

**Al cambiar de idioma**, la app navega hacia la misma ruta con/sin el prefijo `/en`:
```
/game  →  cambiar a inglés  →  /en/game
/en/game  →  cambiar a español  →  /game
```

#### Cambios en `composables/useI18n.ts`

`detectInitialLocale` debe leer la URL antes que el localStorage:
```ts
function detectInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  // 1. URL path tiene prioridad
  const path = window.location.pathname;
  if (path === '/en' || path.startsWith('/en/')) return 'en';
  // 2. localStorage
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocaleCode(saved)) return saved;
  // 3. Browser language
  const browserLocale = window.navigator.language?.slice(0, 2).toLowerCase();
  return isLocaleCode(browserLocale) ? browserLocale : DEFAULT_LOCALE;
}
```

Y al cambiar locale, actualizar la URL:
```ts
watch(locale, (value) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, value);
  document.documentElement.lang = value;
  // Redirigir con/sin prefijo /en
  const path = window.location.pathname;
  const bare = path.replace(/^\/en(?=\/|$)/, '') || '/';
  if (value === 'en' && !path.startsWith('/en')) {
    navigateTo('/en' + bare);
  } else if (value === 'es' && path.startsWith('/en')) {
    navigateTo(bare);
  }
});
```

#### Cambios en `nuxt.config.ts`

Agregar las rutas `/en/**` a `routeRules` para que `nuxt generate` las pre-renderice:
```ts
routeRules: {
  "/": { ssr: false },
  "/setup": { ssr: false },
  "/game": { ssr: false },
  "/multiplayer/**": { ssr: false },
  "/en": { ssr: false },
  "/en/": { ssr: false },
  "/en/setup": { ssr: false },
  "/en/game": { ssr: false },
  "/en/multiplayer/**": { ssr: false },
},
```

#### Cambios en nginx (servidor)

El servidor debe servir el mismo `index.html` para cualquier ruta `/en/**`. Agregar a la configuración de nginx:
```nginx
location /en/ {
  try_files $uri $uri/ /index.html;
}
```

#### Selección de board por locale

`plugins/board.client.ts` lee el locale ya inicializado por `useI18n` (que ahora incluye detección por URL):
```ts
export default defineNuxtPlugin(async () => {
  const boardStore = useBoardStore()
  const { locale } = useI18n()
  const slug = locale.value === 'en' ? 'board-en' : 'board-es'
  await boardStore.fetchBoard(slug)
})
```

Al cambiar locale en runtime, el boardStore refetchea automáticamente (watch en `boardStore.ts`):
```ts
// En stores/boardStore.ts — watch reactivo al locale
const { locale } = useI18n()
watch(locale, async (newLocale) => {
  await fetchBoard(newLocale === 'en' ? 'board-en' : 'board-es')
})
```

### Renombrar slugs (breaking change menor)

Para claridad y separación de la marca, los slugs se renombran:
- `monopoly-es` → `board-es`
- nuevo → `board-en`

Esto requiere actualizar el sync-db.mjs y ejecutar `sync:db` para migrar el slug (upsert crea el nuevo si no existe).

### Dependencias

- SPEC-017, SPEC-018, SPEC-019, SPEC-020 completos (DB con boards/tiles/cards, boardStore cargando desde API)
- `locales/index.ts` — `LocaleCode` y `TranslationKey` — posiblemente necesite nuevas keys

## Plan de Implementación

### Archivos a crear

- `config/boardTilesConfigEs.ts` — restaurar los 40 tiles del tablero español (renombrado desde el eliminado `boardTilesConfig.ts` en SPEC-019)
- `config/boardTilesConfigEn.ts` — 40 tiles del tablero inglés con nombres originales
- `config/boardCardsConfigEs.ts` — 32 cartas en español (extraídas del hardcodeado en `boardconfig.go`)
- `config/boardCardsConfigEn.ts` — 32 cartas en inglés

### Archivos a modificar

- `scripts/sync-board-config.mjs` — **ROTO** desde SPEC-019: restaurar funcionalidad y parametrizar con `--board es|en` para generar el Python de Blender desde cualquier tablero
- `scripts/sync-db.mjs` — iterar sobre ambos tableros (es + en) leyendo `boardTilesConfigEs/En.ts` y `boardCardsConfigEs/En.ts`
- `scripts/sync-all.mjs` — actualizar para pasar el parámetro de board al sync de Blender
- `plugins/board.client.ts` — seleccionar slug según locale activo
- `composables/useI18n.ts` — `detectInitialLocale` lee URL primero; watch actualiza URL al cambiar locale
- `stores/boardStore.ts` — watch en locale para refetch automático
- `nuxt.config.ts` — agregar `routeRules` para rutas `/en/**`
- `locales/en.ts` — completar todas las claves `tile.X.name`, `tile.X.short`, `card.X.text`
- `locales/es.ts` — verificar y completar claves faltantes
- `locales/index.ts` — agregar las nuevas claves a `TranslationKey` si es necesario
- `package.json` — agregar scripts `sync:blender:es` y `sync:blender:en`

### Pasos ordenados

1. Crear `config/boardTilesConfigEs.ts` (restaurar datos del tablero español que vivían en `boardTilesConfig.ts`).
2. Crear `config/boardCardsConfigEs.ts` (32 cartas en español, mismas que en `hardcodedChanceCards`/`hardcodedCommunityCards` de `boardconfig.go`).
3. Reparar `scripts/sync-board-config.mjs`: aceptar `--board es|en` (default `es`) y leer el config file correspondiente. Verificar que `npm run sync:blender` vuelve a funcionar.
4. Crear `config/boardTilesConfigEn.ts` con los 40 tiles en inglés.
5. Crear `config/boardCardsConfigEn.ts` con las 32 cartas en inglés.
6. Extender `scripts/sync-db.mjs` para sincronizar ambos tableros: upsert de `board-es` (desde `boardTilesConfigEs.ts` + `boardCardsConfigEs.ts`) y `board-en` (desde `boardTilesConfigEn.ts` + `boardCardsConfigEn.ts`).
7. Actualizar `locales/en.ts`: agregar las 27 claves de propiedades faltantes + shorts + 32 card texts.
8. Actualizar `locales/es.ts`: verificar y completar claves de cartas faltantes.
9. Actualizar `composables/useI18n.ts`: `detectInitialLocale` lee URL primero; watch redirige al cambiar locale.
10. Actualizar `nuxt.config.ts`: agregar rutas `/en/**` a `routeRules`.
11. Actualizar `plugins/board.client.ts` para seleccionar slug por locale.
12. Actualizar `stores/boardStore.ts`: watch en locale para refetch automático del board.
13. Agregar scripts `sync:blender:es` y `sync:blender:en` en `package.json`.
14. Correr `npm run sync:db` en producción para poblar `board-en` y crear `board-es`.
15. Actualizar nginx: agregar `location /en/ { try_files $uri $uri/ /index.html; }`.
16. Verificar en el browser: navegar a `/en/` → UI en inglés, tablero en inglés. Cambiar a español → redirige a `/`.

## Criterios de Aceptación

- [x] Navegar a `/en/` carga la app en inglés; navegar a `/` carga la app en español.
- [x] Cambiar idioma dentro de la app redirige la URL (ej. `/game` → `/en/game`).
- [x] Recargar la página en `/en/game` mantiene el idioma inglés (URL tiene prioridad sobre localStorage).
- [x] `npm run sync:blender` (tablero español) termina sin errores y actualiza el Python de Blender.
- [x] `npm run sync:blender:en` (tablero inglés) termina sin errores.
- [x] `GET /api/v1/boards/board-en` devuelve 40 tiles con nombres en inglés y 32 cartas con textos en inglés.
- [x] `GET /api/v1/boards/board-es` devuelve 40 tiles con nombres en español (slug renombrado de `monopoly-es`).
- [x] Con la app en inglés, el tablero muestra "Fortune" en las casillas de azar y "City Fund" en las de comunidad.
- [x] Con la app en español, el tablero muestra "Suerte" y "Arca Comunal".
- [x] Al cambiar de idioma en runtime, el boardStore refetchea y las casillas se actualizan.
- [x] Ninguna casilla de propiedad muestra una clave i18n como nombre (ej. `tile.9.name` no aparece en pantalla).
- [x] Las cartas en inglés usan los nombres del tablero inglés en `{tileName}` (ej. "Advance to GO.").
- [x] `npm run sync:db` es idempotente (puede correrse dos veces sin errores).

## Notas

- **Renaming `monopoly-es` → `board-es`**: el upsert en sync-db.mjs usa `ON CONFLICT (slug) DO UPDATE`, así que el antiguo `monopoly-es` se convierte en `board-es` si se hace con un DELETE + INSERT, o bien se crea `board-es` en paralelo. Para simplicidad: crear `board-es` como nuevo board (slug diferente) y dejar `monopoly-es` obsoleto. `plugins/board.client.ts` ya apuntaría a `board-es`. En una siguiente limpieza se puede eliminar `monopoly-es` de la DB.
- **Precios iguales en ambos tableros**: la mecánica económica es idéntica — solo cambian los nombres. Las fórmulas de `economyConfig.ts` (PRICE_MIN=60, PRICE_MAX=400) siguen válidas.
- **Nombres copyright-free**: los nombres propuestos (Watermill Road, Harbor Lane, Bay Street, etc.) son ficticios y no pertenecen a ningún juego de mesa registrado.
- **Grupo de carta en DB**: el campo `card_group` en `board_cards` sigue siendo `"chance"` y `"community"` — son identificadores internos del engine. Los nombres de display ("Fortune", "City Fund") se obtienen de `tile.X.name` en los locales (los tiles 7, 22, 36 para chance y 2, 17, 33 para community).
- **Los GLB son agnósticos al idioma**: ambos tableros usan `/models/tablero.glb`. No hay diferencia 3D, solo de datos.
