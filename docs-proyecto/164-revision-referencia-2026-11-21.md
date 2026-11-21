# 164 · Revisión de la nueva copia de la referencia — 21/11/2026

**Copia examinada:** `D:\referencia\ArkhamHorror-main`, sustituida por la persona
usuaria. Todos los archivos tienen fecha de modificación del 18/11/2026 y no hay
`.git`, así que no se puede saber qué archivos concretos han cambiado. La
comparación se hace contra los recuentos de la
[auditoría del 17/10/2026](15-auditoria-referencia-2026-10-17.md).

**Alcance:** revisión estática dirigida. No se ha compilado ni ejecutado el
backend ni el frontend, ni se ha abierto un navegador. Igual que en la auditoría
anterior, que exista un módulo no demuestra que su regla sea correcta: cada
implementación nuestra se contrasta con las guías, las cartas y la FAQ.

## 1. Cambios medidos

| Área (`backend/arkham-api/library/Arkham`) | 17/10 | 21/11 |
| --- | ---: | ---: |
| Archivos `.hs` en total | 9.267 | 9.420 |
| `Asset/Assets` | 1.177 | 1.189 |
| `Treachery/Cards` | 761 | 772 |
| `Enemy/Cards` | 700 | 711 |
| `Location/Cards` | 1.303 | 1.318 |
| `Scenario/Scenarios` | 157 | 158 |
| `Homebrew` | 1.688 | 1.764 |
| Pruebas `*Spec.hs` | 406 | 429 |
| Pruebas `.test.mjs` del frontend | 23 | 33 |

Sin cambios: `Event/Events` (519), `Skill/Cards` (157), `Investigator/Cards`
(98) y `Campaign/Campaigns` (32). El mayor crecimiento está en contenido de
aficionados (`Homebrew`) y en pruebas.

No hay CHANGELOG ni notas de versión. La única fuente fechada es
`migrations/sqitch.plan`: sus entradas posteriores al 17/10 (resultados de
partida, espectadores, notificaciones, administración y ajustes de esquema) son
de infraestructura, no de reglas.

## 2. Material de reglas reutilizable: `mcp/references/`

Esta carpeta no estaba en la auditoría anterior y es lo más útil de la copia. Es
un corpus de reglas preprocesado para agentes, con un índice en
`mcp/references/README.md`:

| Ruta | Contenido | Uso para nosotros |
| --- | --- | --- |
| `grimoire/` | Grimorio de Arkham v1.0 (2026) por entradas: 139 entradas de glosario, FAQ propia y secciones de temporización y construcción de mazos. | Buscar una regla concreta sin abrir el PDF. Contrastar con `reglas/AHLCG_Grimorio_v_1_0_Capitulo2.pdf`. |
| `faq/` | FAQ v2.5 (febrero de 2026): 145 preguntas, resoluciones numeradas 1.1–1.39 y 2.1–2.29, erratas de reglamento, guías de campaña y cartas, tabú, Ultimátums y Bendiciones (`ultimatums_and_boons.md`) y Refracciones (`refractions.md`). | Erratas de campañas que vamos a implementar. Contrastar con `reglas/FAQ v2.5A.pdf`. |
| `rules/` | Referencia de reglas de ArkhamDB: 188 entradas de glosario, reglas de oro y apéndices de temporización. | Consulta rápida de términos. |
| `local-faq/` | 30 resoluciones fechadas con su fuente y sus consecuencias para el motor. | Casos límite ya razonados. |
| `engine-gotchas/` | 313 notas con `INDEX.md` sobre errores de implementación encontrados. | Avisos de diseño: muchos aplican a cualquier motor. |
| `haskell-patterns/` | Patrones de Haskell. | No aplica. |

Resoluciones de `local-faq/` relevantes para el trabajo previsto:

- `2026-06-17_hemlock-vale-preludes-same-game.md`: **los preludios de La fiesta
  del Valle de la Cicuta son la misma partida que el escenario que les sigue.**
  Las capacidades «una vez por partida» no se renuevan y las ventanas «cuando
  comienza la partida» y las revelaciones de la mano inicial no se repiten.
