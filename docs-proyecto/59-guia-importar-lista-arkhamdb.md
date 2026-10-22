# 59 · Guía: importar un investigador desde una lista de ArkhamDB

Procedimiento seguido con la [lista 1179 de Jenny Barnes](60-investigador-jenny-barnes.md)
para que cualquier petición del tipo «aquí tienes un enlace de ArkhamDB, sube el
investigador y sus cartas» se resuelva igual. Complementa el diseño general de la
[importación masiva](24-importacion-masiva-cartas-jugador.md) y las
[convenciones](06-convenciones.md); no sustituye la revisión de reglas de cada carta.

## 1. Diagnóstico de la lista (solo lectura)

```bash
node scripts/check-decklist.mjs https://arkhamdb.com/decklist/view/1179/jenny-campaign-breaker-barnes-1.0
```

Acepta enlaces `decklist/view/N`, `deck/view/N` o el número, y `--file lista.json`
para trabajar sin red. `--json` produce el informe completo. Para cada código indica:

| Estado                     | Significado                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playable`                 | Definición y comportamiento registrados: no hay que hacer nada.                                                                                   |
| `reprint-pending`          | Otra edición de la misma carta ya es jugable. Los mazos conservan sus códigos exactos, así que hay que registrar este código como reedición.       |
| `pending`                  | Está en el inventario congelado sin habilitar. Muestra clasificación, tipo, paquete y bloqueos del modelo (`modelIssues`).                        |
| `defined-without-behavior` | Hay datos registrados pero ningún comportamiento: revisar por qué.                                                                                |
| `missing-from-inventory`   | No está en el inventario `3c8ee4b5d8100766`: requiere un inventario nuevo con `pnpm cards:import`, nunca editar el congelado.                     |
| `placeholder`              | `01000`, la debilidad básica aleatoria. No es una carta: la importación de mazos lo omite y la campaña añade una debilidad real.                   |

El script consulta el registro real del motor (el mismo `inspectRuntime` del
importador), no una lista mantenida a mano. Para Jenny dio 16 jugables y 6 por
implementar: 02003, 02010, 02011, 01024, 01050 y 02147.

## 2. Alcance y lote

- Un lote por lista, en `packages/cards/src/<investigador>/`, con `approvals.json`
  (incluye el enlace en `decklist`), un módulo y una prueba por código,
  `testing.ts`, `integration.test.ts`, `uniqueness.test.ts` y la lista original
  `decklist-<id>.json` sin la descripción.
- **Solo la versión original del investigador y sus exclusivas primarias.** El
  inventario lista alternativas (`signatureGroups[].alternatives`: paralelas,
  sustituciones de reediciones); se excluyen salvo petición expresa.
- Las demás cartas que falten entran en el mismo lote si su comportamiento se
  puede implementar y probar. Si alguna queda bloqueada, la lista no es jugable:
  se informa de ello en vez de activar el resto como si estuviera completa.
- Antes de editar, comprobar `git status`. Si otra sesión o la automatización de
  importación está trabajando en el mismo árbol, trabajar en un worktree temporal
  desacoplado (`git worktree add --detach <carpeta-temporal> HEAD`, sin rama) y
  llevar después el resultado a `main`.

## 3. Datos

- Las cartas estándar (`classification: standard-candidate`) se convierten con
  `approvedDefinition` (`scripts/cards-import/approved.mjs`) desde el inventario
  congelado. `fast`, `uses` y `commitLimit` vienen de la aprobación revisada.
- El investigador y sus exclusivas necesitan un adaptador propio porque el
  inventario los marca `complex-deckbuilding`, `alternative-signatures` o con
  costes simbólicos. Modelos: `scripts/cards-import/pete.mjs` y `jenny.mjs`, con
  su prueba `.test.mjs` y el script `scripts/prepare-<investigador>.mjs` que
  escribe `packages/cards/src/data/<investigador>.json`.
- Construcción: `deckOptions` para clases y niveles, `offClassLevelZeroLimit`
  para «hasta cinco cartas de nivel 0 de otras clases» y `signatures` con los
  códigos primarios. Los valores salen de `deck_options` y `deck_requirements`
  de la API de ArkhamDB; contrastarlos con el reverso impreso.
- Registrar el JSON del investigador en `core-2026/player-cards.ts` junto a Pete:
  `decks.ts` y `campaign.ts` calculan el conjunto de exclusivas al cargarse, y
  una exclusiva registrada después quedaría disponible para cualquier mazo.
- Añadir un mazo inicial en `STARTER_DECKS` (`investigatorCode` y `cardCodes`).
  Puede ser la propia lista, sustituyendo `01000` por una debilidad básica real.
  Sin esta entrada el investigador no aparece en la pantalla de nueva partida.

## 4. Reglas y motor

- Reutilizar comportamientos existentes cuando la equivalencia esté comprobada
  (`fightOptions`, `registerEquipment`, `registerBasicAsset`…). Cada módulo
  empieza con la referencia `// RR:` de las secciones de reglas aplicadas.
