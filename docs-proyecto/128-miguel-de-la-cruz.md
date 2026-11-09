# 128 · Miguel de la Cruz

09/11/2026. Petición: incorporar el investigador [Miguel de la Cruz](https://arkhamdb.com/set/mig),
sus exclusivas y su mazo inicial completo, con reglas, pruebas y presentación EN/ES.

## Alcance

El pack reúne **32 códigos** (`60551`–`60582`). Había 19 jugables. Este lote incorpora
**13 códigos jugables / 12 cartas o niveles distintos nuevos / 1 reedición**: Pata de conejo
(`60560`), equivalente a `01075` (mismo texto en inglés y en español; huella de equivalencia en
`approvals.json` y `rabbits-foot-source.json`).

| Código  | Carta                     | Módulo        |
| ------- | ------------------------- | ------------- |
| `60551` | Miguel de la Cruz         | investigador  |
| `60552` | Morral de Miguel          | exclusiva     |
| `60553` | Híbrido felino            | debilidad     |
| `60554` | Bebedor de sangre         | debilidad básica |
| `60560` | Pata de conejo            | reedición de `01075` |
| `60562` | Trampa de señuelo         | Trampa        |
| `60563` | Otear con prismáticos     | Trampa        |
| `60565` | Refugio oculto            | vinculado     |
| `60566` | Esperar al acecho         | Trampa        |
| `60567` | Acechar a la presa        | evento        |
| `60576` | Tácticas de guerrilla (2) | evento        |
| `60578` | Trampa de cuerda          | Trampa        |
| `60581` | Bomba improvisada         | Trampa        |

El mazo inicial `miguel` es la lista oficial del producto: sus dos exclusivas, la Debilidad
básica incluida (Bebedor de sangre) y dos copias de cada carta de nivel 0 (`60555`–`60569`),
33 cartas. Miguel admite Superviviente y neutrales 0–5, tamaño 30. Los datos se registran en
`core-2026/player-cards.ts` antes de calcular exclusivas de construcción y compras.

## Capacidades nuevas del motor

Todas son aditivas y no cambian el comportamiento previo si no se usan:

- **Eventos vinculados a Lugares** (`GameState.locationAttachments`, tipo `LocationAttachment`):
  mensajes `AttachEventToLocation` (con `limitTrait` para «Límite de 1 Trampa por Lugar» y
  `limitTitle` para «Límite de 1 por Lugar»; si la comprobación falla, la carta sigue en la pila
  de descartes, RR *Attach To*), `ExhaustLocationAttachment` y `DiscardLocationAttachment` (a la
  pila de descartes de su propietario). Se preparan en `ReadyAll` (mantenimiento) y se descartan
  si su Lugar sale de juego. Su propietario conserva el control.
- **Capacidades de los vinculados**: `PlayerCardBehavior.locationAttachmentReactions` y
  `locationAttachmentForced`, recogidas en `reactionOptions` y `forcedAbilities`. Las reacciones
  las activa su propietario desde cualquier Lugar. Se reutiliza la ventana existente
  `enemyEntersLocation` (aparición, `MoveEnemy`, movimiento de Cazador e intercambios).
- **«Como si estuvieras en…»** (RR *As if…*): `PlayEventAt` marca la resolución pendiente
  (`ResolvePlayedCard.at`) de un evento ya pagado; el investigador se trata como si estuviera en
  ese Lugar durante toda la resolución y `EndPlayAt` lo devuelve a su Lugar real, sin moverse ni
  resolver enfrentamientos. Si el evento lo mueve de verdad, el movimiento se mantiene; los
  enemigos enfrentados siguen en su zona de amenaza.
- **Acción adicional restringida por tipo**: `InvestigatorBehavior.traitAction` acepta ahora
  `cardType` además de `trait` (Marie: Hechizos; Miguel: Eventos). Nuevas utilidades
  `traitActionAvailable` y `traitActionCard`; `traitActionTrait` conserva su contrato.
- **Inmune a efectos de cartas de Jugador** (`EnemyBehavior.immuneToPlayerCards`,
  `immuneToPlayerCards`): `attackBlocked` impide elegirlo como objetivo de un ataque iniciado por
  una carta de Jugador (evento o capacidad de apoyo) y `DamageEnemy` ignora el daño cuyo origen
  es una carta de Jugador (`log.enemyImmunePlayerCards`). `EvadeEnemy`, `ExhaustEnemy`,
  `DisengageEnemy` y `MoveEnemy` ignoran los efectos cuyo origen (`effectSource`) es una carta de
  Jugador distinta del propio enemigo (`ignoresPlayerCardEffect`), y `attackDamage` no suma el
  daño de habilidades comprometidas ni de mejoras vinculadas contra él. Sus propias palabras clave
  (Escurridizo) sí lo mueven y agotan.
- **`SearchTopEncounterForEnemy`**: busca un Enemigo elegido entre las N primeras cartas del mazo
  de Encuentros, lo roba y baraja el mazo.
- Interfaz: `LocationMap` muestra los eventos vinculados de cada Lugar (agotados o no).

## Reglas y decisiones

- **Miguel**: la acción adicional solo paga jugar un Evento y se gasta antes que las normales;
  sin acciones normales solo ofrece Eventos. Signo arcano: +1 y, opcionalmente, recupera una
  carta Truco o Trampa de la pila de descartes.
- **Morral de Miguel**: «Cuando juegues un Evento» se resuelve en la ventana posterior al pago y
  anterior a la resolución, como en la aplicación de referencia. Con el Morral preparado, un
  Evento es jugable si es legal en el Lugar real o en algún Lugar conectado, comprobado «como si»
  Miguel estuviera allí (`PlayerCardBehavior.playEventsAtConnecting`, `eventLegalAt`,
  `connectingPlayLocations`): combatir o evitar a enemigos de un Lugar conectado, objetivos «en tu
  Lugar» y límites por Lugar como el de las Trampas. Si solo es legal en un Lugar conectado, el
  Morral se agota de forma obligada y el evento se resuelve en uno de esos Lugares, sin la opción de
  robar; si es legal en el Lugar real, la reacción es opcional y ofrece los Lugares conectados
  válidos o robar 1 carta. Revisado el 09/11/2026 con las FAQ (sin resolución) y la referencia
  (`MiguelsKnapsack.hs`).
- **Trampas**: «Límite de 1 Trampa por Lugar» cuenta las Trampas de cualquier propietario.
  Señuelo, Esperar al acecho y Cuerda no pueden elegir a un enemigo inmune; Otear con
  prismáticos no afecta al enemigo, así que un enemigo inmune también la activa, igual que la
  Bomba (que no le inflige daño). Esperar al acecho ofrece su +1 de daño en la ventana «cuando
  fueras a tener éxito»; Otear ofrece la pista adicional tras la investigación si quedan pistas.
- **Trampa de cuerda** («Cuando un Enemigo entre»): el motor no emite una ventana «cuando va a
  entrar» en el movimiento de Cazador; se usa la ventana de entrada común a todos los
  movimientos, inmediatamente tras entrar. El daño se resuelve antes que cualquier efecto
  «después» elegido por los jugadores en esa ventana.
- **Bomba improvisada**: daño simultáneo a enemigos e investigadores del Lugar con derrotas
  comprobadas al final (patrón de Explosión de dinamita).
- **Refugio oculto**: sin acción rápida; cada investigador del Lugar elige al final de la ronda
  entre robar, obtener un recurso o curar daño u horror (solo si lo tiene), o no hacer nada. Se
  descarta obligatoriamente cuando entra un enemigo, también al aparecer allí.
- **Aparecer cuenta como entrar**: se mantiene el criterio del motor (la aparición abre
  `enemyEntersLocation`).
- **Acechar a la presa**: el enemigo robado se identifica como el nuevo enemigo en juego tras
  resolverlo; si aparece en otro Lugar, se ofrece moverse una vez por un camino más corto.
- **Tácticas de guerrilla (2)**: reutiliza el registro de `60564`, ahora parametrizado
  (`registerGuerrillaTactics`), con +2 y 1 daño adicional si la prueba tiene éxito (también al
  evitar). Ambos niveles excluyen ahora objetivos bloqueados o inmunes.
- **Híbrido felino**: Escurridizo, Cazador, Presa (solo Miguel), inmune a efectos de cartas de
  Jugador. Se puede combatir, evitar y enfrentar con las acciones básicas. Decisión: las armas y
  eventos que atacan no pueden elegirlo como objetivo (RR *Immune*: no puede ser «elegido para ser
  afectado»).
- **Bebedor de sangre**: Cazador, Represalia; tras atacar se cura 1 punto de daño.

Fuentes: [API `mig` EN](https://arkhamdb.com/api/public/cards/mig.json),
[API `mig` ES](https://es.arkhamdb.com/api/public/cards/mig.json), el
[Reglamento de ArkhamDB](https://arkhamdb.com/rules) (*Immune*, *Attach To*, *As if…*,
*Elusive*, *Retaliate*) y [01075](https://arkhamdb.com/card/01075). ArkhamDB no publica FAQ para
estos códigos (consulta del 09/11/2026). Las instantáneas quedan en `source-en.json` y
`source-es.json` (formateadas con Prettier) con su SHA-256 en `approvals.json`. El inventario
congelado `3c8ee4b5d8100766` no se modifica.

## Datos y presentación

`scripts/prepare-miguel-de-la-cruz.mjs` reproduce `data/miguel-de-la-cruz.json` desde el
inventario y la instantánea; `scripts/present-miguel-de-la-cruz.mjs` reproduce nombres, textos,
rasgos, subtítulo, reverso y las etiquetas nuevas EN/ES (idempotente). El paquete `mig` se
añade a la selección de paquetes remotos de la web sin cambiar la versión de la caché.

No se han descargado escaneos ni miniaturas: la prueba de imágenes locales de la web
(`spanishImages.test.ts`) fallará para estos códigos hasta importarlos con
`scripts/import-card-images.mjs`.

## Limitaciones conocidas

- Los vinculados de un investigador eliminado permanecen en juego sin poder activarse.

## Validación

- Pruebas del lote (traps, investigador, Morral, debilidades, eventos, reedición, integración y
  unicidad) y `scripts/cards-import/miguel-de-la-cruz.test.mjs`: 51 correctas.
- Suite de `cards` y `engine` sobre el código del motor final: 6.213 pruebas correctas.
- Tipos de `engine`, `cards` y `web`; Prettier y ESLint de los archivos tocados.
- `node scripts/check-decklist.mjs`: 32 jugables, 0 por implementar.
