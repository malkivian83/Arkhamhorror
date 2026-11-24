# 165 · La fiesta del Valle de la Cicuta

Análisis previo y hoja de ruta para implementar la campaña oficial _The Feast of
Hemlock Vale_ (FFG, 2024): 8 escenarios, de los que cada partida juega 6, y
preludios jugables. Se incorpora con el mismo procedimiento que
[Los confines de la Tierra](106-confines-de-la-tierra.md).

**Estado:** entregas 0–5 completadas; son jugables el preludio de bienvenida y los cinco escenarios de exploración del Día 1.

## Estado y continuación

- Último paso: entrega 2 (21/11/2026), sobre `bf2b2c60`. Ver
  [Preludio de bienvenida implementado](#preludio-de-bienvenida-implementado).
- Verificado: pruebas de `hemlock-vale/`, `valley.test.ts`, la suite del motor,
  i18n, campañas y `apps/web/src/game` (dos pruebas pesadas agotaron el tiempo con
  toda la ejecución y pasan por separado); tipos de engine, cards, i18n y web;
  Prettier y ESLint. Lo invalidan cambios en `welcome.ts`, `setup.ts` (arrastre),
  los mensajes del Valle o la ruta de `campaign.ts`.
- Entrega 3 en lotes: **3a** cuadrícula (hecho, ver
  [Cuadrícula](#cuadrícula-de-lugares)); **3b** acto 1 de Escrito en la roca;
  **3c** acto 2 (raíles, Vagoneta, descarrilamiento) y resoluciones.
- Lotes 3b y 3c hechos: Escrito en la roca es jugable tras el preludio (ver
  [Escrito en la roca, acto 2](#escrito-en-la-roca-acto-2)).
- Entrega 4 hecha (21/11/2026): La Casa Cicuta es jugable tras el preludio (ver
  [La Casa Cicuta](#la-casa-cicuta)). Verificado: pruebas de `hemlock-vale/`, cobertura
  de partidas completas de los escenarios del Valle, i18n, campañas, `story-order`,
  referencia y ayuda de fichas de la web; tipos de cards y web; Prettier y ESLint. Lo
  invalidan cambios en `hemlock-house.ts`, `vale-encounters.ts` o el códice de `welcome.ts`.
- También corrige la CI #448: `scenario-coverage.test.ts` usa la ruta del Valle
  (`valley.route`) para preparar los escenarios de esta campaña.
- Entrega 5 en lotes: **5a** El páramo silencioso (hecho, ver
  [El páramo silencioso](#el-páramo-silencioso)); **5b** La hermana perdida (hecho); **5c** La
  cosa de las profundidades. Verificado 5a: sus 13 pruebas, `hemlock-vale/`, cobertura de
  partidas, campañas, `story-order` e i18n (851 pruebas); tipos de cards y web; Prettier y
  ESLint. Lo invalidan cambios en `silent-heath.ts`, las Cuevas de `written-in-rock.ts` o
  `vale-encounters.ts`.
- Lote 5b hecho (22/11/2026): La hermana perdida es jugable tras el preludio (ver
  [La hermana perdida](#la-hermana-perdida)). Verificado: sus 11 pruebas, `hemlock-vale/`,
  cobertura de partidas, campañas, `story-order`, i18n y narración de la web (893 pruebas);
  tipos de cards (sin contar errores ajenos de `finn-calvin`) y web; Prettier y ESLint. Lo
  invalidan cambios en `lost-sister.ts`, `vale-time.ts` o las Cuevas y encuentros compartidos.
- Lote 5c hecho (22/11/2026): La cosa de las profundidades es jugable (ver
  [La cosa de las profundidades](#la-cosa-de-las-profundidades)); entrega 5 completa.
- Entrega 6 en lotes: **6a** La primera tarde (hecho, ver
  [La primera tarde](#la-primera-tarde)); **6b** La hondonada retorcida (hecho). Verificado 6a: sus 6
  pruebas, `hemlock-vale/`, cobertura de partidas, campañas, `story-order`, i18n y narración de
  la web (940 pruebas); tipos de cards; Prettier y ESLint.
- Lote 6b verificado: sus 9 pruebas y 965 en total (Valle, cobertura, campañas, i18n y narración);
  tipos de cards y web; Prettier y ESLint.
- Entrega 7 en lotes: **7a** Alba del segundo día (hecho, ver
  [Alba del segundo día](#alba-del-segundo-día)); **7b** La segunda tarde; **7c** La noche más
  larga. Verificado 7a: sus 7 pruebas y 1.205 en total (Valle, cobertura, campañas, i18n,
  narración y referencia de la web); tipos de cards y web; Prettier y ESLint. Sus 32
  narraciones están pendientes: no quedan créditos de ElevenLabs suficientes.
- Siguiente: lote 7b (La segunda tarde).
- Bloqueos: ninguno. Hay que aplicar las [erratas oficiales](#erratas-oficiales).

## Hoja de ruta

- [x] 0 · Fuentes, inventario EN/ES de `fhvc`, escaneos y miniaturas.
- [x] 1 · Estado de campaña: día y hora, habitantes, zonas exploradas, bolsa y fatiga.
- [x] 2 · Preludios y códice: preludio de bienvenida jugable de principio a fin.
- [x] 3 · Adyacencia por cuadrícula y Escrito en la roca.
- [x] 4 · La Casa Cicuta.
- [x] 5 · El páramo silencioso, La hermana perdida y La cosa de las profundidades.
- [x] 6 · La primera tarde y La hondonada retorcida.
- [ ] 7 · Alba del segundo día, La segunda tarde y La noche más larga.
- [ ] 8 · Alba del último día, La última tarde, El destino del Valle y epílogo.
- [ ] 9 · Selector, guardados y recorridos completos de campaña.
- [ ] 10 · Locuciones con la voz de la campaña.
- [ ] 11 · Modo independiente de cada escenario (opcional).
- [ ] Revisión visual manual (persona usuaria).

Las cartas de jugador de la expansión de investigadores siguen la
[guía 59](59-guia-importar-lista-arkhamdb.md) y no bloquean la campaña (ver
[Expansión de investigadores](#expansión-de-investigadores)).

## Fuentes

| Material | Ubicación | Notas |
| --- | --- | --- |
| Guía de campaña ES | `reglas/AHLCG_La_fiesta_del_valle_de_la_cicuta.pdf` | 72 páginas con texto extraíble. Extracción en `tmp/pdfs/cicuta/guia-raw.txt` y `guia.txt` (`pdftotext -enc UTF-8`, con y sin `-layout`). |
| Reglas de la expansión de investigadores ES | `reglas/AHLCG_Investigadores_La_fiesta_del_valle_de_la_Cicuta.pdf` | 4 páginas: Bendición/Maldición, Escurridizo, Enlazada y FAQ. |
| Datos de cartas EN/ES | `D:/referencia/ArkhamHorror-main/frontend/public/cards_{en,es}.json`, paquete `fhvc` | 301 códigos (10501–10743), todos con texto en español. |
| Implementación de referencia | Ver [164 · Revisión de la referencia](164-revision-referencia-2026-11-21.md#4-the-feast-of-hemlock-vale-en-la-referencia) | Mapa de módulos y modelado. |
| FAQ y erratas | `mcp/references/faq/` y `local-faq/` de la referencia; `reglas/FAQ v2.5A.pdf` | Consultar antes de cada entrega. |

Los dos PDF están en `docs-proyecto/reglas/` sin añadir a git; según su
[README](reglas/README.md) se suben con el resto de reglas cuando se autorice un
commit.

**Iconos de fichas en el texto extraído.** `pdftotext` deja los iconos como
caracteres de uso privado: U+F25B calavera, U+F25C sectario, U+F260 tablilla,
U+F25E Primigenio, U+F25F símbolo arcano, U+F25D fallo automático, U+F276 Día y
U+F277 Noche.

## Inventario y recursos

```powershell
node scripts/inventory-hemlock-vale.mjs D:/referencia/ArkhamHorror-main
node scripts/inventory-hemlock-vale.mjs D:/referencia/ArkhamHorror-main --check
node scripts/inventory-hemlock-vale.mjs --arts
```

Salida: [inventario EN/ES](165-cicuta-inventario.json), con las huellas de
`cards_{en,es}.json`. El comando no modifica datos de juego. `--check` falla si
el inventario no coincide con las fuentes; `--arts` imprime los códigos de imagen.
El script valida códigos únicos y paridad EN/ES de tipo, conjunto, cantidad,
doble cara y ocultación.

- **301 códigos**: 251 visibles y 50 reversos ocultos con código propio
  (Lugares-Enemigo, Enemigos de doble cara, habitantes, etc.).
- **355 copias** según el catálogo fuente y **26 conjuntos**. Son entradas de
  datos, no reglas implementadas: revisar caras y cantidades contra las cartas
  antes de preparar mazos.
- **413 caras de imagen**: anverso y reverso de cada carta visible (`imagesrc` y
  `backimagesrc`) más los reversos ocultos. Es el mismo criterio que cubre las
  335 caras de Confines.
- **Escaneos:** descargados con `import-card-images.mjs` desde el CDN de la
  referencia: 413 EN y 412 ES (78 MB), registrados con huella en
  `evidencias/imagenes-locales.json`. El CDN no tiene el reverso español de
  `10513b` (Lugar de Escrito en la roca), así que la web muestra el inglés.
- **Miniaturas:** 825 nuevas con `generate-card-thumbnails.py --codes …`, que
  conserva las existentes (7.918 en total) en `evidencias/miniaturas-cartas.json`.
  En este equipo, `python` es el alias de la tienda de Windows; se usó el Python
  3.12 con Pillow de `~/.cache/codex-runtimes/…/dependencies/python/`.

Verificación: `--check`, Prettier y ESLint del script, y las 221 pruebas de
`spanishImages.test.ts` y `scenarioReference.test.ts` (manifiesto, archivos
presentes y miniatura por cara). Se invalidan si cambian las fuentes, el manifiesto
o las imágenes. No hay revisión visual: queda pendiente una hoja de contacto de
casos representativos (actos y planes apaisados, Lugares-Enemigo y habitantes).

## Estructura de la campaña

Son tres días con un escenario de día y otro de noche, enlazados por preludios.
Cada partida juega 6 de los 8 escenarios.

| Momento | Paso | Guía |
| --- | --- | --- |
| Día 1, mañana | Preludio: ¡Bienvenidos al Valle de la Cicuta! (jugable) | pp. 4–9 |
| Día 1 | Uno de los 5 escenarios de exploración | pp. 10–30 |
| Día 1, tarde | Preludio: La primera tarde (narrativo) | pp. 31–33 |
| Noche 1 | La hondonada retorcida, o un escenario de exploración no tachado jugado de noche | pp. 34–38 |
| Día 2, mañana | Preludio: Alba del segundo día (jugable) | pp. 39–42 |
| Día 2 | Escenario de exploración no tachado | — |
| Día 2, tarde | Preludio: La segunda tarde (narrativo) | pp. 43–45 |
| Noche 2 | La noche más larga, o un escenario de exploración jugado de noche | pp. 46–50 |
| Día 3, mañana | Preludio: Alba del último día (jugable) | pp. 51–54 |
| Día 3 | Escenario de exploración no tachado | — |
| Día 3, tarde | Preludio: La última tarde (jugable) | pp. 55–60 |
| Noche 3 | El destino del Valle | pp. 61–67 |
| — | Epílogo (3 finales + 4 entradas de códice) | p. 68 |

Los escenarios de exploración son Escrito en la roca (10501, zona Minas de la
Punta Norte), La Casa Cicuta (10523, Puerto de la Cicuta), El páramo silencioso
(10549, Cresta Perla), La hermana perdida (10569, Costa de Akwan) y La cosa de las
profundidades (10588, Ciénaga de Eastwick). Al terminar uno se tacha su zona y no
se puede repetir. La hondonada retorcida (Bosque oriental) y La noche más larga
(Campos del sur) también tachan su zona.

Elegir otro escenario en lugar de la Hondonada añade una tablilla y un
Primigenio a la bolsa de forma permanente. Elegirlo en lugar de La noche más
larga añade tablilla, calavera y Primigenio. Saltarse La noche más larga impide
la nota «la Dra. Marquez tiene un plan», que abre ramas del último día.

Cada escenario termina con un paso que depende del día y la hora: D1 → p. 31;
N1 → p. 39; D2 → p. 43; N2 → p. 51; D3 → p. 55.

### Bolsa de caos (p. 3)

| Dificultad | Fichas |
| --- | --- |
| Fácil | +1, +1, 0, 0, 0, −1, −1, −1, −2, −2, −3, 2 calaveras, símbolo arcano |
| Normal | +1, 0, 0, −1, −1, −1, −2, −2, −3, −3, −4, 2 calaveras, símbolo arcano |
| Difícil | 0, 0, 0, −1, −1, −2, −2, −3, −3, −5, −5, −7, 2 calaveras, símbolo arcano |
| Experto | 0, −1, −1, −2, −2, −3, −3, −4, −5, −5, −6, −7, −8, 2 calaveras, símbolo arcano (con la errata; la guía española dice −6, −6) |

La bolsa inicial no tiene fallo automático. El preludio de bienvenida añade una
tablilla (introducción 2) o un Primigenio (introducción 3), y su resolución añade
el fallo automático. Los efectos de las fichas están en las cartas de referencia
de cada escenario.

## Reglas nuevas y situación local

| Regla (página) | Situación en nuestro proyecto | Trabajo |
| --- | --- | --- |
| Día/Noche e Indicador de tiempo (p. 3) | No existe. | Estado de día y hora en la campaña y en la partida. Filtrar los textos precedidos de (Día)/(Noche) y la preparación condicionada. En La hermana perdida la hora depende del Lugar (rasgo Oscuro, p. 24). |
| Habitantes y nivel de relación (p. 3) | `CampaignLog` tiene notas, tachados y valores de texto, sin niveles. | Estado tipado: 8 habitantes con nivel, notas propias y tachado. Subir, bajar, fijar a 0 y umbrales. Un tachado no entra en juego y anula sus notas. |
| Códice (p. 2) | Brethren of Ash usa una palabra clave `codex` propia. | Entradas por escenario o preludio, una vez por partida salvo indicación, con secciones condicionadas a las notas y al nivel del habitante. Resuelve quien la activa o, si no está claro, el investigador jefe. |
| Preludios (p. 6) | No existen. | Partida sin mazo de Encuentros (prohibido robar, buscar o mirar en él), conexiones solo por iconos y arrastre al escenario. |
| Preludio y escenario son la misma partida (FAQ) | No existe. | No renovar «una vez por partida», no repetir ventanas de inicio, omitir los pasos 1–8 de preparación y conservar mano (como inicial), recursos iniciales, un Apoyo y pistas. |
| XP de preludios e interludios (p. 3) | La XP se gasta tras cada escenario. | XP anotada y bloqueada hasta que la guía lo indique. Los preludios no dan XP de Victoria. |
| Adyacencia en cuadrícula (p. 3) | `LocationCard.position` existe, pero las conexiones son por símbolo. | Adyacente = conectado, además de los iconos. Colocar en un espacio adyacente libre. Deslizar, intercambiar y compactar columnas. |
| Alerta, Escurridizo y Errante (p. 3) | Existen `alert`, `elusive` y el evento de patrulla. | Comprobar con pruebas: Escurridizo también al ser atacado, destino sin investigadores si es posible y agotarse. Errante con destino designado, elección del investigador jefe y bloqueo (barreras). |
| Fatiga (pp. 39 y 51) | No existe. | Sacar fichas hasta tener dos numéricas y sustituirlas por la de valor una unidad menor, de forma permanente. |
| Muerte y reemplazo (pp. 50–51) | Hay muertes y locura en el registro. | Devorado = muerto. Nuevo investigador con la mitad de la XP (redondeando hacia arriba) en Alba del último día. Si no queda ningún investigador, se pierde la campaña. |
| Reiniciar un preludio (p. 60) | No existe. | La última tarde, R3: repetir el preludio tachando «creyeron», o perder la campaña. |
| Carta pequeña de investigador (pp. 10–11, 63) | No existe. | Marcador del investigador: en la Vagoneta y en el Yo fragmentado. |
| Bendición/Maldición y Enlazada (expansión) | Implementadas ([130](130-bendiciones-y-maldiciones.md), [144](144-cartas-vinculadas.md)). | Reutilizar. |

Reglas propias de cada escenario, en la entrega correspondiente:

- **Escrito en la roca (p. 11):** raíles, Vagoneta (dirección, giro de 90° y
  descarrilamiento, que derrota a todos), chatarra y aguja, deslizar e
  intercambiar Lugares. Incluye el interludio «El derrumbe».
- **La Casa Cicuta (p. 16):** Lugares-Enemigo, pruebas de depredación con una
  bolsa propia, sellos y caída de columnas al derrotar un Lugar-Enemigo. Las
  plantas se cuentan por fila y el Sótano es la planta 0.
- **El páramo silencioso (p. 21):** montones boca abajo bajo Lugares con Restos
  cristalinos y la aparición de la Reina de progenie.
- **La hermana perdida (p. 24):** mazo de Cavernas, Lugares Oscuro y tres
  Enemigos de doble cara que cambian de lado según el Lugar.
- **La cosa de las profundidades (p. 28):** socavones (fichas de daño) y Lugares
  Hundidos.
- **La hondonada retorcida (p. 36):** nivel de oscuridad, zona de persecución,
  mazo de Bosque con colocación adyacente y Farol del Valle.
- **La noche más larga (p. 47):** barreras, señuelos y trampas, y un mazo de
  Enemigos separado (cada investigador roba uno en Mitos). Los investigadores
  derrotados quedan devorados.
- **La última tarde (p. 55):** habitantes por su lado de Apoyo o de Enemigo según
  su nivel, acto y plan en una sola carta y plan especial «Corderos al matadero».
- **El destino del Valle (pp. 62–64):** el mazo El abismo (se roba por abajo),
  Emisarios cósmicos en formación, Yo fragmentado / Viejo recuerdo, anillo de
  Nidos de espejos e interludio con cuatro versiones del acto 3.

## Registro de campaña (p. 70)

- Por investigador: XP sin gastar, traumas, debilidades y apoyos de historia.
- Notas de campaña, investigadores muertos y locos, y bolsa de caos.
- **Día/Hora:** tres filas de Día y Noche.
- **Zonas exploradas (7):** Minas de la Punta Norte, Puerto de la Cicuta, Cresta
  Perla, Costa de Akwan, Ciénaga de Eastwick, Bosque oriental (_Western Woods_
  en inglés, que es la versión que manda) y Campos del sur.
- **Habitantes (8)**, cada uno con notas y casillas de relación: Madre Rachel,
  Leah Atwood, Simeon Atwood, William Cicuta, River Hawthorne, Gideon Mizrah,
  Judith Park y Theo Peters. Casillas contadas en el registro a 300 ppp: seis por
  habitante; Judith y Theo, al menos siete (la decoración tapa el final de la
  fila). La guía nunca exige más de 5 y el logro «Best Friends Forever!» pide 6.
- Helen, Bertie, la Dra. Marquez y Ajax no tienen ficha: sus notas van a las
  notas de campaña.
- También se registran las marcas de los fuegos artificiales (Alba del último
  día) y las entradas del códice elegidas en las tardes.

### Estado de campaña implementado

Entrega 1. `CampaignLog.valley` (`ValleyState`, en `packages/engine/src/types.ts`)
es opcional: los guardados anteriores siguen cargando y las demás campañas no lo
tienen. Las funciones están en `packages/engine/src/valley.ts`.

- **Día y hora:** `day` (1–3) y `time` (`day`/`night`), con los mensajes
  `SetValleyTime` y `AdvanceValleyTime`: Día 1 → Noche 1 → … → Noche 3 (la guía
  usa «Día/Noche 3»). `valleyTime(log)` lo pone a disposición de las cartas. La
  hora por Lugar de La hermana perdida se hará en su entrega.
- **Habitantes:** nivel, notas, marcas por nota y tachado.
  - `ChangeRelationship` sube o baja de una en una, entre 0 y las casillas
    impresas (`valleyResidents`), o fija el nivel en 0 con `reset`.
  - `RecordResidentNote` anota notas; con `marks`, añade marcas como las de los
    fuegos artificiales. `CrossOutResident` tacha al habitante.
  - Para un habitante tachado, `relationshipLevel`, `residentNotes`,
    `residentHasNote` y `residentMarks` devuelven 0 o nada, y `residentAvailable`
    impide que entre en juego.
- **Zonas y códice:** `SurveyArea` (siete claves en inglés) y `ChooseCodexEntry`.
- **Bolsa:** `hemlockValeChaosBags` y `hemlockValeChaosBag(context)`, en
  `packages/cards/src/hemlock-vale/chaos-bag.ts`. Aplican la errata de Experto y
  no incluyen fallo automático inicial. Las fichas que añaden las decisiones usan
  `AddChaosTokens`, que ya las guarda en `log.chaosTokens`.
- **Fatiga:** `ValleyFatigue` usa el generador de la partida y cambia la bolsa en
  juego, sin tocar las bendiciones ni las maldiciones. Anota las sustituciones en
  `valley.fatigue`, que `hemlockValeChaosBag` aplica al preparar cada escenario.
  Un −8 no se puede rebajar y obliga a repetir el proceso.
- **Hora en el texto:** `activeTimeText(text, time)` quita los efectos de la otra
  hora, tanto en el formato inglés como en el español. La web muestra [day] y
  [night] como ☀ y ☾, porque la fuente de ArkhamDB no tiene esos glifos. Falta la
  revisión visual.
- **Partida independiente:** `randomValleyTime(seed)` elige el Indicador de
  tiempo y la hora.

### Preludio de bienvenida implementado

Entrega 2, en `packages/cards/src/hemlock-vale/` (`welcome.ts`, `vale-locations.ts` y
`definition.ts`). Textos en `packages/i18n/src/hemlock-vale.{en,es}.json`; el
catálogo de las 301 cartas sale de `scripts/import-hemlock-vale-cards.mjs` (con
`--check`).

- **Campaña:** `the-feast-of-hemlock-vale`, con `route` en `CampaignDefinition`.
  El orden se lee de `valley.route`; los cinco escenarios del Día 1 están
  registrados sin `build`, así que tras el preludio la campaña se detiene en el
  elegido. El preludio no permite gastar experiencia después (`allowDeckChangesAfter`).
- **Sin mazo de Encuentros:** `ScenarioDefinition.noEncounterDeck` omite el robo de
  la fase de Mitos y anula robos y búsquedas en ese mazo. Las cartas de jugador que
  lo usan se pueden seguir jugando, pero no tienen efecto sobre él.
- **Preparación:** Lugares de Día con sus iconos (p. 5), inicio en El cruce de
  caminos, 1 de perdición por investigador, Día 1 y bolsa de la campaña. La
  introducción añade la tablilla o el Primigenio.
- **Códice:** `ScenarioSpecific` `codex`, resuelto con el estado del momento (las
  cartas comprometidas a Negociar ya no están en la mano). Cada entrada se marca en
  `scenarioMeta` y deja de ofrecerse; la 14 es por investigador. Los habitantes
  entran como apoyos sin controlar (`PlaceAsset`) y su Negociar lee su entrada
  (pruebas con la etiqueta `parley`, coste de recursos de Judith y descarte de Theo).
- **Plan y acto:** las debilidades robadas se descartan; con el acto en juego no se
  recibe daño ni horror. Al avanzar el plan no se retira a nadie hasta preparar la
  R1: descartar hasta la mano inicial, elegir un apoyo, anotar recursos y pistas en
  `valley.carry`, añadir el fallo automático y elegir el estudio.
- **Arrastre:** `InvestigatorSetup.carried` empieza el escenario siguiente con esa
  mano, sin mulligan ni recursos iniciales, con las pistas y el apoyo, y `startScenario`
  lo consume una sola vez.
- **Web:** referencia 10704, catálogo de cartas, iconos [codex] (§), y caras con
  letra de esta campaña en `cards.ts`.

### Cuadrícula de Lugares

Lote 3a. `ScenarioDefinition.grid` activa `GameState.grid`: `position` es
[columna, fila] y `recomputeConnections` conecta los Lugares que comparten un lado,
además de por sus iconos (no en diagonal; un Lugar sin símbolo no conserva
conexiones impresas). `ScenarioBehavior.gridAdjacent` permite que el escenario
exija algo más (raíles alineados en el acto 2). Mensajes `SlideLocation` (a un
espacio vacío) y `SwapLocations`; `PutLocationIntoPlay` admite `position`.
Las cartas siguen en su Lugar porque se referencian por su id. Ayudas:
`gridNeighbors` y `emptyAdjacentPositions`. Pruebas en `grid.test.ts`.

### Escrito en la roca, acto 1

Lote 3b, en `hemlock-vale/written-in-rock.ts` y `rock-encounters.ts` (pruebas en
`written-in-rock.test.ts`). Aún sin `build` en la campaña: falta el acto 2.

- **Preparación:** 4 de las 6 Cuevas al azar en las columnas 1–4 y el Puesto de
  control en la 5, 1 chatarra en cada Lugar (`resources`), inicio en la columna 1,
  River en la columna 3 el Día 1 de día, Parásitos de cristal apartados y mazo con
  Horrores en la roca, Refracciones, Frío helador, Gules y el conjunto del día.
- **Plan 1:** recoger chatarra robando del mazo de Encuentros (5 recursos si es una
  traición [[Power]]); al avanzar, su perdición pasa al plan 2 y, si no lo avanza el
  acto, su reverso (daño, Puesto de control y pistas a 0).
- **Acto 1:** avanza al final de la ronda con todos en el Puesto de control; retira
  las Cuevas y a River sin controlar, deja 2 pistas, salta al plan 2a y convierte la
  chatarra en agujas (`scenarioMeta`). Después llega el interludio (lote 3c).
- **Referencia:** fichas del acto 1 con la columna del Lugar y la chatarra.
- **Cuevas:** las cinco con sus efectos. `ScenarioBehavior.leaveCost` (nuevo) cobra la
  acción extra del Túnel cubierto de vegetación. El velo del Túnel mineral usa la mano
  del investigador en turno.
- **Encuentros:** Parásito de cristal, Plaga cromática, Calcificación, Fulgor
  empíreo, Destello cautivador, Enjambre, Aguacero y Visiones de otro mundo.
- **Habitantes:** el Negociar sirve en cualquier escenario de la campaña; bajo
  control dan su +1 de habilidad y, si son derrotados, baja su relación. Pendiente:
  los espacios extra de Madre Rachel y Gideon y las acciones extra de Judith y Theo.

### Escrito en la roca, acto 2

Lote 3c, en `written-in-rock-act2.ts`, enlazado como `build` del paso
`hemlock-vale-written-in-rock`. Imágenes nuevas de las copias A/B (10512–10514) con
sus reversos y miniaturas.

- **Interludio:** red de 5×5 de la p. 11 (las filas de la guía se cuentan de abajo
  arriba), Puesto de control abajo a la izquierda, Salida férrea arriba a la derecha,
  elecciones al azar entre las parejas, 7 Lugares al azar en las casillas «?», Simeon
  o Leah apartados en la Vía hundida A, Esquirla prismática, Bestia subterránea de
  noche y agujas = chatarra + 1. Las cartas de Escrito en la roca y el descarte se
  barajan en el mazo.
- **Raíles:** `RAILS` guarda los iconos de cada carta (los de la referencia);
  `gridAdjacent` solo conecta raíles alineados en el acto 2.
- **Vagoneta:** estado en `scenarioMeta` (`cartLocation`, `cartFacing`); los
  investigadores van con ella y no pueden hacer acciones de movimiento. Se mueve al
  final de la fase de Enemigos, con la ficha de tablilla y con Curva deformada; el jefe
  puede gastar agujas para cancelar o repetir (dos veces por fase). Gira 90° al entrar;
  descarrila (derrota y 1 trauma físico) si no hay Lugar o raíl alineado. Derrumbe,
  Viaje salvaje y la Bestia lista la detienen o modifican.
- **Deslizar e intercambiar:** habilidades del acto 2, de las Curvas, del Puente y del
  Híbrido excavador; nunca el Lugar con un Apoyo de historia ni la Salida férrea.
- **Plan 2:** Cazador para todos, adyacentes conectados al moverse un Enemigo y, en su
  reverso, derrota con trauma a elegir.
- **Resoluciones:** R1–R5 según los Atwood, sin resolución según día y hora, y R6
  (Esquirla, River, Victoria, zona explorada y siguiente preludio en `valley.route`).

Pendiente: la reacción de la Esquirla prismática (ya se añade al mazo), resolver
Cazador una vez más con el plan 2, impedir otros movimientos ajenos a la Vagoneta, el
códice Θ de la Dra. Marquez y el modo independiente. Revisión visual pendiente: red
ferroviaria, Vagoneta y textos.

Pendiente para cuando haya un escenario jugable (entrega 3): conservar los usos
«una vez por partida» y no repetir las ventanas de inicio de partida entre el
preludio y el escenario. Las capacidades de los habitantes controlados y la carta
Día uno (10675, sin efecto) no hacen falta en este preludio. Revisión visual
pendiente: mapa del Valle, apoyos colocados y textos del códice.

### La Casa Cicuta

Entrega 4, en `hemlock-house.ts` (escenario) y `vale-encounters.ts` (¡Fuego!, Agentes
del color, Transfiguración y Plaga, compartidos con los siguientes escenarios).

- **Cuadrícula:** columnas 1–3 (izquierda, central, derecha) y piso f en la fila 5 − f;
  el Sótano es el piso 0. Los Lugares empiezan revelados por el lado Letargo, con pistas.
  El velo del Dormitorio es su piso + 1.
- **Lugares-Enemigo:** el Lugar sigue en juego y, al darle la vuelta, entra un Enemigo
  Masivo con el código del reverso (`10532b`…) en ese Lugar; `Location.shownCode` hace
  que la web muestre esa cara. Al volver al lado Lugar se guarda su daño. No se mueven
  por efectos de cartas. Al ser derrotados van a la zona de victoria y la columna cae un
  piso; sin Lugares encima, el jefe elige un Lugar adyacente para lo que hubiera; sin
  columna central, la izquierda se junta con la derecha.
- **Depredación:** bolsa en `scenarioMeta` (`predation:*` y `predationAside:*`), creada
  por el plan 1b según el día. Las fichas Primigenio que pasan de la bolsa de caos solo
  salen de la de esta partida: la R2 las devuelve y la bolsa de campaña no cambia.
- **Sellos:** recursos en el Lugar. Acto 1: 7 Lugares sellados o en la zona de victoria;
  según sellos frente a Lugares-Enemigo derrotados pasa a El corazón de la casa (entra
  el Sótano informe) o a Contra la casa (sin Lugares en juego, avanza).
- **Habitantes y códice:** Gideon, William, Judith, Theo y la Pequeña Sylvie según el día
  (de noche, ninguno; los tachados no entran). Códices 4, 6, 7, 8 y Σ.
  `registerCodexGate` limita repetir el códice 4 a quien controle a la Pequeña Sylvie.
- **Resoluciones:** sin resolución y R1 pasan a R2: XP por 8 y 10 sellos y Lugares-Enemigo,
  Pequeña Sylvie al mazo, reformas de Judith, Victoria, zona explorada y siguiente preludio.

Pendiente: las reacciones de la Pequeña Sylvie como carta de jugador; Desecación como
coste adicional real (ahora el daño se recibe al jugar la carta); descartar la
Podredumbre fúngica si su apoyo abandona el juego; el códice Θ; las capacidades de Gideon,
Judith y Theo controlados; y el modo independiente. Revisión visual pendiente: casa,
Lugares-Enemigo (se ven a la vez como Lugar y como Enemigo), bolsa de depredación y textos.

### El páramo silencioso

Lote 5a, en `silent-heath.ts` (pruebas en `silent-heath.test.ts`).

- **Lugares:** las Ruinas en [1, 1], la Pendiente en [3, 1] y la Arboleda en [2, 2],
  conectadas por sus iconos. Se apartan 3 Cuevas al azar de Horrores en la roca, que
  reutilizan los comportamientos de Escrito en la roca. De día se coloca a Leah (Día 1), a
  la Dra. Marquez (Día 2) o a la madre Rachel (Día 3). Las Introducciones 1–3 siguen con la 5.
- **Las madrigueras (reverso del acto 1):** las Cuevas entran sin revelar en [1, 2], [2, 1]
  y [3, 2]. Las 3 Guaridas y las 3 cartas superiores se reparten boca abajo bajo los 6
  Lugares (`Location.beneath`).
- **Montones:** una Guarida robada entra en el primer espacio libre adyacente al Lugar del
  que se robó. Su códice (Ω, Ψ o Φ) forma un montón con unos Restos apartados y las 2 cartas
  superiores. El Túnel de larvas hace aparecer además una Larva incolora. Robos: acto 2
  ([acción] sin pistas en tu Lugar; [rápida] mirar y poner debajo), Cámara de sal, Túnel de
  larvas (tras evitar) y Zona de cría (al terminar el turno, con 1 horror directo).
- **Restos cristalinos:** en el montón son una carta de encuentro con su código. Al
  revelarse entran como apoyo de historia del investigador, sin ir al descarte. Si son
  derrotados, vuelven con las 2 cartas superiores bajo la Guarida más cercana. La Arboleda
  y el desistir de las Ruinas los llevan a la zona de victoria (Victoria 1).
- **Insectos:** Larva (derrotada tras atacar), Soldado (Errante hacia Cuevas con pistas,
  +2 de velo si está preparado) y Reina (+1 combate por Insecto y salud + día ×
  investigadores). La Reina y la Desolación quitan Indiferente; la v.II además quita
  Errante y da Cazador.
- **Planes:** al colocar perdición, si la Reina está apartada, se sacan tantas fichas como
  Insectos haya en la zona de victoria (sin pasar por una prueba). Si sale una calavera o
  un fallo automático (plan 1) o un símbolo (plan 2), se lee el códice Σ: la Reina aparece
  con los Insectos de la zona de victoria.
- **Encuentros:** Resonancia imperiosa (una opción distinta por punto de fallo) y Defender
  el nido. La tarjeta de referencia tiene las cuatro fichas de cada dificultad.
- **Resoluciones:** según los Restos de la zona de victoria (3 → R1; 1–2 → R2; ninguno →
  R4), con notas de campaña, Victoria, Cresta Perla explorada y siguiente preludio.

Pendiente: el códice Θ de la Dra. Marquez (está colocada, pero sin reacción), las
capacidades de Leah y la madre Rachel controladas y el modo independiente. Revisión visual
pendiente: montones bajo los Lugares, Guaridas y Restos cristalinos.

### La hermana perdida

Lote 5b, en `lost-sister.ts` (pruebas en `lost-sister.test.ts`).

- **Hora por Lugar:** `vale-time.ts` (`nightAt`, `nightFor`, `nightForEnemy`) decide si las
  cartas de un Lugar usan sus efectos (Noche). En los demás escenarios manda el Indicador de
  tiempo; en este, `registerDarkLocations` marca como Noche los Lugares Oscuros. Lo usan el
  Parásito de cristal, el Fulgor empíreo, la Madriguera seca, la Sombra miasmática, Helen y
  los Micónidos. Corrige también el Parásito de cristal, que leía el daño de su ataque en vez
  de los daños que tiene encima.
- **Oscuro:** el lado sin revelar («Caverna») es Cueva y Oscuro; el revelado, según la carta
  (las Cuevas de Horrores en la roca siguen siendo Oscuras). Lo pierden con Crecimiento
  luminoso o con la Cueva abierta iluminada (hasta la siguiente fase de Investigación).
- **Mazo de Cavernas:** en `scenarioMeta.caverns` (ids de Lugares apartados). Akwan en
  [6, 6] y las 3 primeras a la izquierda, debajo y a la derecha. Entra una Caverna adyacente
  al descubrir la última pista de una Cueva y con el Cementerio suspendido; el Negociar de
  Akwan (Días 1 y 2) ordena las 3 primeras. El reverso del acto 1 pone la Cueva fúngica junto
  a un Costero (sin investigadores si se puede) y la rodea de Cavernas hasta 4 vecinos.
- **Híbridos:** cada Enemigo de doble cara se da la vuelta en cuanto queda en un Lugar que no
  le corresponde (comprobación en cada ventana Obligado). Conserva id, daño, perdición y
  vinculadas, y aplica su Obligado al cambiar de lado. A la luz, el crustáceo reduce a 1 el
  daño de los ataques y el límulo no hace ataques de oportunidad.
- **Habitantes:** Helen, Theo (Días 1–2) y Gideon (Días 2–3) entran bajo control (Helen sin
  espacio de aliado, con su +1 según la hora y su reacción de evitar); William en Akwan el
  Día 3. Los habitantes controlados ya pueden Negociar (`welcome.ts`). Códices 4, 6, 8 (en
  dos pasos: discusión y reconciliación con [willpower] (4)) y Σ.
- **Encuentros:** Musgo cavernario, Recuperado por la naturaleza, Crecimiento luminoso y los
  conjuntos compartidos Mutaciones (Mutación repentina, Crecimiento antinatural) y Micónidos
  (Amanita negra, Liquen cadavérico, Esporas psicotrópicas).
- **Resoluciones:** R1 con R2 (familia reunida) o R3 (Elizabeth salvada); sin resolución,
  +1 XP; R4 con el tesoro de Gideon, Victoria, Costa de Akwan explorada y siguiente preludio.

Pendiente: vincular el Musgo cavernario a un Objeto (ahora es un Enemigo normal), el códice
Θ, el modo independiente y la revisión visual (mazo de Cavernas, Lugares Oscuros, Híbridos y
textos).

### La cosa de las profundidades

Lote 5c, en `thing-in-the-depths.ts` (pruebas en `thing-in-the-depths.test.ts`). Con él son
jugables los cinco escenarios de exploración del Día 1.

- **Cuadrícula:** 9 de los 10 Lugares de doble cara (uno al azar fuera) en 3×3, lado Ciénaga
  boca arriba. Orilla norte en [3, 1], Lugar inicial en [1, 3], Ciénaga de los arándanos en
  [3, 3] y centro en [2, 2]. El Día 2 o la Noche 2 el plan empieza con 1 de perdición; el Día 3
  (de día), con 2.
- **Socavones:** en `scenarioMeta` (`sink:<Lugar>`). Con 3 o más se quitan y el Lugar pasa a
  Aguas abiertas (`sunk:<Lugar>`, velo 5, `shownCode` del reverso), conservando pistas,
  investigadores, Enemigos y Traiciones. Los colocan los planes al terminar el turno en un Lugar
  Ciénaga (2 con 1 o 2 investigadores), la tablilla, Perturbación del terreno, Lodo que te
  hunde, el Muelle podrido y el Sendero anegado; el sectario y el códice Θ los quitan. Aguas
  abiertas hace robar un Encuentro al entrar.
- **Cosa de las profundidades:** aparece en el centro hundido con el reverso del plan 1; al
  moverse está conectada a cada Lugar Hundido y se cura 2 tras atacar en una Ciénaga. Su
  derrota es el objetivo del plan 2 (→R4).
- **Híbrido chelydra:** Errante al Lugar vacío más cercano (o al elegido con el acto 2 esa
  ronda); no se mueve enfrentado ni con una Abominación preparada en su Lugar, que además le
  hace daño al final de la fase de Enemigos. En el Lugar inicial al final de la ronda avanza el
  acto (→R2 el Día 1, →R1 si no); si es derrotado, →R3. Tentáculos aferradores con salud igual
  al día.
- **Habitantes:** Día 1, Judith en la Orilla norte y la Dra. Marquez bajo control (sin espacio
  de aliado, +1 [intellect] y [agility], y códice Θ tras descubrir la última pista de su Lugar);
  Días 2 y 3, River. Códice 5 en dos pasos (la segunda vez, en la Ciénaga de los arándanos) y 7.
- **Introducciones:** el Día 1 según la relación de Judith (2 o 3); el Día 2 se elige empujar
  (−2 recursos) o forzar el motor (1 acción menos el primer turno).
- **El bosque** (compartido con La hondonada retorcida): Flor venenosa, Vigía del bosque, Ciervo
  coclear, Florecimiento, Muro de espinas y Llamada de lo salvaje.
- **Resoluciones:** R1–R4 y sin resolución, seguidas de la R5 (relación de River y Judith,
  Victoria, Ciénaga de Eastwick explorada y siguiente preludio).

Pendiente: descartar las cartas de jugador vinculadas al Lugar que se hunde, el modo
independiente y la revisión visual (cuadrícula, socavones y Lugares Hundidos).

### La primera tarde

Lote 6a, en `first-evening.ts` (pruebas en `first-evening.test.ts`). El preludio narrativo
se juega como una partida que solo contiene la historia (sin mazo de Encuentros) y termina
durante la preparación.

- **Comida:** cada investigador decide si sigue comiendo; se anota
  `hemlockValeFinishedTheirMeal:<investigador>`.
- **Asientos:** cada investigador elige una entrada distinta (Θ, Δ, Σ, Ω, Γ, Π); en solitario,
  dos, y Π no puede ser la primera. Se registran con `ChooseCodexEntry` (`firstEvening.<entrada>`).
  Cada entrada tiene sus decisiones, relaciones, notas y experiencia; Ω ofrece a Helen Peters si
  la familia Peters se reunió y Π da la Roca de la preocupación (10713, registrada sin su
  reacción).
- **Resolución 1:** pasa a la Noche 1 y elige La hondonada retorcida u otro escenario de
  exploración sin tachar (con una tablilla y un Primigenio permanentes). La experiencia no se
  gasta hasta el final del escenario siguiente (`allowDeckChangesAfter: false`).

Pendiente: la reacción de la Roca de la preocupación y la revisión visual del preludio.

### La hondonada retorcida

Lote 6b, en `twisted-hollow.ts` (pruebas en `twisted-hollow.test.ts`). Noche 1.

- **Introducción:** decir la verdad o mentir a la madre Rachel cambia la preparación, así que se
  pregunta al final de La primera tarde, al elegir buscar a Bertie (nota y ficha de sectario o
  de Primigenio). La introducción del escenario lee la 1 y la 2 o la 3.
- **Bosque:** el Lugar inicial en [5, 5] y cuatro cartas del mazo de Bosque alrededor. Al revelar
  un Lugar (plan 1) se colocan cartas del mazo en los espacios vacíos de alrededor. El mazo está
  en `scenarioMeta.woods`; los Lugares que vuelven a él se devuelven a los apartados.
- **Oscuridad:** `scenarioMeta.darkness` (empieza en 1). Todos los Lugares son Oscuros salvo los
  iluminados por el Farol encendido (el Rayo de esperanza también ilumina los conectados).
- **Farol del Valle:** encendido, controlado; apagado, colocado en un Lugar (se toma con [acción]
  o [rápida] según la versión). Lo apagan Sombras profundas, Luz robada y el Híbrido acechador.
- **Persecución:** `scenarioMeta.pursuit` guarda carta, daño y perdición de cada Enemigo. En el
  acto 1, los Enemigos robados sin instrucciones de aparición van a ella. Las cartas de Lugar,
  traiciones, fichas y planes hacen aparecer al de más combate, evasión o salud.
- **Planes:** Oscuridad creciente se repite (`repeats`): sube la oscuridad (con 6, derrota y
  trauma), los Enemigos de lo Oscuro sin enfrentar van a la persecución, los Lugares Oscuros vacíos
  vuelven al mazo o a su lado sin revelar y quien lleva el Farol hace [willpower] (oscuridad).
  ¡De vuelta al Valle! sustituye al plan con la misma perdición tras el acto 2.
- **Actos:** Búsqueda desesperada (todos en una Guarida, 3 pistas por investigador) lleva al
  códice Σ (Judith o Theo apartados por su relación, o la madre Rachel) y al Híbrido úrsido.
  ¿Dónde está Bertie? termina en la Hondonada (2 pistas por investigador): Bertie bajo control,
  diagrama de la p. 36 y el oso en la Hondonada. El tercer acto (el código de ¡De vuelta al Valle!)
  solo mantiene la mesa: desistir todos lleva a la R1.
- **Habitantes:** la Dra. Marquez bajo control (códice Θ: revelar un Lugar ignorando sus Obligado)
  y Bertie (Negociar rápido, códice Ω).

Pendiente: la reacción del Rayo de esperanza al entrar en un Lugar, ver la zona de persecución en
la web (ahora no se muestra), el modo independiente y la revisión visual (Bosque, Farol,
persecución y el tercer acto, que muestra la carta del plan especial).

### Alba del segundo día

Lote 7a, en `dawn-second-day.ts` (pruebas en `dawn-second-day.test.ts`). Preludio jugable con
el mismo armazón que el de bienvenida: el Valle de día, sin mazo de Encuentros, tarjeta de
referencia del Valle (10704), plan Nubes oscuras (10683) y acto Alba del segundo día (10684).

- **Antes de preparar:** fatiga (`ValleyFatigue`) y, según la comida de La primera tarde, La
  maldición Cicuta (10685, debilidad con iconos que restan) o Hambre de lobo (1 trauma físico).
- **Preparación:** Día 2; se empieza en la Pensión, Judith en El cruce de caminos y perdición
  igual al número de investigadores. Los demás habitantes entran por el códice (9, 11, 13 y 15).
- **Códice:** 1 (Muñeca de hojas de maíz si la madre Rachel intervino), 3–8 con las notas de
  la Noche 1, 9 (repetible), 10 (recado), 12, 13 (William o River con relación 2 o más), 14
  (completa el recado o paga 3 recursos por un Objeto) y 16 (un Apoyo de historia Objeto como
  regalo). `welcome.ts` exporta las ayudas que comparten los preludios.
- **Resolución:** R1 o R2 según Bertie, R3 con los preparativos del preludio (mano, recursos,
  un Apoyo) y la elección del escenario del Día 2.

Pendiente: los efectos de La maldición Cicuta al fallar y al final del turno, la habilidad de
la Muñeca de hojas de maíz, las opciones adicionales del códice 9 pagando acciones, el códice
17 (oculto en la carta de acto), sus 32 narraciones y la revisión visual.

## Entregas y criterios de aceptación

Cada entrega exige comportamiento probado, textos EN/ES, registro explícito y
conexiones. Importar datos no habilita contenido. Las revisiones visuales quedan
a cargo de la persona usuaria, sin pruebas de navegador.

**0 · Fuentes e inventario.** Script `inventory-hemlock-vale.mjs`, análogo a
`inventory-edge-of-the-earth.mjs`, con salida `165-cicuta-inventario.json`.
Debe guardar códigos, conjuntos, cantidades, tipos, paridad EN/ES y huellas de
las fuentes, y tener un modo `--check`. Escaneos y miniaturas EN/ES con huella.
Completada: ver [Inventario y recursos](#inventario-y-recursos).

**1 · Estado de campaña.** Estado `valley` con valores iniciales compatibles,
Indicador de tiempo, filtro (Día)/(Noche), bolsa por dificultad, adición de
fichas por decisiones y fatiga. Pruebas: niveles (subir, bajar, cero y tope),
tachado que anula las notas, fatiga reproducible con semilla, guardar y cargar.

**2 · Preludios y códice.** Partida de preludio sin mazo de Encuentros (prueba de
que las búsquedas y robos en él no se pueden usar), mapa del Valle por iconos
(p. 5) y habitantes como apoyos de historia de doble cara con su habilidad de
códice. Arrastre preludio → escenario como una sola partida. Criterio: el
preludio de bienvenida completo con sus 16 entradas y la elección del escenario
siguiente. La resolución deja la mano, los recursos, un Apoyo y las pistas tal
como indica la p. 6.

**3 · Cuadrícula y Escrito en la roca.** Adyacencia general (también la usan
Casa, Cosa, Hondonada y Destino) y las reglas de la p. 11. Pruebas de
descarrilamiento, giro, deslizar e intercambiar, Lugares con Apoyo de historia
inmóviles, las resoluciones R1–R6 y los habitantes según el día.

**4 · La Casa Cicuta.** Lugares-Enemigo (leer antes las notas de la referencia
citadas en el documento 164), bolsa de depredación, sellos y caída de columnas.
Pruebas de la R2: devolver los Primigenio a la bolsa de campaña y XP por sellos y
por Lugares en la zona de victoria.

**5 · Páramo, Hermana y Cosa.** Cada escenario con preparación de Día y de Noche
y sus reglas propias. Pruebas de los Enemigos de doble cara (inmediato y sin
interrupción, conservan fichas) y de los Lugares Hundidos (descartan socavones y
vinculadas).

**6 · Primera tarde y Hondonada.** Tarde narrativa: elección de comida, entradas
distintas por investigador (dos en solitario, Π no puede ser la primera) y XP
bloqueada. Hondonada con oscuridad, persecución, mazo de Bosque, Farol y el oso.

**7 · Segundo día.** Alba del segundo día (fatiga, La maldición Cicuta y 16
entradas), segunda tarde (bailes con relación ≥ 3) y La noche más larga
(defensas, mazo de Enemigos y XP según el daño en Los cautivos).

**8 · Último día y final.** Alba del último día (reemplazo de muertos, segunda
fatiga y marcas), La última tarde (lado según la relación y reinicio) y El
destino del Valle (abismo, Emisarios, Yo fragmentado, cuatro versiones del acto
3 y resoluciones R1–R5). Epílogo con sus entradas condicionadas. Las condiciones
de varias resoluciones están en las cartas de acto y no en la guía: tomarlas de
las cartas.

**9 · Recorridos.** Pruebas de integración con 1–4 investigadores y las cuatro
dificultades: cada escenario de exploración en cada día, saltar la Hondonada y La
noche más larga (logro «Colorear fuera de las líneas»), muertes en La noche más
larga, reinicio de La última tarde, los tres epílogos y guardado en cada
transición. Regresiones de las campañas previas si se amplía la progresión
compartida.

**10 · Locuciones.** Ver [Narración](#narración).

**11 · Modo independiente (opcional).** Cada escenario se puede jugar suelto
(p. 12): día al azar y moneda de Día/Noche. La referencia usa una bolsa propia,
`hemlockStandaloneBag`. Va después de la campaña.

Los logros (p. 69, 24 logros) quedan fuera del alcance salvo que se pidan.

## Narración

Voz de ElevenLabs elegida por la persona usuaria el 21/11/2026 para esta
campaña: **`Nh2zY9kknu6z4pZy6FhD`**.

Alcance, como en las campañas anteriores:

- Introducciones, resoluciones, interludios y epílogos de la guía.
- Entradas del códice: son el núcleo narrativo de esta campaña. Se graba solo su
  relato, no las instrucciones.
- Texto narrativo (`flavor`/`back_flavor`) de planes y actos.

Generador: `scripts/generate-hemlock-vale-audio.mjs`.

- Opciones: `--refresh`, `--generate --key-stdin`, `--only=`.
- Graba solo el relato. Deja fuera los textos de reglas (preparaciones, deslizar,
  Vagoneta) y los párrafos de instrucciones de códices y discusiones.
- Reutiliza por huella las grabaciones de textos idénticos y nunca sobrescribe una
  grabación distinta.
- Registra el coste, las huellas y la voz en `evidencias/hemlock-vale-narracion.json`.
- El manifiesto de la web es `hemlockValeNarrationManifest.json`.

El 21/11/2026 se grabaron los 60 relatos de las entregas 0–4: 41.071 caracteres y
16.426 créditos del plan Starter. La cuenta gratuita no permite voces de la
biblioteca por la API. No hay ningún texto ni párrafo repetido. Las frases
compartidas entre las introducciones de La Casa Cicuta no se empalman, para no
romper la entonación. Las entregas siguientes se graban con el mismo comando al
añadir sus textos. Las cartas de plan y acto del Valle no tienen texto de
ambientación en `hemlock-vale-cards.es.json`.

## Expansión de investigadores

El PDF de reglas no cambia la campaña. Situación según el catálogo local
(`fhvp`, 140 códigos):

- 99 códigos ya aparecen en nuestras cartas, entre ellos Envío de pieles (10109)
  y Relicario ocultista (10132).
- Faltan los cinco investigadores con sus exclusivas y debilidades: Wilson
  Richards (10001–10003), Kate Winthrop (10004–10008), Alessandra Zorzi
  (10009–10011), Kōhaku Narukami (10012–10014) y Hank Samson (10015–10018, con
  Decidido enlazado). Se suben con la guía 59 y su mazo oficial.

Reglas y FAQ del PDF, para la importación:

- **Bendición/Maldición:** +2 o −2 y revelar otra ficha; vuelven a la reserva; 10
  como máximo entre bolsa y fichas selladas; sin efecto fuera de pruebas. Cuentan
  como «fichas con símbolo». Ya está implementado.
- **Enlazada:** sin nivel ni hueco en el mazo, puesta aparte al comienzo de cada
  partida. Una Debilidad enlazada deja de formar parte del mazo durante la
  campaña. Ya está implementada.
- **Kate Winthrop** controla y puede gastar las pistas de sus Apoyos. Por su
  Obligado, esas pistas pasan a su Lugar cuando el Apoyo abandona el juego.
- **Alessandra Zorzi:** Negociar de Cautivar asignado a investigar o evitar sigue
  siendo Negociar, así que activa Elegante.
- **Hank Samson:** su capacidad solo se activa al ser derrotado por daño u horror,
  no por derrota directa. Decidido no entra con traumas: estos solo se asignan en
  el paso 2 de la preparación.
- Mover daño u horror exige que la carta de destino tenga salud o cordura.
- Reponer: añadir usos hasta el valor de usos, sin superarlo.
- Coordinación ojo-mano solo evita el primer coste: el Microscopio sigue pagando
  sus acciones adicionales.
- Ojos de Valusia y Hoja de Yoth se intercambian simultáneamente y ocupan los
  mismos espacios.

## Erratas oficiales

Errata de guías de la FAQ (v2.2–v2.3), según la copia de
`mcp/references/faq/campaign_guide_errata.md` de la referencia. La guía española
no las incorpora. Prevalecen sobre la guía; contrastarlas con
`reglas/FAQ v2.5A.pdf` al implementar cada paso.

| Paso | Corrección |
| --- | --- |
| Preparación de la campaña (p. 3) | La bolsa Experto lleva un −7 en lugar de uno de los −6. |
| Escrito en la roca, El derrumbe 4 (p. 10) | La Esquirla prismática va al Lugar inferior de la **columna 5** (la guía española dice 4). |
| La Casa Cicuta, preparación (p. 15) | Apartar los cinco ¡Fuego! y todas las copias de Salen de las paredes y Atraído. Si la Pequeña Sylvie no está en juego, se retira de la partida. |
| La hondonada retorcida | Solo se puede jugar en la Noche 1. |
| La noche más larga | Solo se puede jugar en la Noche 2. |
| Alba del último día, códice 7 | Judith 2: tomar el control de Judith Park; al terminar el preludio, se aparta fuera del juego. |
| La última tarde, códice 6 | Empieza por «Si Gideon contó el relato de…». |
| La última tarde, códice 13 | El primer recuadro termina con «…bajo tu control. No puedes activar su códice durante este preludio». |

La FAQ también confirma que preludio y escenario siguiente son la misma partida
(`faq/qa/144_…`; ver la tabla de reglas nuevas).

## Decisiones pendientes

1. **Casillas de Judith y Theo:** se usan 7 porque la decoración del registro
   (p. 71) tapa el final de su fila. Solo importa si su nivel pudiera pasar de 7.
