# 165 · La fiesta del Valle de la Cicuta

Análisis previo y hoja de ruta para implementar la campaña oficial _The Feast of
Hemlock Vale_ (FFG, 2024): 8 escenarios, de los que cada partida juega 6, y
preludios jugables. Se incorpora con el mismo procedimiento que
[Los confines de la Tierra](106-confines-de-la-tierra.md).

**Estado:** entregas 0–2 completadas; el preludio de bienvenida es jugable y los escenarios aún no.

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
- Siguiente: entrega 4 (La Casa Cicuta).
- Bloqueos: ninguno. Hay que aplicar las [erratas oficiales](#erratas-oficiales).

## Hoja de ruta

- [x] 0 · Fuentes, inventario EN/ES de `fhvc`, escaneos y miniaturas.
- [x] 1 · Estado de campaña: día y hora, habitantes, zonas exploradas, bolsa y fatiga.
- [x] 2 · Preludios y códice: preludio de bienvenida jugable de principio a fin.
- [x] 3 · Adyacencia por cuadrícula y Escrito en la roca.
- [ ] 4 · La Casa Cicuta.
- [ ] 5 · El páramo silencioso, La hermana perdida y La cosa de las profundidades.
- [ ] 6 · La primera tarde y La hondonada retorcida.
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

Crear `scripts/generate-hemlock-vale-audio.mjs` a partir del generador de
Confines (`--refresh`, `--generate`, `--only=`), con reutilización de textos
idénticos y registro de coste, huellas y voz en
`evidencias/hemlock-vale-narracion.json`. Para las cartas, añadir la campaña a
`generate-campaign-card-audio.mjs`. La credencial se pasa por entrada estándar,
sin guardarla. El 19/11/2026 el saldo de ElevenLabs quedó a cero: confirmar
cuota antes de generar.

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