- Lo que no exista se añade al motor como capacidad general, documentada en
  `PlayerCardBehavior` o `InvestigatorBehavior`, no como excepción por código.
  Con Jenny se añadieron: recursos adicionales de mantenimiento, coste X,
  ranuras restringidas por rasgo y daño con derrota diferida (ver documento 60).
- Las debilidades vinculadas fuera de la zona de amenaza también cuentan para
  los efectos «cuando termine la partida» de su dueño.

## 5. Presentación EN/ES

- Nombres y textos de respaldo en `offlineCard.names`, `offlineCard.summary` y,
  para el investigador, `offlineCard.backSummary`, en `packages/i18n/src/en.json`
  y `es.json` con el texto oficial de ArkhamDB (`/api/public/card/<código>` en
  `arkhamdb.com` y `es.arkhamdb.com`). Las etiquetas nuevas (`prompt.*`,
  `choice.*`, `ability.*`) llevan las mismas claves en ambos idiomas.
- Los paquetes de expansión que se consultan en línea se filtran a los códigos
  habilitados (`DUNWICH_CODES` en `apps/web/src/game/localized.ts`). Al añadir
  códigos, subir la versión de `CACHE_PREFIX`.
- ArkhamDB codifica el coste X como número negativo; la carta renderizada lo
  muestra como «X».
- Imágenes oficiales y retrato con el importador común:

  ```bash
  node scripts/import-card-images.mjs 02003 02003b 02010 02011 01024 01050 02147 --portrait 02003
  python scripts/generate-card-thumbnails.py --codes 02003 02003b 02010 02011 01024 01050 02147
  ```

  El primero no reescribe entradas existentes y añade tamaño y SHA-256 al
  inventario `evidencias/imagenes-locales.json`; su salida JSON se guarda como
  `evidencias/<investigador>-recursos-oficiales.json`. El reverso del
  investigador es `<código>b`. El segundo necesita Python con Pillow; en este
  equipo no hay Python en el `PATH` y se usó el de
  `C:\Users\FEde\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`.
- Revisar visualmente una hoja de contacto de las miniaturas. Si un escaneo
  difiere del texto vigente (erratas o primeras impresiones), se aplica el texto
  de ArkhamDB y se documenta la diferencia.

## 6. Pruebas mínimas

- Un archivo por carta con su efecto principal y sus restricciones.
- Integración de la lista: `deckFromArkhamDb` sin códigos desconocidos,
  `validateDeck` sin problemas, todos los códigos con `isImplemented`, campaña
  creada con una debilidad básica real y escenario iniciado.
- Límite de cartas de otras clases en validación y compras; las exclusivas no se
  ofrecen en compras y las cartas estándar sí.
- Unicidad de códigos y familias frente a todos los `data/*.json` anteriores.
- Reproducción de los datos desde el inventario (`scripts/cards-import/*.test.mjs`).

## 7. Cierre

- Controles de [AGENTS.md](../AGENTS.md): `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` y `pnpm build`. Si `pnpm` no está en el `PATH`,
  `corepack pnpm …` usa la versión fijada en `package.json`.
- Documento del lote con recuentos (códigos, cartas o niveles distintos nuevos,
  reediciones), decisiones de reglas, limitaciones y validación; entrada en
  `docs-proyecto/README.md`.
- Repetir `node scripts/check-decklist.mjs <enlace>`: debe indicar 0 por
  implementar.
- Commit y push solo con autorización expresa.