- `2026-06-17_stalking-hybrid-only-prey-spawn.md`,
  `2025-04-01_cavern-moss-attached-behavior.md` y
  `2026-06-06_transfiguration-cannot-choose-bonded-investigators.md`: cartas de
  encuentro de la misma campaña.
- `2026-11-09_forced-move-toward-does-not-pay-additional-costs.md`: un
  movimiento forzado «hacia» un Lugar no paga costes adicionales de entrada.
  Revisar si nuestro motor lo cumple.

Notas de `engine-gotchas/` que conviene leer antes de implementar Lugares-Enemigo y
partidas independientes: `project_enemylocation_discovery_gap`,
`project_enemy_location_runner_must_mirror_enemy_windows`,
`project_location_abilities_field_is_empty_for_enemy_locations`,
`project_scenario_modifier_keyword_fallback_was_game_wide` y
`project_a_standalone_game_has_no_campaign_entity`.

`backend/Checklist.md` es una lista de comprobación al implementar cartas.
Puede servir para revisar las nuestras, sin sustituir a
[06 · Convenciones](06-convenciones.md).

## 3. Contenido completo que antes figuraba como parcial

- **The Feast of Hemlock Vale:** completa. Los 441 códigos de sus dos paquetes
  tienen definición. Detalle en la sección 4.
- **The Drowned City:** 10 escenarios con todos sus módulos (24 actos, 20 planes,
  43 Enemigos, 93 Lugares, 26 Historias y 45 Traiciones). `campaigns.json` ya no
  la marca como beta; solo Children of Blood (3 escenarios) conserva esa marca.
- **Return to The Circle Undone:** 9 escenarios.
- **Ocultas** (`Keyword.Concealed`) está en `Campaigns/TheScarletKeys/Concealed/`.
  Pertenece a Las llaves escarlata, no a esta campaña.
- `Keyword.hs` incluye también `Veiled`, `Starting`, `Predator`, `Partner`,
  `Replacement`, `Advanced` y `CustomKeyword`.
- **Ultimátums y Bendiciones** (`UltimatumsAndBoons.hs`, 27 pruebas) y
  **logros** (`Achievement.hs`, 11 pruebas). Un logro de la nueva campaña exige
  ganar con tres Ultimátums.
- **Conjuntos personalizados** (`Custom/`, 21 archivos) y documentación nueva en
  `docs/` (marcas de agua, arkham.build, tercera edición, Windows) y en
  `backend/arkham-api/docs/custom-chaos-bags.md`. Son ajenos a nuestro alcance
  actual.

## 4. The Feast of Hemlock Vale en la referencia

Rutas relativas a `backend/arkham-api/library/Arkham/` salvo que empiecen por
`frontend/`. Sirven para estudiar cómo se ha modelado; las reglas se toman de la
guía. El plan de implementación está en
[165 · La fiesta del Valle de la Cicuta](165-la-fiesta-del-valle-de-la-cicuta.md).

### Módulos

| Paso | Código | Módulo en `Scenario/Scenarios/TheFeastOfHemlockVale/` |
| --- | --- | --- |
| Preludio: ¡Bienvenidos al Valle de la Cicuta! | 10704 | `PreludeWelcomeToHemlockVale.hs` |
| Escrito en la roca | 10501 | `WrittenInRock.hs` |
| La Casa Cicuta | 10523 | `HemlockHouse.hs` (+ `PredationBag.hs`) |
| El páramo silencioso | 10549 | `TheSilentHeath.hs` |
| La hermana perdida | 10569 | `TheLostSister.hs` |
| La cosa de las profundidades | 10588 | `TheThingInTheDepths.hs` |
| La hondonada retorcida | 10605 | `TheTwistedHollow.hs` |
| Preludio: Alba del segundo día | 10677a | `PreludeDawnOfTheSecondDay.hs` |
| La noche más larga | 10626 | `TheLongestNight.hs` |
| Preludio: Alba del último día | 10679a | `PreludeDawnOfTheFinalDay.hs` |
| Preludio: La última tarde | 10679b | `PreludeTheFinalEvening.hs` |
| El destino del Valle | 10651 | `FateOfTheVale.hs` (+ `CosmicEmissary.hs`) |

La primera y la segunda tarde no son escenarios: son pasos de campaña
(`CampaignSpecificStep "preludeTheFirstEvening"` y `"preludeTheSecondEvening"`)
dentro de `Campaign/Campaigns/TheFeastOfHemlockVale.hs`.

### Modelado

- **Flujo:** `nextStep` decide según `(día, hora)`: Día 1 → primera tarde;
  Noche 1 → Alba del segundo día; Día 2 → segunda tarde; Noche 2 → Alba del
  último día; Día 3 → La última tarde.
- **Estado de campaña** (`Campaigns/TheFeastOfHemlockVale/Helpers.hs`):
  `TheFeastOfHemlockValeMeta { day, time, chosenCodexEntries }`. Los ocho
  habitantes son un tipo enumerado con nivel de relación, tachado, sacrificio y
  notas por habitante, todo en el registro (`Key.hs`, unas 40 claves globales y
  `AreasSurveyed` con siete zonas).
- **Día y Noche:** cada escenario fija `day` y `time` como valores del escenario y
  las cartas consultan `IsDay`/`IsNight`. En La hermana perdida la hora depende del
  Lugar (rasgo Oscuro). En modo independiente el día y la hora se guardan en
  contadores porque los modificadores provocaban bucles.
- **Códice:** la habilidad de un habitante (Negociar) emite un mensaje específico
  del escenario con el número de entrada. La entrada queda marcada como resuelta
  para la partida o hasta el siguiente acto.
- **Preludio y escenario:** `afterPrelude` encadena el escenario sin preparar
  investigadores ni volver a comenzar la partida, según la FAQ citada arriba.
- **Fatiga:** `replaceFatigueChaosTokens` sustituye dos fichas numéricas por las
  de valor una unidad menor.
- **Cuadrícula:** Escrito en la roca y La Casa Cicuta activan una cuadrícula; los
  raíles van en los metadatos de las cartas y las casillas pueden deslizarse.
- **Frontend:** `frontend/src/arkham/components/TheFeastOfHemlockVale/`
  (`DayTimeTracker.vue`, `ResidentNotes.vue` y `AreasSurveyed.vue`).

### Datos de cartas

- `fhvc`, la expansión de campaña: 301 códigos (10501–10743). Incluye 10
  escenarios, 24 actos, 24 planes, 55 Enemigos, 13 Lugares-Enemigo, 102 Lugares,
  37 Traiciones, 7 Historias, 27 Apoyos, 1 habilidad y 1 investigador de campaña
  (Yo fragmentado, 10661).
- `fhvp`, la expansión de investigadores: 140 códigos (10001–10138). Coincide con
  nuestro catálogo de cartas de jugador.
- `frontend/public/cards_es.json` tiene texto en español para los 441 códigos.
  Los textos de campaña del frontend solo están en inglés.

### Pruebas y completitud

No hay TODO ni «not implemented» en las 360 rutas de la campaña. Hay pocas
pruebas: `FateOfTheValeSpec`, `HemlockValeStandaloneSpec`, la de logros y cinco
de cartas sueltas. Es una implementación completa pero poco verificada: tomarla
como mapa, no como certificado.

### Discrepancia resuelta por errata

En la bolsa Experto, la guía española (p. 3) dice «… −5, −5, −6, −6, −8» y la
referencia usa «… −6, −7, −8». La referencia aplica la errata v2.3 de la FAQ
(`mcp/references/faq/campaign_guide_errata.md`), que también corrige otros seis
pasos de la guía. Todas las correcciones están recogidas en el documento 165.

## 5. Qué aprovechar y en qué orden

1. Consultar `mcp/references/faq/campaign_guide_errata.md` y `card_errata.md`
   antes de cada campaña nueva, empezando por esta.
2. Usar `local-faq/` y `engine-gotchas/` como lista de casos de prueba al
   implementar preludios, Lugares-Enemigo y modo independiente.
3. Estudiar `Campaigns/TheFeastOfHemlockVale/Helpers.hs` y `Key.hs` antes de
   definir nuestro estado de campaña, para no omitir claves del registro.
4. Mantener la [auditoría 15](15-auditoria-referencia-2026-10-17.md) como inventario
   de funcionalidades: esta copia no cambia sus conclusiones de producto.
